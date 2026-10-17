-- Platform-wide settings edited from the superadmin UI (currently: AI provider keys).
-- Secrets are stored AES-256-GCM encrypted (same key as the other tokens at rest) and never returned by the API.
CREATE TABLE IF NOT EXISTS `platform_settings` (
  `setting_key` VARCHAR(80) NOT NULL PRIMARY KEY,
  `value_json` JSON NULL,
  `encrypted_secrets` TEXT NULL,
  `updated_by` INT UNSIGNED NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
