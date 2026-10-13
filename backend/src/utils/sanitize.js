/**
 * KLOZER INPUT SANITIZATION & ANTI-XSS UTILITY
 * Neutralizes Stored XSS vectors (script tags, event handlers, javascript URIs,
 * and dangerous HTML tags) while preserving legitimate business text.
 */

const DANGEROUS_TAGS_REGEX = /<\/?(script|iframe|object|embed|style|link|base|applet|form|meta)\b[^>]*>/gi;
const SCRIPT_BLOCK_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const INLINE_EVENT_REGEX = /\bon[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi;
const PSEUDO_PROTOCOL_REGEX = /(javascript|vbscript|data):[^\s"'>]+/gi;

/**
 * Sanitize a single string against XSS injection attacks.
 * @param {string} value
 * @returns {string} Sanitized string safe to store and render
 */
export function sanitizeXss(value) {
  if (typeof value !== "string") return value;

  let cleaned = value;

  // 1. Remove complete <script>...</script> blocks
  cleaned = cleaned.replace(SCRIPT_BLOCK_REGEX, "");

  // 2. Strip dangerous standalone tags
  cleaned = cleaned.replace(DANGEROUS_TAGS_REGEX, "");

  // 3. Remove inline DOM event handlers (onerror=..., onclick=..., onload=..., etc.)
  cleaned = cleaned.replace(INLINE_EVENT_REGEX, "");

  // 4. Remove malicious pseudo-protocols like javascript:alert(1)
  cleaned = cleaned.replace(PSEUDO_PROTOCOL_REGEX, "");

  // 5. Escape any remaining raw angle brackets that form HTML elements
  cleaned = cleaned.replace(/<([^>]+)>/g, (match) => {
    return match.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  });

  return cleaned.trim();
}

/**
 * Recursively sanitize objects, arrays, and strings.
 * Safely skips critical non-text fields such as hashed/raw passwords.
 */
const DEFAULT_SKIP_KEYS = new Set([
  "password",
  "currentPassword",
  "newPassword",
  "rawBody",
]);

export function deepSanitize(target, skipKeys = DEFAULT_SKIP_KEYS) {
  if (target === null || target === undefined) return target;

  if (typeof target === "string") {
    return sanitizeXss(target);
  }

  if (Array.isArray(target)) {
    return target.map((item) => deepSanitize(item, skipKeys));
  }

  if (typeof target === "object" && target.constructor === Object) {
    const cleaned = {};
    for (const [key, value] of Object.entries(target)) {
      if (skipKeys.has(key)) {
        cleaned[key] = value;
      } else {
        cleaned[key] = deepSanitize(value, skipKeys);
      }
    }
    return cleaned;
  }

  return target;
}
