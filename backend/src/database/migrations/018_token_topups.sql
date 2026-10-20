-- ============================================================================
-- 018: Top up of AI tokens.
-- A shop asks for more tokens; the Klozer team answers with the price and how to pay; once the payment is confirmed
-- the team credits the tokens, which adds them to the shop's quota exactly once. Prices are not fixed in code: they are
-- agreed per request, so the table keeps what was quoted.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `token_topups` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `requested_by` INT UNSIGNED NULL,
  `tokens` BIGINT UNSIGNED NOT NULL,
  `note` VARCHAR(300) NULL,
  `status` ENUM('requested', 'quoted', 'credited', 'cancelled') NOT NULL DEFAULT 'requested',
  `quoted_amount_idr` DECIMAL(14, 2) NULL,
  `quote_note` VARCHAR(300) NULL,
  `quoted_by` INT UNSIGNED NULL,
  `quoted_at` DATETIME NULL,
  `credited_by` INT UNSIGNED NULL,
  `credited_at` DATETIME NULL,
  `cancelled_by` INT UNSIGNED NULL,
  `cancelled_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_topups_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_topups_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_topups_quoted_by` FOREIGN KEY (`quoted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_topups_credited_by` FOREIGN KEY (`credited_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_topups_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_topups_tenant` (`institution_id`, `id`),
  INDEX `idx_topups_queue` (`status`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
