-- ============================================================================
-- 013: Chat commerce.
--  * commerce_settings: per tenant, whether the assistant may take orders in chat, how shipping and payment work,
--    and how reminders behave. Off until the tenant turns it on.
--  * order_drafts: the order a customer is putting together in a conversation (one open draft per contact).
--  * orders: where an order came from, and the recipient and courier choice taken in chat.
--  * leads: when the customer last wrote (messaging windows) and whether they asked not to be reminded.
--  * proactive_followup_jobs: reminders for unpaid orders and abandoned carts, claimed by a background worker.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `commerce_settings` (
  `institution_id` INT UNSIGNED NOT NULL PRIMARY KEY,
  `enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `shipping_mode` ENUM('ask_team', 'flat', 'free', 'provider') NOT NULL DEFAULT 'ask_team',
  `shipping_flat_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `origin_postal_code` VARCHAR(10) NULL,
  `allow_pickup` TINYINT(1) NOT NULL DEFAULT 0,
  `pay_qris` TINYINT(1) NOT NULL DEFAULT 1,
  `pay_transfer` TINYINT(1) NOT NULL DEFAULT 1,
  `pay_cod` TINYINT(1) NOT NULL DEFAULT 0,
  `followup_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `followup_delays_json` JSON NULL,
  `quiet_start_hour` TINYINT UNSIGNED NOT NULL DEFAULT 21,
  `quiet_end_hour` TINYINT UNSIGNED NOT NULL DEFAULT 8,
  `unpaid_cancel_hours` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `notify_customer` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_commerce_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_drafts` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `lead_id` INT UNSIGNED NOT NULL,
  `channel_id` INT UNSIGNED NULL,
  `active` TINYINT(1) NULL DEFAULT 1,
  `status` ENUM('collecting', 'awaiting_confirmation', 'handed_off', 'placed', 'cancelled', 'expired') NOT NULL DEFAULT 'collecting',
  `items_json` JSON NOT NULL,
  `fulfillment_type` ENUM('delivery', 'pickup') NOT NULL DEFAULT 'delivery',
  `recipient_name` VARCHAR(150) NULL,
  `recipient_phone` VARCHAR(30) NULL,
  `address_text` VARCHAR(500) NULL,
  `city` VARCHAR(100) NULL,
  `postal_code` VARCHAR(10) NULL,
  `shipping_options_json` JSON NULL,
  `courier_code` VARCHAR(30) NULL,
  `courier_service` VARCHAR(80) NULL,
  `shipping_fee` DECIMAL(12, 2) NULL,
  `shipping_eta` VARCHAR(40) NULL,
  `payment_method` ENUM('qris', 'bank_transfer', 'cod') NULL,
  `notes` VARCHAR(500) NULL,
  `order_id` INT UNSIGNED NULL,
  `last_activity_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_drafts_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_drafts_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_drafts_channel` FOREIGN KEY (`channel_id`) REFERENCES `channels` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_drafts_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL,
  -- `active` is 1 while the draft is open and NULL once it is closed, so a contact has at most one open draft
  -- and any number of closed ones (a unique key allows repeated NULLs).
  UNIQUE KEY `uq_drafts_open` (`lead_id`, `active`),
  INDEX `idx_drafts_activity` (`institution_id`, `active`, `last_activity_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `orders`
  ADD COLUMN `created_via` ENUM('dashboard', 'chat') NOT NULL DEFAULT 'dashboard' AFTER `fulfillment_type`,
  ADD COLUMN `chat_details_json` JSON NULL AFTER `notes`;

ALTER TABLE `leads`
  ADD COLUMN `last_inbound_at` DATETIME NULL,
  ADD COLUMN `followup_opt_out` TINYINT(1) NOT NULL DEFAULT 0;

UPDATE `leads` SET `last_inbound_at` = `last_contacted_at` WHERE `last_inbound_at` IS NULL;

ALTER TABLE `proactive_followup_jobs`
  MODIFY COLUMN `trigger_reason` ENUM('abandoned_qris', 'abandoned_consultation', 're_engagement', 'abandoned_cart') NOT NULL,
  MODIFY COLUMN `status` ENUM('pending', 'sending', 'sent', 'cancelled_by_payment', 'cancelled_by_reply', 'cancelled_by_human', 'cancelled', 'skipped_window', 'failed') NOT NULL DEFAULT 'pending',
  ADD COLUMN `order_id` INT UNSIGNED NULL,
  ADD COLUMN `draft_id` INT UNSIGNED NULL,
  ADD COLUMN `claimed_at` DATETIME NULL,
  ADD COLUMN `error` VARCHAR(250) NULL,
  ADD CONSTRAINT `fk_followup_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_followup_draft` FOREIGN KEY (`draft_id`) REFERENCES `order_drafts` (`id`) ON DELETE CASCADE,
  ADD INDEX `idx_followup_lead` (`lead_id`, `status`);
