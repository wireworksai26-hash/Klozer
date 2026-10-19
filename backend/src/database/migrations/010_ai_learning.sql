-- ============================================================================
-- 010: AI evaluation and learning.
--  * chat_messages: what the AI used for a reply (meta_json) and the owner's rating of it
--  * ai_corrections: corrected answers ("example") and standing instructions ("rule") the AI is given
--    on later replies, per tenant
-- ============================================================================

ALTER TABLE `chat_messages`
  ADD COLUMN `meta_json` JSON NULL AFTER `delivery_error`,
  ADD COLUMN `feedback` ENUM('good', 'bad') NULL AFTER `meta_json`,
  ADD COLUMN `feedback_by` INT UNSIGNED NULL AFTER `feedback`,
  ADD COLUMN `feedback_at` DATETIME NULL AFTER `feedback_by`,
  ADD INDEX `idx_chat_ai_review` (`institution_id`, `sender_type`, `feedback`, `id`);

CREATE TABLE IF NOT EXISTS `ai_corrections` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `kind` ENUM('example', 'rule') NOT NULL DEFAULT 'example',
  `message_id` BIGINT UNSIGNED NULL,
  `lead_id` INT UNSIGNED NULL,
  `customer_message` TEXT NULL,
  `original_reply` TEXT NULL,
  `corrected_reply` TEXT NULL,
  `rule_text` TEXT NULL,
  `note` VARCHAR(500) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_corrections_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_corrections_message` (`message_id`),
  INDEX `idx_corrections_inst_kind` (`institution_id`, `kind`, `is_active`),
  FULLTEXT KEY `ft_corrections_question` (`customer_message`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
