-- ============================================================================
-- 014: Broadcast with approved templates, marketing consent, and ad attribution and spend.
--  * message_templates: WhatsApp templates (the only kind of message a business may start a conversation with).
--  * leads: marketing consent (who may receive promotions) and the Click-to-WhatsApp click id.
--  * broadcast_*: campaigns, their frozen recipient lists and per-recipient delivery results.
--  * meta_ads_settings, ad_spend_daily: what was spent on ads, entered by hand or synced from Meta.
--  * meta_capi_event_logs: attempts and retry time, so a failed conversion event is sent again.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `message_templates` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `channel_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `language` VARCHAR(12) NOT NULL,
  `category` ENUM('marketing', 'utility', 'authentication') NOT NULL,
  `status` ENUM('draft', 'pending', 'approved', 'rejected', 'paused', 'disabled') NOT NULL DEFAULT 'draft',
  `meta_template_id` VARCHAR(40) NULL,
  `components_json` JSON NOT NULL,
  `body_text` TEXT NOT NULL,
  `variable_count` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `header_format` ENUM('none', 'text', 'image', 'video', 'document') NOT NULL DEFAULT 'none',
  `rejected_reason` VARCHAR(255) NULL,
  `last_synced_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_templates_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_templates_channel` FOREIGN KEY (`channel_id`) REFERENCES `channels` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_templates_name` (`channel_id`, `name`, `language`),
  INDEX `idx_templates_status` (`institution_id`, `status`),
  INDEX `idx_templates_meta` (`meta_template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `leads`
  ADD COLUMN `marketing_consent` ENUM('unknown', 'opted_in', 'opted_out') NOT NULL DEFAULT 'unknown',
  ADD COLUMN `marketing_consent_at` DATETIME NULL,
  ADD COLUMN `marketing_consent_source` VARCHAR(160) NULL,
  ADD COLUMN `ctwa_clid` VARCHAR(255) NULL,
  ADD INDEX `idx_leads_consent` (`institution_id`, `marketing_consent`);

-- a customer who asked for no reminders in chat also asked for no promotions
UPDATE `leads` SET `marketing_consent` = 'opted_out', `marketing_consent_at` = UTC_TIMESTAMP(), `marketing_consent_source` = 'followup opt-out' WHERE `followup_opt_out` = 1;

ALTER TABLE `meta_ad_referrals`
  ADD COLUMN `ctwa_clid` VARCHAR(255) NULL,
  ADD COLUMN `source_type` VARCHAR(20) NULL,
  ADD COLUMN `media_type` VARCHAR(20) NULL;

ALTER TABLE `institutions`
  ADD COLUMN `blast_credits_used` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `blast_credit_quota`;

CREATE TABLE IF NOT EXISTS `broadcast_settings` (
  `institution_id` INT UNSIGNED NOT NULL PRIMARY KEY,
  `daily_limit` INT UNSIGNED NOT NULL DEFAULT 250,
  `frequency_cap_days` TINYINT UNSIGNED NOT NULL DEFAULT 3,
  `quiet_start_hour` TINYINT UNSIGNED NOT NULL DEFAULT 21,
  `quiet_end_hour` TINYINT UNSIGNED NOT NULL DEFAULT 8,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_broadcast_settings_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `broadcast_campaigns` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `channel_id` INT UNSIGNED NOT NULL,
  `template_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `status` ENUM('draft', 'scheduled', 'sending', 'paused', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
  `pause_reason` VARCHAR(60) NULL,
  `audience_json` JSON NOT NULL,
  `variables_json` JSON NULL,
  `header_media_url` VARCHAR(500) NULL,
  `scheduled_at` DATETIME NULL,
  `started_at` DATETIME NULL,
  `finished_at` DATETIME NULL,
  `backoff_until` DATETIME NULL,
  `created_by` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_campaigns_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_campaigns_channel` FOREIGN KEY (`channel_id`) REFERENCES `channels` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_campaigns_template` FOREIGN KEY (`template_id`) REFERENCES `message_templates` (`id`),
  CONSTRAINT `fk_campaigns_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_campaigns_status` (`status`, `scheduled_at`),
  INDEX `idx_campaigns_institution` (`institution_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `broadcast_recipients` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `campaign_id` INT UNSIGNED NOT NULL,
  `institution_id` INT UNSIGNED NOT NULL,
  `lead_id` INT UNSIGNED NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `status` ENUM('pending', 'sending', 'sent', 'delivered', 'read', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
  `variables_json` JSON NULL,
  `wa_message_id` VARCHAR(255) NULL,
  `error_code` VARCHAR(20) NULL,
  `error_message` VARCHAR(250) NULL,
  `sent_at` DATETIME NULL,
  `delivered_at` DATETIME NULL,
  `read_at` DATETIME NULL,
  `replied_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_recipients_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `broadcast_campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_recipients_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_recipients_campaign_lead` (`campaign_id`, `lead_id`),
  INDEX `idx_recipients_queue` (`campaign_id`, `status`, `id`),
  INDEX `idx_recipients_message` (`wa_message_id`),
  INDEX `idx_recipients_lead` (`lead_id`, `status`, `sent_at`),
  INDEX `idx_recipients_tenant_sent` (`institution_id`, `sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `meta_ads_settings` (
  `institution_id` INT UNSIGNED NOT NULL PRIMARY KEY,
  `ad_account_id` VARCHAR(40) NOT NULL,
  `encrypted_access_token` TEXT NOT NULL,
  `last_synced_at` DATETIME NULL,
  `last_sync_error` VARCHAR(250) NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ads_settings_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ad_spend_daily` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `spend_date` DATE NOT NULL,
  `campaign_id` VARCHAR(100) NOT NULL DEFAULT '',
  `ad_id` VARCHAR(100) NOT NULL DEFAULT '',
  `campaign_name` VARCHAR(200) NULL,
  `ad_name` VARCHAR(200) NULL,
  `spend` DECIMAL(14, 2) NOT NULL,
  `impressions` INT UNSIGNED NOT NULL DEFAULT 0,
  `clicks` INT UNSIGNED NOT NULL DEFAULT 0,
  `source` ENUM('manual', 'meta') NOT NULL DEFAULT 'manual',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_spend_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_spend_day` (`institution_id`, `spend_date`, `campaign_id`, `ad_id`),
  INDEX `idx_spend_ad` (`institution_id`, `ad_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `meta_capi_event_logs`
  ADD COLUMN `attempts` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  ADD COLUMN `next_retry_at` DATETIME NULL,
  ADD INDEX `idx_capi_retry` (`is_success`, `next_retry_at`);
