import crypto from "node:crypto";
import { config } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { AppError, badRequest } from "../../utils/errors.js";
import { encryptSecret } from "../../utils/crypto.js";
import { queryOne } from "../../config/db.js";
import { conflict } from "../../utils/errors.js";
import { assertWithinLimit } from "./channelRepository.js";
import { connectChannel } from "./channelService.js";

/**
 * WhatsApp Embedded Signup: the client connects its own WhatsApp number from inside Klozer. The team sets up the Meta app
 * once (app id, secret, and the Embedded Signup configuration id); the client then only presses "Hubungkan WhatsApp", logs
 * in to Facebook in Meta's own window, and gives its number there. Meta hands back a short code plus the ids of the
 * client's WhatsApp Business Account and number. This service trades the code for the client's token on the server (the app
 * secret never reaches a browser), checks that the ids really belong to that token, registers the number for the Cloud API,
 * subscribes the account to our webhook, and stores the channel like any other.
 */

const graph = (path) => `https://graph.facebook.com/${config.meta.graphVersion}/${path}`;
const TIMEOUT = 20000;

/** What the browser needs to open the Meta window. No secrets. */
export function signupConfig() {
  const { appId, appSecret, embeddedSignupConfigId } = config.meta;
  return { enabled: Boolean(appId && appSecret && embeddedSignupConfigId), appId: appId || null, configId: embeddedSignupConfigId || null, graphVersion: config.meta.graphVersion };
}

async function call(path, { method = "GET", token = null, body = null, query = {} } = {}) {
  const url = new URL(graph(path));
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT),
    });
  } catch {
    throw new AppError(502, "Tidak dapat menghubungi Meta. Coba lagi sebentar.", { code: "META_UNREACHABLE" });
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    logger.warn({ path, status: response.status, error: data?.error }, "Meta Graph API refused a signup step");
    throw new AppError(502, data?.error?.message ? `Meta menolak: ${data.error.message}` : `Meta menolak (HTTP ${response.status}).`, { code: "META_REFUSED", details: { metaCode: data?.error?.code ?? null } });
  }
  return data;
}

/** The business token Meta gives for the code the browser received. Valid once and for a few minutes. */
async function exchangeCode(code) {
  const data = await call("oauth/access_token", { query: { client_id: config.meta.appId, client_secret: config.meta.appSecret, code } });
  if (!data.access_token) throw badRequest("Meta tidak memberi token. Ulangi proses menghubungkan.", { code: "META_NO_TOKEN" });
  return data.access_token;
}

/** The ids the browser reported are only claims: confirm with Meta that this token can manage that account and owns that number. */
async function assertOwnership({ token, wabaId, phoneNumberId }) {
  const debug = await call("debug_token", { query: { input_token: token, access_token: `${config.meta.appId}|${config.meta.appSecret}` } });
  const info = debug.data ?? {};
  if (info.is_valid === false || (info.app_id && String(info.app_id) !== String(config.meta.appId))) throw badRequest("Token dari Meta tidak berlaku untuk aplikasi ini.", { code: "META_BAD_TOKEN" });
  const scopes = (info.granular_scopes ?? []).filter((s) => s.scope === "whatsapp_business_management");
  const allowed = scopes.flatMap((s) => s.target_ids ?? []).map(String);
  if (!allowed.includes(String(wabaId))) throw badRequest("Akun WhatsApp Business ini tidak termasuk dalam izin yang diberikan.", { code: "WABA_NOT_GRANTED" });
  const numbers = await call(`${encodeURIComponent(wabaId)}/phone_numbers`, { token, query: { fields: "id,display_phone_number,verified_name" } });
  if (!(numbers.data ?? []).some((n) => String(n.id) === String(phoneNumberId))) throw badRequest("Nomor ini tidak ada di akun WhatsApp Business tersebut.", { code: "PHONE_NOT_IN_WABA" });
}

/**
 * Finish a signup: everything after the client has given its number in Meta's window.
 * @param {{ institutionId: number, code: string, wabaId: string, phoneNumberId: string, name?: string }} input
 */
export async function completeSignup({ institutionId, code, wabaId, phoneNumberId, name }) {
  if (!signupConfig().enabled) throw new AppError(503, "Penyambungan WhatsApp otomatis belum diaktifkan oleh tim Klozer.", { code: "SIGNUP_DISABLED" });

  // refuse before anything is done at Meta: the plan has room, and this number is not already connected somewhere
  await assertWithinLimit({ queryOne }, institutionId);
  const taken = await queryOne("SELECT institution_id FROM channels WHERE type = 'whatsapp' AND external_id = ?", [String(phoneNumberId)]);
  if (taken) throw conflict(taken.institution_id === institutionId ? "Nomor ini sudah terhubung di toko Anda." : "Nomor ini sudah terhubung ke instansi lain.", { code: "CHANNEL_TAKEN" });

  const token = await exchangeCode(code);
  await assertOwnership({ token, wabaId, phoneNumberId });

  // the number must be registered with the Cloud API before it can send; the PIN is its two-step verification code
  const pin = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await call(`${encodeURIComponent(phoneNumberId)}/register`, { method: "POST", token, body: { messaging_product: "whatsapp", pin } });
  // our webhook is told about this account's messages
  await call(`${encodeURIComponent(wabaId)}/subscribed_apps`, { method: "POST", token });

  const detail = await call(encodeURIComponent(phoneNumberId), { token, query: { fields: "display_phone_number,verified_name" } });
  const display = detail.display_phone_number ?? null;
  const { channel } = await connectChannel({
    institutionId,
    type: "whatsapp",
    name: (name && name.trim()) || detail.verified_name || display || "WhatsApp",
    input: { externalId: String(phoneNumberId), displayHandle: display, accessToken: token, wabaId: String(wabaId), registrationPin: encryptSecret(pin) },
  });
  return { channel, verifiedName: detail.verified_name ?? null };
}
