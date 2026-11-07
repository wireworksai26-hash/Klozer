import { z } from "zod";

const positiveInt = z.coerce.number().int().positive();
const note = (max) => z.string().trim().max(max).optional();

export const assignDeliveryBody = z.object({
  order_id: positiveInt,
  pic_user_id: positiveInt,
  note: note(500),
});

export const listDeliveriesQuery = z.object({
  status: z.enum(["assigned", "picked_up", "delivered", "failed", "cancelled"]).optional(),
  active: z.enum(["1", "true"]).optional(),
  order_id: positiveInt.optional(),
  pic_id: positiveInt.optional(),
});

export const finishDeliveryBody = z.object({
  result: z.enum(["delivered", "failed"]),
  note: note(500),
});
