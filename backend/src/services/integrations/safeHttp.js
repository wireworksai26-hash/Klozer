import dns from "dns";
import net from "net";
import http from "http";
import https from "https";
import { config } from "../../config/env.js";
import { isBlockedAddress } from "./urlGuard.js";

/**
 * One POST to a tenant-chosen address, made so that it cannot be turned against the platform's own network:
 *  - the address a name resolves to is checked at connection time, and the connection goes to that checked address
 *    (no time between the check and the use for the name to change its answer);
 *  - redirects are not followed (a redirect could point somewhere internal);
 *  - the wait and the amount read from the answer are limited.
 */

const MAX_RESPONSE_BYTES = 2048;

/** A DNS lookup that refuses any name that resolves to a non-public address. */
export function guardedLookup(allowPrivate) {
  return (hostname, options, callback) => {
    dns.lookup(hostname, { all: true }, (err, addresses) => {
      if (err) return callback(err);
      if (!allowPrivate && addresses.some((a) => isBlockedAddress(a.address))) {
        const refused = new Error("BLOCKED_ADDRESS: the address is not a public internet address");
        refused.code = "BLOCKED_ADDRESS";
        return callback(refused);
      }
      // every address was checked, so Node may try them all (an IPv6 address first, then IPv4)
      if (options?.all) return callback(null, addresses);
      return callback(null, addresses[0].address, addresses[0].family);
    });
  };
}

/**
 * @param {object} p
 * @param {string} p.url
 * @param {string} p.body raw JSON text (what is signed is exactly what is sent)
 * @param {Record<string, string>} p.headers
 * @param {number} [p.timeoutMs]
 * @returns {Promise<{ status: number|null, excerpt: string, durationMs: number, error: string|null }>}
 */
export function postJson({ url, body, headers = {}, timeoutMs = config.webhooks.timeoutMs }) {
  const started = Date.now();
  const target = new URL(url);
  const transport = target.protocol === "https:" ? https : http;

  // A name is checked when it is looked up; an address written into the URL is never looked up, so check it here.
  const host = target.hostname.replace(/^\[|\]$/g, "");
  if (!config.webhooks.allowPrivate && net.isIP(host) && isBlockedAddress(host)) {
    return Promise.resolve({ status: null, excerpt: "", durationMs: 0, error: "Alamat tujuan bukan alamat internet publik." });
  }

  return new Promise((resolve) => {
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      resolve({ durationMs: Date.now() - started, excerpt: "", status: null, error: null, ...result });
    };

    const req = transport.request(
      target,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), "User-Agent": "Klozer-Webhooks/1.0", ...headers },
        lookup: guardedLookup(config.webhooks.allowPrivate),
        agent: false, // a fresh connection each time: no reuse across tenants
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        let size = 0;
        res.on("data", (chunk) => {
          if (size < MAX_RESPONSE_BYTES) chunks.push(chunk);
          size += chunk.length;
          if (size > MAX_RESPONSE_BYTES * 8) res.destroy(); // an answer far bigger than we keep: stop reading
        });
        const finish = () => done({ status: res.statusCode, excerpt: Buffer.concat(chunks).toString("utf8").slice(0, 500) });
        res.on("end", finish);
        res.on("close", finish);
        res.on("error", finish);
      }
    );
    req.on("timeout", () => {
      req.destroy();
      done({ error: `Waktu habis setelah ${Math.round(timeoutMs / 1000)} detik.` });
    });
    req.on("error", (err) => {
      done({ error: err.code === "BLOCKED_ADDRESS" ? "Alamat tujuan bukan alamat internet publik." : String(err.code || err.message).slice(0, 200) });
    });
    req.end(body);
  });
}
