import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { queryOne } from "../config/db.js";
import { unauthorized, forbidden } from "../utils/errors.js";
import { CSRF_HEADER, CSRF_VALUE, SESSION_COOKIE, isAllowedOrigin, readCookie } from "../utils/session.js";

export const ROLES = ["superadmin", "supervisor", "owner", "finance", "cs", "pic_warehouse"];

export function generateToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, inst: user.institution_id, tv: user.token_version ?? 0 },
    config.jwt.secret,
    { algorithm: "HS256", expiresIn: config.jwt.expiresIn, issuer: config.jwt.issuer }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret, { algorithms: ["HS256"], issuer: config.jwt.issuer });
}

function extractBearer(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

/**
 * Resolve the caller from the database on every request. The JWT only proves
 * identity; role, tenant and active state always come from the current DB row,
 * so deactivating a user or bumping `token_version` takes effect immediately.
 */
export async function loadUserFromToken(token) {
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw unauthorized("Token otentikasi kadaluarsa atau tidak valid.");
  }

  const row = await queryOne(
    `SELECT u.id, u.institution_id, u.name, u.email, u.role, u.is_active, u.token_version,
            i.is_active AS institution_active
       FROM users u
       JOIN institutions i ON i.id = u.institution_id
      WHERE u.id = ?`,
    [payload.sub]
  );

  if (!row || !row.is_active || !row.institution_active || row.token_version !== payload.tv) {
    throw unauthorized("Sesi tidak lagi valid. Silakan login kembali.");
  }

  return { id: row.id, institution_id: row.institution_id, name: row.name, email: row.email, role: row.role };
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function authenticate(req, res, next) {
  try {
    let token = extractBearer(req);
    if (!token) {
      token = readCookie(req.headers.cookie, SESSION_COOKIE);
      if (token && !SAFE_METHODS.has(req.method)) {
        if (req.get(CSRF_HEADER) !== CSRF_VALUE || !isAllowedOrigin(req.get("origin"))) {
          throw forbidden("Permintaan ditolak (proteksi CSRF).");
        }
      }
    }
    if (!token) throw unauthorized("Akses ditolak. Token otentikasi tidak ditemukan.");

    req.user = await loadUserFromToken(token);
    req.tenantId = req.user.institution_id;
    req.institutionId = req.tenantId;
    next();
  } catch (err) {
    next(err);
  }
}

/** Allow the listed roles. Superadmin is always allowed. */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (req.user.role === "superadmin" || allowedRoles.includes(req.user.role)) return next();
    return next(forbidden(`Peran '${req.user.role}' tidak memiliki izin untuk fitur ini.`));
  };
}

/** Platform-level routes that only the superadmin may use. */
export const requireSuperadmin = requireRole();
