import { query, queryOne } from "../../config/db.js";

/**
 * How a tenant wants chat commerce to behave. Everything is off or cautious until the owner turns it on: the
 * assistant does not take orders, and shipping is left to the team, unless the tenant says otherwise.
 */

export const SHIPPING_MODES = Object.freeze(["ask_team", "flat", "free", "provider"]);

/** Minutes after the last activity at which reminder 1, 2, 3 go out. All must fit inside a 24-hour messaging window. */
export const DEFAULT_FOLLOWUP_DELAYS = Object.freeze([30, 360, 1200]);
export const MAX_FOLLOWUP_STEPS = 3;
export const MAX_FOLLOWUP_DELAY_MINUTES = 23 * 60;
export const MIN_FOLLOWUP_DELAY_MINUTES = 5;

export const COMMERCE_DEFAULTS = Object.freeze({
  enabled: false,
  shippingMode: "ask_team",
  shippingFlatFee: 0,
  originPostalCode: null,
  allowPickup: false,
  payQris: true,
  payTransfer: true,
  payCod: false,
  followupEnabled: true,
  followupDelays: [...DEFAULT_FOLLOWUP_DELAYS],
  quietStartHour: 21,
  quietEndHour: 8,
  unpaidCancelHours: 0,
  notifyCustomer: true,
});

const parseJson = (v) => (typeof v === "string" ? JSON.parse(v) : v ?? null);

function fromRow(row) {
  if (!row) return { ...COMMERCE_DEFAULTS, followupDelays: [...DEFAULT_FOLLOWUP_DELAYS] };
  const delays = parseJson(row.followup_delays_json);
  return {
    enabled: Boolean(row.enabled),
    shippingMode: row.shipping_mode,
    shippingFlatFee: Number(row.shipping_flat_fee),
    originPostalCode: row.origin_postal_code ?? null,
    allowPickup: Boolean(row.allow_pickup),
    payQris: Boolean(row.pay_qris),
    payTransfer: Boolean(row.pay_transfer),
    payCod: Boolean(row.pay_cod),
    followupEnabled: Boolean(row.followup_enabled),
    followupDelays: Array.isArray(delays) ? delays : [...DEFAULT_FOLLOWUP_DELAYS],
    quietStartHour: Number(row.quiet_start_hour),
    quietEndHour: Number(row.quiet_end_hour),
    unpaidCancelHours: Number(row.unpaid_cancel_hours),
    notifyCustomer: Boolean(row.notify_customer),
  };
}

export async function getCommerceSettings(institutionId) {
  return fromRow(await queryOne("SELECT * FROM commerce_settings WHERE institution_id = ?", [institutionId]));
}

/** Save changes; a field left undefined keeps its value. */
export async function updateCommerceSettings(institutionId, patch) {
  const current = await getCommerceSettings(institutionId);
  const next = { ...current };
  for (const key of Object.keys(COMMERCE_DEFAULTS)) if (patch[key] !== undefined) next[key] = patch[key];

  await query(
    `INSERT INTO commerce_settings
       (institution_id, enabled, shipping_mode, shipping_flat_fee, origin_postal_code, allow_pickup, pay_qris, pay_transfer, pay_cod,
        followup_enabled, followup_delays_json, quiet_start_hour, quiet_end_hour, unpaid_cancel_hours, notify_customer)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), shipping_mode = VALUES(shipping_mode), shipping_flat_fee = VALUES(shipping_flat_fee),
       origin_postal_code = VALUES(origin_postal_code), allow_pickup = VALUES(allow_pickup), pay_qris = VALUES(pay_qris),
       pay_transfer = VALUES(pay_transfer), pay_cod = VALUES(pay_cod), followup_enabled = VALUES(followup_enabled),
       followup_delays_json = VALUES(followup_delays_json), quiet_start_hour = VALUES(quiet_start_hour), quiet_end_hour = VALUES(quiet_end_hour),
       unpaid_cancel_hours = VALUES(unpaid_cancel_hours), notify_customer = VALUES(notify_customer)`,
    [
      institutionId,
      next.enabled ? 1 : 0,
      next.shippingMode,
      next.shippingFlatFee,
      next.originPostalCode,
      next.allowPickup ? 1 : 0,
      next.payQris ? 1 : 0,
      next.payTransfer ? 1 : 0,
      next.payCod ? 1 : 0,
      next.followupEnabled ? 1 : 0,
      JSON.stringify(next.followupDelays),
      next.quietStartHour,
      next.quietEndHour,
      next.unpaidCancelHours,
      next.notifyCustomer ? 1 : 0,
    ]
  );
  return getCommerceSettings(institutionId);
}
