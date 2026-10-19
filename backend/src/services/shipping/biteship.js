import { config } from "../../config/env.js";
import { logger } from "../../config/logger.js";

/**
 * Biteship: live courier rates and tracking (https://biteship.com). One platform-wide API key (BITESHIP_API_KEY);
 * each tenant sets its own origin postal code. Rates are by postal code, so the customer's postal code is needed.
 */

const BASE_URL = "https://api.biteship.com/v1";
const COURIERS = "jne,jnt,sicepat,anteraja,pos,tiki,ninja,lion,idexpress";

export const isBiteshipConfigured = () => Boolean(config.shipping.biteshipKey);

async function call(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: config.shipping.biteshipKey, "Content-Type": "application/json", ...(init.headers || {}) },
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok && data.success !== false, status: response.status, data };
}

const etaOf = (p) => {
  if (p.shipment_duration_range) return `${p.shipment_duration_range} ${p.shipment_duration_unit === "hours" ? "jam" : "hari"}`;
  return p.duration ? String(p.duration).replace(/days?/i, "hari").trim() : "";
};

/**
 * Rates for one parcel.
 * @param {object} p
 * @param {string} p.originPostalCode
 * @param {string} p.destinationPostalCode
 * @param {{ name: string, value: number, weight: number, quantity: number }[]} p.items weight in grams
 * @returns {Promise<{ code: string, service: string, label: string, fee: number, eta: string }[]>} cheapest first; empty when none
 */
export async function getRates({ originPostalCode, destinationPostalCode, items }) {
  try {
    const { ok, data } = await call("/rates/couriers", {
      method: "POST",
      body: JSON.stringify({ origin_postal_code: Number(originPostalCode), destination_postal_code: Number(destinationPostalCode), couriers: COURIERS, items }),
    });
    if (!ok) {
      logger.warn({ status: data?.code ?? data?.error }, "Biteship rates request rejected");
      return [];
    }
    return (data.pricing || [])
      .filter((p) => Number(p.price) > 0 && p.courier_code)
      .map((p) => ({
        code: String(p.courier_code).toLowerCase(),
        service: String(p.courier_service_code || p.courier_service_name || ""),
        label: `${p.courier_name || String(p.courier_code).toUpperCase()} ${p.courier_service_name || p.courier_service_code || ""}`.trim(),
        fee: Math.round(Number(p.price)),
        eta: etaOf(p),
      }))
      .sort((a, b) => a.fee - b.fee);
  } catch (err) {
    logger.warn({ err: err.message }, "Biteship rates request failed");
    return [];
  }
}

/**
 * Where a parcel is, by waybill.
 * @returns {Promise<{ status: string, lastNote: string|null }|null>}
 */
export async function trackWaybill({ courierCode, awb }) {
  try {
    const { ok, data } = await call(`/trackings/${encodeURIComponent(awb)}/couriers/${encodeURIComponent(String(courierCode).toLowerCase())}`);
    if (!ok || !data.status) return null;
    const last = Array.isArray(data.history) ? data.history[data.history.length - 1] : null;
    return { status: String(data.status).replace(/_/g, " "), lastNote: last?.note ? String(last.note).slice(0, 120) : null };
  } catch (err) {
    logger.warn({ err: err.message }, "Biteship tracking request failed");
    return null;
  }
}
