-- ============================================================================
-- 019: Fast path, platform payment methods, top up prices.
--  * chat_messages.reply_path: how a reply was made ('fast:payment', 'fast:catalog', ... or NULL for the language
--    model), so a shop can see how many answers cost no tokens.
--  * fast_path_settings: per shop, whether repetitive questions (bank account, product list, price, address, greeting)
--    are answered from the shop's own data without the model, which topics, and the opening hours the owner states.
--  * platform_payment_methods: where Klozer itself is paid (QRIS merchant, bank account, e-wallet), managed by the
--    superadmin and shown on the payment page and the token top up page.
--  * token_topups: the shop says it has paid (and how), so the team can find the payments to confirm.
-- ============================================================================

ALTER TABLE `chat_messages`
  ADD COLUMN `reply_path` VARCHAR(30) NULL,
  ADD INDEX `idx_chat_messages_path` (`institution_id`, `reply_path`, `created_at`);

CREATE TABLE IF NOT EXISTS `fast_path_settings` (
  `institution_id` INT UNSIGNED NOT NULL PRIMARY KEY,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `topics_json` JSON NOT NULL,
  `store_hours` VARCHAR(300) NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_fast_path_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `platform_payment_methods` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `kind` ENUM('qris', 'bank', 'ewallet') NOT NULL,
  `label` VARCHAR(80) NOT NULL,
  `account_name` VARCHAR(120) NULL,
  `account_number` VARCHAR(60) NULL,
  `instructions` VARCHAR(300) NULL,
  `qris_image` MEDIUMBLOB NULL,
  `qris_mime` VARCHAR(40) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` SMALLINT NOT NULL DEFAULT 100,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_platform_payment_active` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `token_topups`
  ADD COLUMN `payment_claimed_at` DATETIME NULL,
  ADD COLUMN `payment_reference` VARCHAR(160) NULL;
