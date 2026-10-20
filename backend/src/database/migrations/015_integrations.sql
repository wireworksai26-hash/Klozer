-- ============================================================================
-- 015: Integrations: API keys for the public API, and outbound webhooks (for n8n, Make, Zapier or custom code).
--  * api_keys: one row per key; only a hash of the key is stored, plus a short prefix to recognise it by.
--  * webhook_endpoints: where a tenant wants events sent, which events, and the secret that signs them.
--  * webhook_deliveries: the outbox. An event is written here first and a worker delivers it, retrying with
--    growing waits, so a receiver that is down for an hour does not lose events.
--  * orders.created_via: orders created through the public API.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `api_keys` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `key_prefix` VARCHAR(20) NOT NULL,
  `key_hash` CHAR(64) NOT NULL,
  `scopes_json` JSON NOT NULL,
  `created_by` INT UNSIGNED NULL,
  `last_used_at` DATETIME NULL,
  `expires_at` DATETIME NULL,
  `revoked_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_api_keys_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_api_keys_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  UNIQUE KEY `uq_api_keys_hash` (`key_hash`),
  INDEX `idx_api_keys_institution` (`institution_id`, `revoked_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `webhook_endpoints` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `encrypted_secret` TEXT NOT NULL,
  `events_json` JSON NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `failure_streak` INT UNSIGNED NOT NULL DEFAULT 0,
  `disabled_reason` VARCHAR(120) NULL,
  `last_success_at` DATETIME NULL,
  `last_failure_at` DATETIME NULL,
  `created_by` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_webhook_endpoints_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_webhook_endpoints_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_webhook_endpoints_institution` (`institution_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `webhook_deliveries` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `endpoint_id` INT UNSIGNED NOT NULL,
  `event_id` VARCHAR(40) NOT NULL,
  `event_type` VARCHAR(60) NOT NULL,
  `payload_json` JSON NOT NULL,
  `status` ENUM('pending', 'sending', 'delivered', 'failed', 'dead') NOT NULL DEFAULT 'pending',
  `attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `next_attempt_at` DATETIME NULL,
  `claimed_at` DATETIME NULL,
  `last_status_code` SMALLINT UNSIGNED NULL,
  `last_error` VARCHAR(250) NULL,
  `response_excerpt` VARCHAR(500) NULL,
  `duration_ms` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `delivered_at` DATETIME NULL,
  CONSTRAINT `fk_webhook_deliveries_endpoint` FOREIGN KEY (`endpoint_id`) REFERENCES `webhook_endpoints` (`id`) ON DELETE CASCADE,
  INDEX `idx_webhook_deliveries_due` (`status`, `next_attempt_at`),
  INDEX `idx_webhook_deliveries_endpoint` (`endpoint_id`, `id`),
  INDEX `idx_webhook_deliveries_tenant` (`institution_id`, `created_at`),
  INDEX `idx_webhook_deliveries_event` (`event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `orders`
  MODIFY COLUMN `created_via` ENUM('dashboard', 'chat', 'api') NOT NULL DEFAULT 'dashboard';
