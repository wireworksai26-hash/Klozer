/**
 * Download a file a customer sent, from a URL a platform gave us. The URL arrives in a webhook, so it is checked
 * before anything is fetched: https only, host on the platform's own list, no redirects, size and type limits.
 */

export const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
export const MEDIA_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

/**
 * @param {object} p
 * @param {string} p.url
 * @param {RegExp} p.allowedHosts host names that may be fetched
 * @param {Record<string,string>} [p.headers]
 * @param {string} [p.mimeType] use this type instead of the response's Content-Type header
 * @returns {Promise<{ buffer: Buffer, mimeType: string } | null>} null when refused, missing, too large or not a supported type
 */
export async function fetchMedia({ url, allowedHosts, headers = {}, mimeType = null, timeoutMs = 30000 }) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || !allowedHosts.test(parsed.hostname)) return null;

  const response = await fetch(parsed.href, { headers, redirect: "error", signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) return null;

  const type = (mimeType || String(response.headers?.get?.("content-type") || "")).split(";")[0].trim().toLowerCase();
  if (!MEDIA_MIME_TYPES.has(type)) return null;
  if (Number(response.headers?.get?.("content-length")) > MAX_MEDIA_BYTES) return null;

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_MEDIA_BYTES) return null;
  return { buffer, mimeType: type };
}
