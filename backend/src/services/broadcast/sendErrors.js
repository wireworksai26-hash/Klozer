/**
 * What a failed template send means for the campaign. Meta's error codes tell a recipient problem (skip this person)
 * from a limit (wait and try again) from a setup problem (stop the whole campaign until someone fixes it).
 * Pure: a code in, a decision out.
 */

/** Rate and throughput limits: the message is fine, the account is going too fast or too often. */
const RATE_LIMITED = new Set([130429, 131048, 131056, 80007, 4, 17, 32, 613, 368]);
/** The template, the number or the token is the problem: every further send would fail the same way. */
const SETUP_PROBLEM = new Map([
  [190, "channel_auth"], // token expired or revoked
  [10, "channel_auth"],
  [200, "channel_auth"],
  [100, "template_problem"],
  [132000, "template_problem"], // parameter count differs from the template
  [132001, "template_problem"], // template does not exist in that language
  [132005, "template_problem"],
  [132007, "template_problem"], // template violates a policy
  [132012, "template_problem"], // parameter format mismatch
  [132015, "template_problem"], // template paused
  [132016, "template_problem"], // template disabled
  [131008, "template_problem"],
  [131009, "template_problem"],
  [131031, "channel_auth"], // account locked
  [131042, "payment_problem"], // no valid payment method on the WhatsApp account
]);
/** This one person cannot be reached; the others can. */
const RECIPIENT_PROBLEM = new Map([
  [131026, "Nomor tidak terdaftar di WhatsApp atau pesan tidak dapat dikirim."],
  [131049, "Meta memilih tidak mengirim pesan promosi ini ke penerima (pembatasan frekuensi pada penerima)."],
  [131050, "Penerima berhenti menerima pesan promosi dari bisnis ini."],
  [131021, "Nomor penerima sama dengan nomor pengirim."],
  [133010, "Nomor pengirim belum terdaftar."],
  [130472, "Nomor penerima ada di kelompok uji Meta."],
]);

/**
 * @param {number|null|undefined} code Meta's error code (null for a network failure)
 * @param {{ network?: boolean }} [info]
 * @returns {{ action: "retry_later", backoffMinutes: number } | { action: "pause", reason: string } | { action: "fail", message: string|null }}
 */
export function classifySendError(code, { network = false } = {}) {
  if (network || code === null || code === undefined) return { action: "retry_later", backoffMinutes: 1 };
  if (RATE_LIMITED.has(code)) return { action: "retry_later", backoffMinutes: code === 131048 ? 30 : 5 };
  if (SETUP_PROBLEM.has(code)) return { action: "pause", reason: SETUP_PROBLEM.get(code) };
  return { action: "fail", message: RECIPIENT_PROBLEM.get(code) ?? null };
}
