import { audit } from "../services/auditService.js";
import { badRequest } from "../utils/errors.js";
import { adminQris, createMethod, deleteMethod, listMethods, publicQris, removeQrisImage, removeQrisPayload, setQrisImage, setQrisPayload, updateMethod } from "../services/platformPaymentService.js";

const idOf = (req) => Number(req.params.id);

/** GET /platform/payment-methods (superadmin): everything, including what is switched off. */
export async function adminList(req, res) {
  res.json({ success: true, data: await listMethods() });
}

export async function create(req, res) {
  const method = await createMethod(req.body);
  await audit(req, "platform_payment.create", { entityType: "platform_payment_method", entityId: method.id, metadata: { kind: method.kind, label: method.label } });
  res.status(201).json({ success: true, data: method });
}

export async function update(req, res) {
  const method = await updateMethod(idOf(req), req.body);
  await audit(req, "platform_payment.update", { entityType: "platform_payment_method", entityId: method.id, metadata: { fields: Object.keys(req.body) } });
  res.json({ success: true, data: method });
}

export async function remove(req, res) {
  await deleteMethod(idOf(req));
  await audit(req, "platform_payment.delete", { entityType: "platform_payment_method", entityId: idOf(req) });
  res.json({ success: true, message: "Metode pembayaran dihapus." });
}

/** PUT /platform/payment-methods/:id/qris: the QR picture, sent as base64. */
export async function uploadQris(req, res) {
  const raw = String(req.body.fileBase64).replace(/^data:[^;]+;base64,/, "");
  if (!/^[A-Za-z0-9+/=\s]+$/.test(raw)) throw badRequest("Isi gambar tidak valid.", { code: "INVALID_BASE64" });
  const { qrisRead, ...method } = await setQrisImage(idOf(req), { buffer: Buffer.from(raw, "base64"), fileName: req.body.fileName });
  await audit(req, "platform_payment.qris_upload", { entityType: "platform_payment_method", entityId: method.id, metadata: { dynamic: method.dynamicQris } });
  res.json({ success: true, data: method, qrisRead });
}

/** PUT /platform/payment-methods/:id/qris-code: the text of the merchant's static QRIS, when it cannot be read from the picture. */
export async function setQrisCode(req, res) {
  const method = await setQrisPayload(idOf(req), req.body.payload);
  await audit(req, "platform_payment.qris_code_set", { entityType: "platform_payment_method", entityId: method.id, metadata: { merchantName: method.merchantName } });
  res.json({ success: true, data: method });
}

export async function deleteQrisCode(req, res) {
  const method = await removeQrisPayload(idOf(req));
  await audit(req, "platform_payment.qris_code_remove", { entityType: "platform_payment_method", entityId: method.id });
  res.json({ success: true, data: method });
}

export async function deleteQris(req, res) {
  const method = await removeQrisImage(idOf(req));
  await audit(req, "platform_payment.qris_remove", { entityType: "platform_payment_method", entityId: method.id });
  res.json({ success: true, data: method });
}

/** GET /platform/payment-methods/:id/qris (superadmin): the picture of a method that may still be hidden. */
export async function adminQrisImage(req, res) {
  const { buffer, mime } = await adminQris(idOf(req));
  res.set({ "Content-Type": mime, "Content-Length": buffer.length, "X-Content-Type-Options": "nosniff", "Content-Disposition": 'inline; filename="qris"', "Cache-Control": "private, no-store" });
  res.end(buffer);
}

/** GET /public/payment-methods: what can be used to pay Klozer right now. */
export async function publicList(req, res) {
  res.set("Cache-Control", "public, max-age=60");
  res.json({ success: true, data: await listMethods({ activeOnly: true }) });
}

/** GET /public/payment-methods/:id/qris: the picture itself. */
export async function publicQrisImage(req, res) {
  const { buffer, mime } = await publicQris(idOf(req));
  res.set({ "Content-Type": mime, "Content-Length": buffer.length, "X-Content-Type-Options": "nosniff", "Content-Disposition": 'inline; filename="qris"', "Cache-Control": "public, max-age=300" });
  res.end(buffer);
}
