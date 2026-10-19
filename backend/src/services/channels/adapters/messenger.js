import { badRequest } from "../../../utils/errors.js";
import { createMetaMessagingAdapter, explainMetaError, metaGraphGet } from "./metaMessaging.js";

/** Facebook Messenger: a customer writes to a Facebook Page. The channel's account id is the page id. */
export const messengerAdapter = {
  ...createMetaMessagingAdapter({ type: "messenger", label: "Messenger", maxTextLength: 2000, accountFields: "name" }),

  /** Read the page with the token the owner pasted; nothing is changed on Meta yet. */
  async resolveConnection({ pageId, accessToken }) {
    const { ok, data } = await metaGraphGet(pageId, accessToken, "id,name").catch(() => ({ ok: false, data: {} }));
    if (!ok) throw badRequest(`Halaman Facebook tidak bisa dibaca dengan token ini: ${explainMetaError(data?.error)}`, { code: "CHANNEL_CONNECT_FAILED" });
    return { externalId: String(data.id || pageId), displayHandle: data.name || null, accessToken, config: { pageId: String(data.id || pageId) } };
  },
};
