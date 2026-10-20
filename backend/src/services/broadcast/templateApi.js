import { config } from "../../config/env.js";
import { logger } from "../../config/logger.js";

/**
 * WhatsApp Business Management API for templates: list, submit, delete. Needs the WhatsApp Business Account id
 * (WABA id, kept in the channel's settings) and the channel's access token with the whatsapp_business_management
 * permission.
 */

const GRAPH = () => `https://graph.facebook.com/${config.meta.graphVersion}`;
const FIELDS = "id,name,status,category,language,components,rejected_reason";
const MAX_PAGES = 10;

const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function call(url, init = {}) {
  const response = await fetch(url, { ...init, headers: { ...auth(init.token), ...(init.body ? { "Content-Type": "application/json" } : {}) }, signal: AbortSignal.timeout(20000) });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

const errorText = (data) => data?.error?.error_user_msg || data?.error?.message || "Ditolak oleh Meta.";

/** @returns {Promise<{ ok: true, templates: object[] } | { ok: false, error: string }>} */
export async function listRemoteTemplates({ wabaId, token }) {
  const templates = [];
  let url = `${GRAPH()}/${encodeURIComponent(wabaId)}/message_templates?fields=${FIELDS}&limit=100`;
  try {
    for (let page = 0; page < MAX_PAGES && url; page++) {
      const { ok, data } = await call(url, { token });
      if (!ok) return { ok: false, error: errorText(data) };
      templates.push(...(data.data || []));
      const next = data.paging?.next;
      // a paging link comes from Meta's reply; follow it only if it stays on Meta's Graph host
      url = next && new URL(next).hostname === "graph.facebook.com" ? next : null;
    }
    return { ok: true, templates };
  } catch (err) {
    logger.warn({ err: err.message }, "Template list failed");
    return { ok: false, error: "Tidak dapat menghubungi Meta." };
  }
}

/** Submit a template for review. @returns {Promise<{ ok: boolean, id?: string, status?: string, error?: string }>} */
export async function createRemoteTemplate({ wabaId, token, name, language, category, components }) {
  try {
    const { ok, data } = await call(`${GRAPH()}/${encodeURIComponent(wabaId)}/message_templates`, {
      method: "POST",
      token,
      body: JSON.stringify({ name, language, category: category.toUpperCase(), components }),
    });
    return ok ? { ok: true, id: data.id ? String(data.id) : null, status: data.status } : { ok: false, error: errorText(data) };
  } catch (err) {
    logger.warn({ err: err.message }, "Template submission failed");
    return { ok: false, error: "Tidak dapat menghubungi Meta." };
  }
}

/** Remove a template (all languages of that name) from the account. */
export async function deleteRemoteTemplate({ wabaId, token, name }) {
  try {
    const { ok, data } = await call(`${GRAPH()}/${encodeURIComponent(wabaId)}/message_templates?name=${encodeURIComponent(name)}`, { method: "DELETE", token });
    return ok ? { ok: true } : { ok: false, error: errorText(data) };
  } catch {
    return { ok: false, error: "Tidak dapat menghubungi Meta." };
  }
}
