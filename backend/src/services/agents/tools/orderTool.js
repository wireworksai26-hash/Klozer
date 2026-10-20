import { z } from "zod";
import { query } from "../../../config/db.js";
import { orderStatusText } from "../../commerce/messages.js";

/** The orders of the customer in this chat, never anyone else's: the contact comes from the conversation, not from the model. */
export const lookupOrder = {
  name: "lookup_order",
  schema: z.object({ orderNumber: z.string().trim().min(3).max(60).optional() }),
  async run({ orderNumber }, { institutionId, leadId }) {
    const orders = await query(
      `SELECT * FROM orders WHERE institution_id = ? AND lead_id = ? ${orderNumber ? "AND order_number = ?" : ""} ORDER BY id DESC LIMIT 3`,
      orderNumber ? [institutionId, leadId, orderNumber] : [institutionId, leadId]
    );
    const shipments = orders.length ? await query("SELECT order_id, courier_code, service_name, awb_number FROM shipping_shipments WHERE order_id IN (?)", [orders.map((o) => o.id)]) : [];
    return {
      orders: orders.map((order) => ({
        orderNumber: order.order_number,
        status: order.status,
        total: Number(order.total_amount),
        paymentMethod: order.payment_method,
        summary: orderStatusText({ order, shipment: shipments.find((s) => s.order_id === order.id) ?? null, tracking: null }),
      })),
      note: orders.length ? undefined : orderNumber ? "Pelanggan ini tidak punya pesanan dengan nomor itu." : "Pelanggan ini belum punya pesanan.",
    };
  },
};
