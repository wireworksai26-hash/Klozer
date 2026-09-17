import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { query } from "../config/db.js";

/**
 * Generate JWT Token
 */
export function generateToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

/**
 * Authenticate JWT Middleware
 */
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Akses ditolak. Token otentikasi tidak ditemukan.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    req.tenantId = decoded.institution_id || decoded.institutionId || null;
    req.institutionId = req.tenantId;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Token otentikasi kadaluarsa atau tidak valid.",
    });
  }
}

/**
 * Optional Authentication Middleware (Allows public / simulator testing while attaching user if present)
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = decoded;
      req.tenantId = decoded.institution_id || decoded.institutionId || null;
      req.institutionId = req.tenantId;
    } catch (err) {
      // Non-blocking for optional auth
    }
  }
  next();
}

/**
 * Role-Based Access Control (RBAC) Guard
 * @param  {...string} allowedRoles 
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Otentikasi diperlukan.",
      });
    }

    // Superadmin always has global access
    if (req.user.role === "superadmin") {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Peran '${req.user.role}' tidak memiliki izin untuk fitur ini.`,
      });
    }

    next();
  };
}
