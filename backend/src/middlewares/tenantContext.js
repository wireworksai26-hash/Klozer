import { forbidden } from "../utils/errors.js";

/**
 * Pin every tenant-scoped request to exactly one institution.
 *
 * The tenant always comes from the authenticated user. Only a superadmin may
 * act on another tenant, by sending `x-institution-id`. There is no
 * unauthenticated path and no default tenant: a request without a resolvable
 * tenant is rejected instead of falling through to "tenant 1".
 */
export function tenantContext(req, res, next) {
  if (!req.user) return next(forbidden("Tenant context memerlukan otentikasi."));

  let tenantId = Number(req.user.institution_id);

  if (req.user.role === "superadmin") {
    const override = req.headers["x-institution-id"] || req.query.institution_id;
    if (override !== undefined && override !== "") {
      const parsed = Number(override);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return next(forbidden("x-institution-id tidak valid."));
      }
      tenantId = parsed;
    }
  }

  if (!Number.isInteger(tenantId) || tenantId <= 0) {
    return next(forbidden("Tenant context (institution_id) tidak ditemukan."));
  }

  req.tenantId = tenantId;
  req.institutionId = tenantId;
  next();
}
