import { z } from "zod";

/** The owner's own words about the shop and the voice they want. Optional: the shop's profile is enough to start from. */
export const generatePersonaBody = z.object({
  hint: z.string().trim().max(400).optional(),
});
