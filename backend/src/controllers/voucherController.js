import { audit } from "../services/auditService.js";
import { createVoucher, deleteVoucher, listVouchers, updateVoucher } from "../services/platformVoucherService.js";

const idOf = (req) => Number(req.params.id);

/** GET /platform/vouchers (superadmin) */
export async function list(req, res) {
  res.json({ success: true, ...(await listVouchers(req.query)) });
}

export async function create(req, res) {
  const voucher = await createVoucher({ ...req.body, userId: req.user.id });
  await audit(req, "platform_voucher.create", { entityType: "platform_voucher", entityId: voucher.id, metadata: { code: voucher.code, type: voucher.discountType, value: voucher.discountValue, institutionId: voucher.institutionId } });
  res.status(201).json({ success: true, data: voucher });
}

export async function update(req, res) {
  const voucher = await updateVoucher(idOf(req), req.body);
  await audit(req, "platform_voucher.update", { entityType: "platform_voucher", entityId: voucher.id, metadata: { code: voucher.code, fields: Object.keys(req.body) } });
  res.json({ success: true, data: voucher });
}

export async function remove(req, res) {
  await deleteVoucher(idOf(req));
  await audit(req, "platform_voucher.delete", { entityType: "platform_voucher", entityId: idOf(req) });
  res.json({ success: true, message: "Voucher dihapus." });
}
