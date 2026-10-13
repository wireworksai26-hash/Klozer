import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

/**
 * Browser sessions live in an httpOnly cookie so page scripts (and therefore an
 * XSS payload) can never read the token. API clients may still send
 * `Authorization: Bearer <token>`.
 */
export const SESSION_COOKIE = "klozer_session";

/**
 * Header a browser must send on state-changing requests authenticated by the
 * cookie. A cross-site page cannot add a custom header without a CORS
 * preflight, and preflights from unknown origins are refused, so this blocks CSRF.
 */
export const CSRF_HEADER = "x-requested-with";
export const CSRF_VALUE = "klozer-web";

const baseCookie = () => ({
  httpOnly: true,
  secure: config.isProduction,
  sameSite: "strict",
  path: "/",
});

export function setSessionCookie(res, token) {
  const exp = jwt.decode(token)?.exp;
  const maxAge = exp ? Math.max(0, exp * 1000 - Date.now()) : undefined;
  res.cookie(SESSION_COOKIE, token, { ...baseCookie(), maxAge });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, baseCookie());
}

/** Minimal cookie-header reader (avoids a dependency for one value). */
export function readCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  for (const part of String(cookieHeader).split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      const raw = part.slice(index + 1).trim();
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return null;
}

/** True when the request comes from a page on an origin we serve (or carries no Origin at all). */
export function isAllowedOrigin(origin) {
  return !origin || config.corsOrigins.includes(origin);
}
