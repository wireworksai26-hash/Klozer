import net from "net";

/**
 * Webhook targets are chosen by tenants, so the platform must not let a webhook reach its own network: the database,
 * the cloud metadata address, other containers. Addresses that are private, loopback, link-local or otherwise not
 * routable on the public internet are refused, both when the URL is saved and at the moment a connection is made
 * (so a name that later resolves to a private address is refused too).
 * Pure functions here; the connection-time check is in safeHttp.js.
 */

const v4 = (ip) => ip.split(".").map(Number);

/** True when an IPv4 or IPv6 address is not a public internet address. */
export function isBlockedAddress(address) {
  const ip = String(address || "").trim().toLowerCase().replace(/^\[|\]$/g, "");
  const family = net.isIP(ip);
  if (family === 0) return true; // not an address at all: refuse rather than guess

  if (family === 4) {
    const [a, b] = v4(ip);
    return (
      a === 0 || // "this" network
      a === 10 ||
      a === 127 || // loopback
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      (a === 169 && b === 254) || // link-local, including the cloud metadata address
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) || // IETF protocol assignments, documentation
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) || // benchmarking
      a >= 224 // multicast and reserved
    );
  }

  // IPv6
  if (ip === "::" || ip === "::1") return true;
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4 inside IPv6
  if (mapped) return isBlockedAddress(mapped[1]);
  const mappedHex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16);
    const lo = parseInt(mappedHex[2], 16);
    return isBlockedAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  const first = parseInt(ip.split(":")[0] || "0", 16);
  return (
    (first & 0xfe00) === 0xfc00 || // unique local fc00::/7
    (first & 0xffc0) === 0xfe80 || // link-local fe80::/10
    (first & 0xff00) === 0xff00 || // multicast
    first === 0x2001 && ip.startsWith("2001:db8") // documentation
  );
}

const INTERNAL_NAMES = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|localdomain)$/i;

/**
 * Check a webhook URL before it is saved.
 * @param {string} raw
 * @param {{ allowPrivate?: boolean, isProduction?: boolean }} [opts] `allowPrivate` is for development and tests only
 * @returns {{ ok: true, url: URL } | { ok: false, reason: string }}
 */
export function validateWebhookUrl(raw, { allowPrivate = false, isProduction = true } = {}) {
  let url;
  try {
    url = new URL(String(raw));
  } catch {
    return { ok: false, reason: "Alamat tidak valid." };
  }
  if (String(raw).length > 500) return { ok: false, reason: "Alamat terlalu panjang (maksimal 500 karakter)." };
  if (url.username || url.password) return { ok: false, reason: "Alamat tidak boleh memuat nama pengguna atau kata sandi." };
  if (url.protocol !== "https:" && !(url.protocol === "http:" && allowPrivate && !isProduction)) return { ok: false, reason: "Alamat harus memakai https://." };
  if (allowPrivate && !isProduction) return { ok: true, url };

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) {
    if (isBlockedAddress(host)) return { ok: false, reason: "Alamat IP privat atau internal tidak diizinkan." };
  } else if (INTERNAL_NAMES.test(host) || !host.includes(".")) {
    return { ok: false, reason: "Nama host internal tidak diizinkan. Pakai alamat publik." };
  }
  return { ok: true, url };
}
