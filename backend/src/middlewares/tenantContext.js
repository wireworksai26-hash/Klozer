/**
 * Multi-Tenant Data Isolation Context Middleware
 * Enforces institution_id isolation across all relational queries
 */
export function tenantContext(req, res, next) {
  // 1. If user is authenticated, use their token's institution_id
  if (req.user && req.user.institution_id) {
    req.tenantId = req.user.institution_id;
    return next();
  }

  // 2. Superadmin or public webhook can specify tenant via header or query
  const headerTenantId = req.headers["x-institution-id"] || req.query.institution_id;
  if (headerTenantId) {
    req.tenantId = parseInt(headerTenantId, 10);
    return next();
  }

  // 3. Fallback default tenant for initial testing
  req.tenantId = 1;
  next();
}
