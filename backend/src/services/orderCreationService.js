import { transaction } from "../config/db.js";
import { generateOrderNumber } from "../utils/helpers.js";
import { badRequest, conflict } from "../utils/errors.js";
import { markOrderPaid } from "./orderService.js";
import { emitEvent } from "./integrations/eventBus.js";
import { loadOrderPayload } from "./integrations/eventPayloads.js";

/** A concurrent request with the same idempotency key committed first. */
export class DuplicateOrderRequest extends Error {}

/**
 * Create an order and its lines in one transaction. Used by the dashboard and by the chat assistant, so both obey
 * the same rules: prices and HPP come from the database (never from the caller), product rows are locked in id
 * order and stock is checked and decremented in the same transaction (no overselling), and an idempotency key makes
 * a retried request return the order that already exists.
 *
 * @param {object} p
 * @param {number} p.tenantId
 * @param {number} p.leadId
 * @param {number|null} p.csUserId  gets the commission when the order is paid
 * @param {{ product_id?: number, program_id?: number, quantity: number, unit_price?: number }[]} p.items
 * @param {"dashboard"|"chat"} [p.createdVia]
 * @param {object|null} [p.chatDetails] recipient and courier chosen in chat, kept with the order
 * @returns {Promise<{ orderId: number, paid: { order: object, changed: boolean }|null }>}
 * @throws {DuplicateOrderRequest} when `idempotencyKey` was used by a request that committed first
 */
export async function createOrderRecord({
  tenantId,
  leadId,
  csUserId,
  items,
  shippingFee = 0,
  discountAmount = 0,
  paymentMethod,
  fulfillmentType = "delivery",
  notes = null,
  idempotencyKey = null,
  createdVia = "dashboard",
  chatDetails = null,
}) {
  const created = await transaction(async (tx) => {
    // ---- products: lock + validate + price from DB
    const wanted = new Map();
    for (const it of items.filter((i) => i.product_id)) {
      wanted.set(it.product_id, (wanted.get(it.product_id) || 0) + it.quantity);
    }
    const productIds = [...wanted.keys()].sort((a, c) => a - c);
    const products = productIds.length
      ? await tx.query("SELECT * FROM products WHERE id IN (?) AND institution_id = ? AND is_active = 1 ORDER BY id FOR UPDATE", [productIds, tenantId])
      : [];
    const productById = new Map(products.map((p) => [p.id, p]));

    // Holding the product locks means any earlier request with this key has committed: if it made the order, stop here.
    if (idempotencyKey) {
      const earlier = await tx.queryOne("SELECT id FROM orders WHERE institution_id = ? AND idempotency_key = ?", [tenantId, idempotencyKey]);
      if (earlier) throw new DuplicateOrderRequest();
    }

    for (const [productId, qty] of wanted) {
      const product = productById.get(productId);
      if (!product) throw badRequest(`Produk #${productId} tidak ditemukan atau tidak aktif.`, { code: "PRODUCT_UNAVAILABLE", details: { productId } });
      if (product.stock_quantity < qty) {
        throw conflict(`Stok '${product.name}' tidak cukup (tersisa ${product.stock_quantity}, diminta ${qty}).`, {
          code: "INSUFFICIENT_STOCK",
          details: { productId, available: product.stock_quantity, requested: qty },
        });
      }
    }

    // ---- build lines
    const lines = [];
    for (const it of items) {
      if (it.product_id) {
        const p = productById.get(it.product_id);
        lines.push({
          product_id: p.id,
          program_id: null,
          item_name: p.name,
          quantity: it.quantity,
          unit_price: Number(p.selling_price),
          unit_cost_hpp: Number(p.cost_price_hpp),
        });
      } else {
        const program = await tx.queryOne("SELECT id, name FROM programs WHERE id = ? AND institution_id = ? AND is_published = 1", [it.program_id, tenantId]);
        if (!program) throw badRequest(`Program #${it.program_id} tidak ditemukan.`);
        lines.push({ product_id: null, program_id: program.id, item_name: program.name, quantity: it.quantity, unit_price: it.unit_price, unit_cost_hpp: 0 });
      }
    }

    const subtotal = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
    const totalCost = lines.reduce((s, l) => s + l.unit_cost_hpp * l.quantity, 0);
    if (discountAmount > subtotal) throw badRequest("Diskon tidak boleh melebihi subtotal.");
    const total = subtotal + shippingFee - discountAmount;
    const grossProfit = total - shippingFee - totalCost;
    const status = paymentMethod === "cash" ? "paid" : "waiting_payment";

    // ---- insert order (retry on the rare order-number collision)
    let orderId;
    for (let attempt = 0; attempt < 5 && !orderId; attempt++) {
      try {
        const result = await tx.query(
          `INSERT INTO orders
             (institution_id, order_number, idempotency_key, lead_id, cs_user_id, subtotal_amount, discount_amount, shipping_fee, total_amount,
              total_cost_hpp, gross_profit, payment_method, fulfillment_type, created_via, status, review_status, notes, chat_details_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting_payment', 'not_required', ?, ?)`,
          [
            tenantId,
            generateOrderNumber("ORD"),
            idempotencyKey,
            leadId,
            csUserId ?? null,
            subtotal,
            discountAmount,
            shippingFee,
            total,
            totalCost,
            grossProfit,
            paymentMethod,
            fulfillmentType,
            createdVia,
            notes,
            chatDetails ? JSON.stringify(chatDetails) : null,
          ]
        );
        orderId = result.insertId;
      } catch (err) {
        if (err.code !== "ER_DUP_ENTRY") throw err;
        // the same key committed first: abandon this transaction (its stock reservation rolls back)
        if (String(err.message).includes("uq_orders_idempotency")) throw new DuplicateOrderRequest();
      }
    }
    if (!orderId) throw conflict("Gagal membuat nomor pesanan unik. Coba lagi.");

    for (const l of lines) {
      await tx.query(
        `INSERT INTO order_items (order_id, product_id, program_id, item_name, quantity, unit_price, unit_cost_hpp, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, l.product_id, l.program_id, l.item_name, l.quantity, l.unit_price, l.unit_cost_hpp, l.unit_price * l.quantity]
      );
    }
    for (const [productId, qty] of wanted) {
      await tx.query("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND institution_id = ?", [qty, productId, tenantId]);
    }

    await tx.query("UPDATE leads SET last_contacted_at = UTC_TIMESTAMP() WHERE id = ?", [leadId]);

    let paid = null;
    if (status === "paid") paid = await markOrderPaid(tx, orderId, tenantId);
    return { orderId, paid };
  });
  // told only once the order really exists (the transaction has committed)
  emitEvent({ institutionId: tenantId, type: "order.created", data: () => loadOrderPayload(tenantId, created.orderId) });
  return created;
}
