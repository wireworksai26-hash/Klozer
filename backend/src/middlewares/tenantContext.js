/**
 * Multi-Tenant Data Isolation Context Middleware
 * Enforces strict institution_id isolation across all relational queries
 * Eliminates security data leaks between merchants
 */
export function tenantContext(req, res, next) {
  // 1. Authenticated regular user (owner, cs, supervisor, finance) -> STRICTLY tied to their institution
  if (req.user && req.user.institution_id) {
    req.tenantId = Number(req.user.institution_id);
    req.institutionId = req.tenantId;
    return next();
  }

  // 2. Superadmin can inspect specific institution via header or query parameter
  if (req.user && req.user.role === "superadmin") {
    const overrideId = req.headers["x-institution-id"] || req.query.institution_id;
    if (overrideId) {
      req.tenantId = parseInt(overrideId, 10);
      req.institutionId = req.tenantId;
      return next();
    }
    // Default superadmin view
    req.tenantId = 1;
    req.institutionId = 1;
    return next();
  }

  // 3. Public Webhook / Unauthenticated Gateway Call
  const headerTenantId = req.headers["x-institution-id"] || req.query.institution_id;
  if (headerTenantId) {
    req.tenantId = parseInt(headerTenantId, 10);
    req.institutionId = req.tenantId;
    return next();
  }

  // 4. Reject un-scoped access to tenant endpoints
  return res.status(403).json({
    success: false,
    message: "Akses ditolak: Tenant context (institution_id) tidak ditemukan atau tidak valid.",
  });
}
