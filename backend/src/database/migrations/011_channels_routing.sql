-- ============================================================================
-- 011: Channels, routing and human hand-off.
--  * channels: one row per connected account (a WhatsApp number now; Instagram, Messenger, Telegram and web chat
--    later). Replaces whatsapp_channels, which is left in place but no longer read.
--  * leads and chat_messages remember which channel a conversation is on, so a reply leaves from the same account.
--  * routing_settings: how new conversations are shared among CS agents, per tenant.
--  * users: availability toggle and the data the round robin needs.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `channels` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `type` ENUM('whatsapp', 'instagram', 'messenger', 'telegram', 'webchat') NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `external_id` VARCHAR(100) NOT NULL,
  `display_handle` VARCHAR(120) NULL,
  `encrypted_access_token` TEXT NULL,
  `config_json` JSON NULL,
  `ai_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_channels_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_channels_external` (`type`, `external_id`),
  INDEX `idx_channels_institution` (`institution_id`, `type`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `channels` (`institution_id`, `type`, `name`, `external_id`, `display_handle`, `encrypted_access_token`, `is_active`, `is_default`)
SELECT `institution_id`, 'whatsapp', COALESCE(NULLIF(`display_phone`, ''), 'WhatsApp'), `phone_number_id`, `display_phone`, `encrypted_access_token`, `is_active`, 1
  FROM `whatsapp_channels`;

CREATE TABLE IF NOT EXISTS `routing_settings` (
  `institution_id` INT UNSIGNED NOT NULL PRIMARY KEY,
  `mode` ENUM('least_busy', 'round_robin', 'manual') NOT NULL DEFAULT 'least_busy',
  `online_only` TINYINT(1) NOT NULL DEFAULT 1,
  `max_open_chats` SMALLINT UNSIGNED NOT NULL DEFAULT 20,
  `human_hold_minutes` SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  `handoff_keywords` JSON NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_routing_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `users`
  ADD COLUMN `is_available` TINYINT(1) NOT NULL DEFAULT 1 AFTER `is_online`,
  ADD COLUMN `last_assigned_at` DATETIME NULL AFTER `is_available`,
  ADD COLUMN `last_seen_at` DATETIME NULL AFTER `last_assigned_at`;

ALTER TABLE `leads`
  MODIFY COLUMN `phone_number` VARCHAR(30) NULL,
  ADD COLUMN `channel_id` INT UNSIGNED NULL AFTER `institution_id`,
  ADD COLUMN `channel_type` ENUM('whatsapp', 'instagram', 'messenger', 'telegram', 'webchat') NOT NULL DEFAULT 'whatsapp' AFTER `channel_id`,
  ADD COLUMN `external_id` VARCHAR(100) NULL AFTER `channel_type`,
  ADD COLUMN `handled_by` ENUM('ai', 'human') NOT NULL DEFAULT 'ai',
  ADD COLUMN `handoff_reason` VARCHAR(120) NULL,
  ADD COLUMN `handoff_at` DATETIME NULL,
  ADD COLUMN `assigned_at` DATETIME NULL,
  ADD CONSTRAINT `fk_leads_channel` FOREIGN KEY (`channel_id`) REFERENCES `channels` (`id`) ON DELETE SET NULL,
  ADD UNIQUE KEY `uq_leads_contact` (`institution_id`, `channel_type`, `external_id`),
  ADD INDEX `idx_leads_queue` (`institution_id`, `status`, `assigned_cs_id`);

UPDATE `leads` SET `external_id` = `phone_number` WHERE `external_id` IS NULL AND `phone_number` IS NOT NULL;

ALTER TABLE `chat_messages`
  MODIFY COLUMN `sender_type` ENUM('customer', 'cs', 'ai_agent', 'system') NOT NULL,
  ADD COLUMN `channel_id` INT UNSIGNED NULL AFTER `lead_id`,
  ADD CONSTRAINT `fk_chat_channel` FOREIGN KEY (`channel_id`) REFERENCES `channels` (`id`) ON DELETE SET NULL;
