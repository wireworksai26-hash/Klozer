import { audit } from "../services/auditService.js";
import { assignDelivery, cancel, finish, getDelivery, listDeliveries, listPics, pickUp, resendNotice } from "../services/delivery/deliveryService.js";

const isPic = (req) => req.user.role === "pic_delivery";

/** GET /deliveries — a PIC only ever gets their own; the team sees every delivery of the shop. */
export async function list(req, res) {
  const items = await listDeliveries({
    institutionId: req.tenantId,
    picUserId: isPic(req) ? req.user.id : req.query.pic_id ?? null,
    status: req.query.status ?? null,
    orderId: req.query.order_id ?? null,
    active: Boolean(req.query.active),
  });
  res.json({ success: true, items, data: items });
}

/** GET /deliveries/pics — who an order can be handed to. */
export async function pics(req, res) {
  res.json({ success: true, items: await listPics(req.tenantId) });
}

/** POST /deliveries — hand an order to a PIC (and tell them). */
export async function assign(req, res) {
  const { order_id, pic_user_id, note } = req.body;
  const delivery = await assignDelivery({ institutionId: req.tenantId, orderId: order_id, picUserId: pic_user_id, assignedBy: req.user.id, note });
  await audit(req, "delivery.assign", { entityType: "delivery", entityId: delivery.id, metadata: { order_id, pic_user_id, notice: delivery.notify_status } });
  res.status(201).json({ success: true, message: "Pengantaran diberikan ke PIC.", data: delivery });
}

/** POST /deliveries/:id/pickup */
export async function pickup(req, res) {
  const delivery = await pickUp({ institutionId: req.tenantId, id: Number(req.params.id), picUserId: isPic(req) ? req.user.id : null });
  await audit(req, "delivery.pickup", { entityType: "delivery", entityId: delivery.id });
  res.json({ success: true, message: "Pesanan ditandai sudah diambil.", data: delivery });
}

/** POST /deliveries/:id/finish */
export async function finishDelivery(req, res) {
  const delivery = await finish({ institutionId: req.tenantId, id: Number(req.params.id), picUserId: isPic(req) ? req.user.id : null, result: req.body.result, note: req.body.note });
  await audit(req, "delivery.finish", { entityType: "delivery", entityId: delivery.id, metadata: { result: req.body.result } });
  res.json({ success: true, message: req.body.result === "delivered" ? "Pesanan ditandai sudah diterima pelanggan." : "Pengantaran ditandai gagal.", data: delivery });
}

/** POST /deliveries/:id/cancel */
export async function cancelDelivery(req, res) {
  const delivery = await cancel({ institutionId: req.tenantId, id: Number(req.params.id) });
  await audit(req, "delivery.cancel", { entityType: "delivery", entityId: delivery.id });
  res.json({ success: true, message: "Pengantaran dibatalkan.", data: delivery });
}

/** POST /deliveries/:id/notice — send the phone notice again. */
export async function notice(req, res) {
  await getDelivery(req.tenantId, Number(req.params.id)); // 404 for another shop's delivery
  const delivery = await resendNotice({ institutionId: req.tenantId, id: Number(req.params.id) });
  res.json({ success: delivery.notify_status === "sent", message: delivery.notify_detail, data: delivery });
}
