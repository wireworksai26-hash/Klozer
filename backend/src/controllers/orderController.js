import { memoryStore } from "../config/db.js";
import { paginate, generateOrderNumber } from "../utils/helpers.js";
import { recordCsCommission } from "../services/commissionService.js";
import { sendMetaCapiPurchaseEvent } from "../services/metaCapiService.js";

/**
 * Get Paginated Orders List
 * GET /api/v1/orders
 */
export async function getOrders(req, res, next) {
  try {
    const institutionId = Number(req.tenantId || req.user?.institution_id || 1);
    const { page = 1, limit = 10, search = "", status = "" } = req.query;

    let list = (memoryStore.orders || []).filter((o) => Number(o.institution_id) === institutionId);

    if (search) {
      const s = search.toLowerCase();
      list = list.filter((o) => o.order_number.toLowerCase().includes(s) || (o.customer_name && o.customer_name.toLowerCase().includes(s)));
    }

    if (status) {
      list = list.filter((o) => o.status === status);
    }

    const result = paginate(list, page, limit);
    res.json({ success: true, ...result, data: result.items, orders: result.items });
  } catch (err) {
    next(err);
  }
}

/**
 * Create Order & Trigger Auto Stock Deduction & CS Commission
 * POST /api/v1/orders
 */
export async function createOrder(req, res, next) {
  try {
    const institutionId = req.tenantId || 1;
    const { lead_id, customer_name, customer_phone, items = [], shipping_fee = 0, discount_amount = 0, payment_method = "qris", notes = "" } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Pesanan harus memiliki minimal 1 produk/item." });
    }

    let subtotal = 0;
    let totalCostHpp = 0;

    const orderItems = items.map((it) => {
      const itemSubtotal = Number(it.unit_price || 0) * Number(it.quantity || 1);
      const itemCostHpp = Number(it.unit_cost_hpp || 0) * Number(it.quantity || 1);
      subtotal += itemSubtotal;
      totalCostHpp += itemCostHpp;

      // Auto deduct stock
      if (it.product_id && memoryStore.products) {
        const prod = memoryStore.products.find((p) => p.id === it.product_id);
        if (prod) prod.stock_quantity = Math.max(0, prod.stock_quantity - Number(it.quantity || 1));
      }

      return {
        id: (memoryStore.order_items?.length || 0) + 1,
        product_id: it.product_id || null,
        item_name: it.item_name || "Produk",
        quantity: Number(it.quantity || 1),
        unit_price: Number(it.unit_price || 0),
        unit_cost_hpp: Number(it.unit_cost_hpp || 0),
        subtotal: itemSubtotal,
      };
    });

    const totalAmount = Math.max(0, subtotal + Number(shipping_fee) - Number(discount_amount));
    const grossProfit = totalAmount - totalCostHpp;
    const orderNumber = generateOrderNumber("ORD");

    const order = {
      id: (memoryStore.orders?.length || 0) + 1,
      institution_id: institutionId,
      order_number: orderNumber,
      lead_id: lead_id || 1,
      customer_name: customer_name || "Pelanggan",
      customer_phone: customer_phone || "",
      cs_user_id: req.user?.id || 1,
      subtotal_amount: subtotal,
      discount_amount: Number(discount_amount),
      shipping_fee: Number(shipping_fee),
      admin_fee: 0,
      total_amount: totalAmount,
      total_cost_hpp: totalCostHpp,
      gross_profit: grossProfit,
      payment_method,
      fulfillment_type: "delivery",
      status: payment_method === "cash" ? "paid" : "waiting_payment",
      review_status: "approved",
      notes,
      items: orderItems,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!memoryStore.orders) memoryStore.orders = [];
    memoryStore.orders.push(order);

    // Record CS Commission if CS is assigned
    if (order.cs_user_id) {
      recordCsCommission({
        institutionId,
        csUserId: order.cs_user_id,
        orderId: order.id,
        orderTotal: order.total_amount,
      });
    }

    // Trigger Meta CAPI if status is paid
    if (order.status === "paid") {
      sendMetaCapiPurchaseEvent({
        orderId: order.order_number,
        amount: order.total_amount,
        phone: customer_phone,
        institutionId,
      });
    }

    res.status(201).json({
      success: true,
      message: "Pesanan berhasil dibuat!",
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Generate Invoice / Thermal Print 80mm Payload
 * GET /api/v1/orders/:id/invoice
 */
export async function getOrderInvoice(req, res, next) {
  try {
    const institutionId = req.tenantId || 1;
    const orderId = parseInt(req.params.id, 10);
    const order = (memoryStore.orders || []).find((o) => o.id === orderId && o.institution_id === institutionId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan." });
    }

    const inst = (memoryStore.institutions || []).find((i) => i.id === institutionId);

    // Build Thermal 80mm ESC/POS Text Stream
    const thermalReceiptText = `
========================================
       ${inst?.name || "KLOZER STORE"}
       Telp: ${inst?.phone_number || "-"}
========================================
No. Nota  : ${order.order_number}
Tanggal   : ${new Date(order.created_at).toLocaleString("id-ID")}
Pelanggan : ${order.customer_name}
----------------------------------------
${(order.items || []).map((it) => `${it.item_name}\n  ${it.quantity} x Rp ${it.unit_price.toLocaleString("id-ID")} = Rp ${it.subtotal.toLocaleString("id-ID")}`).join("\n")}
----------------------------------------
Subtotal  : Rp ${order.subtotal_amount.toLocaleString("id-ID")}
Ongkir    : Rp ${order.shipping_fee.toLocaleString("id-ID")}
Diskon    : -Rp ${order.discount_amount.toLocaleString("id-ID")}
========================================
TOTAL     : Rp ${order.total_amount.toLocaleString("id-ID")}
Metode    : ${order.payment_method.toUpperCase()}
Status    : ${order.status.toUpperCase()}
========================================
      Terima Kasih Atas Pesanan Anda!
`.trim();

    res.json({
      success: true,
      data: {
        order,
        institution: inst,
        thermalReceiptText,
        pdfDownloadUrl: `https://storage.klozer.id/invoices/${order.order_number}.pdf`,
      },
    });
  } catch (err) {
    next(err);
  }
}
