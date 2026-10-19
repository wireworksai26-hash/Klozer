import { badRequest } from "../../../utils/errors.js";
import { createMetaMessagingAdapter, explainMetaError, metaGraphGet } from "./metaMessaging.js";

/**
 * Instagram direct messages through a Facebook Page linked to an Instagram professional account (page access token).
 * The channel's account id is the Instagram account id; the page id is kept in config to subscribe the webhook.
 */
export const instagramAdapter = {
  ...createMetaMessagingAdapter({ type: "instagram", label: "Instagram", maxTextLength: 1000, accountFields: "username,name" }),

  /** Find the Instagram account linked to the page; nothing is changed on Meta yet. */
  async resolveConnection({ pageId, accessToken }) {
    const { ok, data } = await metaGraphGet(pageId, accessToken, "id,name,instagram_business_account{id,username}").catch(() => ({ ok: false, data: {} }));
    if (!ok) throw badRequest(`Halaman Facebook tidak bisa dibaca dengan token ini: ${explainMetaError(data?.error)}`, { code: "CHANNEL_CONNECT_FAILED" });
    const account = data.instagram_business_account;
    if (!account?.id) throw badRequest("Halaman ini belum terhubung ke akun Instagram Business. Hubungkan dulu di pengaturan Halaman Facebook.", { code: "CHANNEL_CONNECT_FAILED" });
    return {
      externalId: String(account.id),
      displayHandle: account.username ? `@${account.username}` : null,
      accessToken,
      config: { pageId: String(data.id || pageId) },
    };
  },
};
