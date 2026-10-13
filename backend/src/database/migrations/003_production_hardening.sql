-- ============================================================================
-- 003: Production hardening
--  * account lockout + token revocation columns on users
--  * AI token accounting on institutions (replaces in-memory counters)
--  * WhatsApp channel -> tenant mapping (webhook tenant resolution)
--  * chat message de-duplication + delivery tracking
--  * AI usage ledger and audit log
-- ============================================================================

ALTER TABLE `users`
  ADD COLUMN `token_version` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `password_hash`,
  ADD COLUMN `failed_login_count` TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER `token_version`,
  ADD COLUMN `locked_until` DATETIME NULL AFTER `failed_login_count`,
  ADD COLUMN `last_login_at` DATETIME NULL AFTER `locked_until`;

ALTER TABLE `institutions`
  ADD COLUMN `ai_tokens_used` BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER `ai_token_quota`,
  ADD COLUMN `language` VARCHAR(5) NOT NULL DEFAULT 'id' AFTER `features_json`,
  ADD COLUMN `meta_pixel_id` VARCHAR(40) NULL AFTER `language`,
  ADD COLUMN `encrypted_meta_capi_token` TEXT NULL AFTER `meta_pixel_id`;

ALTER TABLE `leads`
  ADD COLUMN `source` VARCHAR(30) NOT NULL DEFAULT 'manual' AFTER `status`;

ALTER TABLE `chat_messages`
  ADD COLUMN `wa_message_id` VARCHAR(120) NULL AFTER `lead_id`,
  ADD COLUMN `model_used` VARCHAR(80) NULL AFTER `tokens_used`,
  ADD COLUMN `delivery_error` VARCHAR(255) NULL AFTER `is_delivered`,
  ADD UNIQUE KEY `uk_chat_wa_message` (`institution_id`, `wa_message_id`);

ALTER TABLE `payments`
  ADD COLUMN `provider_transaction_id` VARCHAR(100) NULL AFTER `payment_reference`;

CREATE TABLE IF NOT EXISTS `whatsapp_channels` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `phone_number_id` VARCHAR(60) NOT NULL,
  `display_phone` VARCHAR(30) NULL,
  `encrypted_access_token` TEXT NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_wa_channel_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_wa_channel_phone_id` (`phone_number_id`),
  UNIQUE KEY `uk_wa_channel_institution` (`institution_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai_token_usage_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NULL,
  `model` VARCHAR(80) NOT NULL,
  `usage_type` VARCHAR(60) NOT NULL DEFAULT 'chat_cs',
  `prompt_tokens` INT UNSIGNED NOT NULL DEFAULT 0,
  `completion_tokens` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_tokens` INT UNSIGNED NOT NULL DEFAULT 0,
  `latency_ms` INT UNSIGNED NOT NULL DEFAULT 0,
  `cost_idr` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ok',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ai_usage_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  INDEX `idx_ai_usage_inst_time` (`institution_id`, `created_at`),
  INDEX `idx_ai_usage_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NULL,
  `user_id` INT UNSIGNED NULL,
  `action` VARCHAR(80) NOT NULL,
  `entity_type` VARCHAR(60) NULL,
  `entity_id` VARCHAR(60) NULL,
  `ip_address` VARCHAR(64) NULL,
  `metadata_json` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_inst_time` (`institution_id`, `created_at`),
  INDEX `idx_audit_action` (`action`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
