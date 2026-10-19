import { getRates, isBiteshipConfigured } from "./biteship.js";

/**
 * How much shipping costs for a chat order, decided by the tenant's own setting. A made-up price is never charged
 * to a customer: without a live rate source (or a fee the tenant typed in), the shipping question goes to a person.
 *
 * @param {object} p
 * @param {{ shippingMode: string, shippingFlatFee: number, originPostalCode: string|null }} p.settings
 * @param {{ lines: { name: string, unitPrice: number, quantity: number, weightGrams: number }[], postalCode: string|null }} p.order
 * @returns {Promise<
 *   { kind: "fixed", fee: number, label: string } |
 *   { kind: "options", options: { code: string, service: string, label: string, fee: number, eta: string }[] } |
 *   { kind: "needs_postal_code" } |
 *   { kind: "team", reason: string }
 * >}
 */
export async function quoteShipping({ settings, order }) {
  switch (settings.shippingMode) {
    case "free":
      return { kind: "fixed", fee: 0, label: "Gratis ongkir" };
    case "flat":
      return { kind: "fixed", fee: settings.shippingFlatFee, label: "Pengiriman" };
    case "provider": {
      if (!isBiteshipConfigured()) return { kind: "team", reason: "provider_not_configured" };
      if (!settings.originPostalCode) return { kind: "team", reason: "origin_missing" };
      if (!order.postalCode) return { kind: "needs_postal_code" };
      const items = order.lines.map((l) => ({ name: l.name.slice(0, 80), value: l.unitPrice, weight: Math.max(1, Math.round(l.weightGrams / l.quantity)), quantity: l.quantity }));
      const rates = await getRates({ originPostalCode: settings.originPostalCode, destinationPostalCode: order.postalCode, items });
      return rates.length ? { kind: "options", options: rates.slice(0, 4) } : { kind: "team", reason: "no_rates" };
    }
    default:
      return { kind: "team", reason: "ask_team" };
  }
}
