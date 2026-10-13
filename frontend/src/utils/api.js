import { API_BASE_URL } from "@/utils/apiConfig";
import { classifyMeFailure, USER_STORAGE_KEY } from "@/utils/sessionSync.mjs";

// The session token lives in an httpOnly cookie set by the server: page scripts never see it.
// Only a non-sensitive copy of the profile is kept here, to paint the UI before /auth/me answers.
export const USER_KEY = USER_STORAGE_KEY;
export const TENANT_KEY = "klozer_acting_tenant";
const LEGACY_KEYS = ["klozer_token", "klozer_role", "token", "user"];

// Sent on every request; the server requires it for cookie-authenticated writes (CSRF protection).
const CSRF_HEADER = { "X-Requested-With": "klozer-web" };

function readStorage(key) {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    if (value === null || value === undefined) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private mode): the UI just repaints after /auth/me
  }
}

/** True when this browser believes it is signed in (the cookie itself cannot be read). */
export const hasCachedSession = () => Boolean(readStorage(USER_KEY));

export function cacheUser(user) {
  writeStorage(USER_KEY, user ? JSON.stringify(user) : null);
}

export function readCachedUser() {
  try {
    const raw = readStorage(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Superadmin "act as institution" id; sent as x-institution-id. Ignored by the server for everyone else. */
export const getActingTenant = () => readStorage(TENANT_KEY);
export const setActingTenant = (id) => writeStorage(TENANT_KEY, id ? String(id) : null);

export function clearSession() {
  [USER_KEY, TENANT_KEY, ...LEGACY_KEYS].forEach((k) => writeStorage(k, null));
}

export class ApiError extends Error {
  constructor(message, { status = 0, code, details } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let unauthorizedHandler = null;
/** Called when an authenticated request comes back 401 (expired, revoked, or deactivated session). */
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

function buildQuery(query) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

/**
 * Single entry point for every backend call.
 * Resolves with the parsed JSON body; rejects with ApiError carrying the server's message.
 * `auth: false` marks public calls (login, register): a 401 there is a wrong password, not an expired session.
 */
export async function apiFetch(path, { method = "GET", body, query, auth = true, headers: extra, signal } = {}) {
  const headers = { Accept: "application/json", ...CSRF_HEADER, ...extra };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const acting = getActingTenant();
    if (acting) headers["x-institution-id"] = acting;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}${buildQuery(query)}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // same-origin by default; "include" also covers an API on a sibling subdomain
      credentials: "include",
      signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new ApiError("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.", { status: 0, code: "NETWORK" });
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // empty or non-JSON body
  }

  // Not gated on the cached profile: with storage blocked (private mode) or cleared by another tab
  // the cache is empty, yet a 401 still means this open dashboard has no server session any more.
  if (response.status === 401 && auth && unauthorizedHandler) {
    unauthorizedHandler();
  }

  if (!response.ok) {
    throw new ApiError(data?.message || `Permintaan gagal (${response.status}).`, {
      status: response.status,
      code: data?.code,
      details: data?.details,
    });
  }
  return data;
}

/**
 * Asks the server who this browser is and reconciles the local profile copy with the answer.
 *  - { state: "valid", user, institution }  the session is alive
 *  - { state: "expired" }                   the server says no session: the cached profile is removed here
 *  - { state: "unknown" }                   server/network trouble: nothing is changed
 */
export async function validateSession() {
  try {
    const me = await apiFetch("/auth/me", { auth: false });
    return { state: "valid", user: me.user, institution: me.institution };
  } catch (err) {
    if (classifyMeFailure(err?.status) === "expired") {
      clearSession();
      return { state: "expired" };
    }
    return { state: "unknown" };
  }
}

export const api = {
  get: (path, options) => apiFetch(path, { ...options, method: "GET" }),
  post: (path, body, options) => apiFetch(path, { ...options, method: "POST", body }),
  put: (path, body, options) => apiFetch(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) => apiFetch(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => apiFetch(path, { ...options, method: "DELETE" }),
};
