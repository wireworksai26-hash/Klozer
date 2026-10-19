import { z } from "zod";
import { MAX_FOLLOWUP_DELAY_MINUTES, MAX_FOLLOWUP_STEPS, MIN_FOLLOWUP_DELAY_MINUTES, SHIPPING_MODES } from "../services/commerce/commerceSettings.js";

// Request shapes for chat commerce settings, reminders and shipment updates.

const hour = z.number().int().min(0).max(23);

export const updateCommerceSettingsBody = z
  .object({
    enabled: z.boolean(),
    shippingMode: z.enum(SHIPPING_MODES),
    shippingFlatFee: z.number().min(0).max(1_000_000),
    originPostalCode: z.string().trim().regex(/^\d{5}$/, "kode pos asal harus 5 angka").nullable(),
    allowPickup: z.boolean(),
    payQris: z.boolean(),
    payTransfer: z.boolean(),
    payCod: z.boolean(),
    followupEnabled: z.boolean(),
    followupDelays: z
      .array(z.number().int().min(MIN_FOLLOWUP_DELAY_MINUTES, `minimal ${MIN_FOLLOWUP_DELAY_MINUTES} menit`).max(MAX_FOLLOWUP_DELAY_MINUTES, "maksimal 23 jam (batas jendela chat 24 jam)"))
      .min(1)
      .max(MAX_FOLLOWUP_STEPS)
      .refine((list) => list.every((m, i) => i === 0 || m > list[i - 1]), "urutkan dari yang tercepat"),
    quietStartHour: hour,
    quietEndHour: hour,
    unpaidCancelHours: z.number().int().min(0).max(720),
    notifyCustomer: z.boolean(),
  })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), "tidak ada yang diubah");

export const followupOptOutBody = z.object({ optOut: z.boolean() });

export const updateShipmentBody = z
  .object({
    courier_code: z.string().trim().min(2).max(30).optional(),
    service_name: z.string().trim().min(1).max(50).optional(),
    awb_number: z.string().trim().regex(/^[A-Za-z0-9-]{4,60}$/, "nomor resi tidak valid").optional(),
    shipping_status: z.enum(["draft", "pickup_requested", "in_transit", "delivered", "returned_rts", "cancelled"]).optional(),
    notify_customer: z.boolean().optional(),
  })
  .refine((v) => Object.entries(v).some(([k, x]) => k !== "notify_customer" && x !== undefined), "tidak ada yang diubah");
