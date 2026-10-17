import { queryOne } from "../config/db.js";
import { forbidden } from "../utils/errors.js";

/**
 * Block a route for tenants whose package does not include a feature.
 * Features live in institutions.features_json and are switched by the superadmin; a feature is
 * available unless it is explicitly set to false, so tenants created before a flag existed keep working.
 * The superadmin is never blocked.
 */
export function requireFeature(flag, label = flag) {
  return async function featureGate(req, res, next) {
    try {
      if (req.user?.role === "superadmin") return next();
      const inst = await queryOne("SELECT features_json FROM institutions WHERE id = ?", [req.tenantId]);
      if (inst?.features_json?.[flag] === false) {
        return next(forbidden(`Fitur ${label} tidak termasuk dalam paket Anda. Hubungi admin Klozer untuk mengaktifkannya.`, { code: "FEATURE_DISABLED" }));
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
