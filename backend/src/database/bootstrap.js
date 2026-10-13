import { queryOne, transaction } from "../config/db.js";
import { config } from "../config/env.js";
import { logger } from "../config/logger.js";
import { hashPassword } from "../utils/crypto.js";
import { PLATFORM_INSTITUTION_SLUG } from "../utils/constants.js";

/**
 * Make sure a platform superadmin exists. The credentials come from the
 * environment (SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD); nothing is hardcoded
 * and no default account is ever created. If a superadmin already exists this
 * does nothing, so changing the env later never silently resets the password.
 */
export async function ensureSuperadmin() {
  const existing = await queryOne("SELECT id FROM users WHERE role = 'superadmin' LIMIT 1");
  if (existing) return { created: false };

  const { superadminEmail: email, superadminPassword: password, superadminName: name } = config.bootstrap;
  if (!email || !password) {
    logger.warn("Belum ada superadmin. Set SUPERADMIN_EMAIL dan SUPERADMIN_PASSWORD lalu restart untuk membuatnya.");
    return { created: false };
  }
  if (password.length < 12) throw new Error("SUPERADMIN_PASSWORD minimal 12 karakter.");

  await transaction(async (tx) => {
    let platform = await tx.queryOne("SELECT id FROM institutions WHERE slug = ?", [PLATFORM_INSTITUTION_SLUG]);
    if (!platform) {
      const result = await tx.query(
        `INSERT INTO institutions (name, slug, mode, sector, email, subscription_tier, blast_credit_quota, ai_token_quota)
         VALUES ('Klozer Platform', ?, 'business', 'Platform', ?, 'enterprise', 0, 0)`,
        [PLATFORM_INSTITUTION_SLUG, email]
      );
      platform = { id: result.insertId };
    }
    await tx.query(
      "INSERT INTO users (institution_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'superadmin')",
      [platform.id, name, email, await hashPassword(password)]
    );
  });

  logger.info({ email }, "Superadmin dibuat dari environment");
  return { created: true };
}
