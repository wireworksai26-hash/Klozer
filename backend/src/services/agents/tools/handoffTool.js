import { z } from "zod";

/** Ask for a person to take the chat. The hand-off itself happens once the reply to the customer has gone out. */
export const handoffToHuman = {
  name: "handoff_to_human",
  schema: z.object({ reason: z.string().trim().min(3).max(100).optional() }),
  async run({ reason }, { effects }) {
    effects.handoffReason = `ai:${reason ?? "butuh bantuan tim"}`.slice(0, 120);
    return { message: "Chat akan diserahkan ke tim setelah balasanmu terkirim. Beri tahu pelanggan bahwa tim akan melanjutkan; jangan menjanjikan jam pasti." };
  },
};
