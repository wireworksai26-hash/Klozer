-- ============================================================================
-- 020: Platform vouchers and token grants.
-- A voucher is a discount code the Klozer team creates for its clients; it is applied to a token top up bill. The bill
-- keeps the list price, the discount and the code, so what was charged can always be explained. A grant is tokens the
-- team adds to a client directly (a gift or a correction) and is kept as a credited top up row marked is_grant.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `platform_vouchers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(30) NOT NULL,
  `description` VARCHAR(200) NULL,
  `discount_type` ENUM('percent', 'fixed') NOT NULL,
  `discount_value` DECIMAL(14, 2) NOT NULL,
  `max_discount_idr` DECIMAL(14, 2) NULL,
  `min_tokens` BIGINT UNSIGNED NULL,
  `institution_id` INT UNSIGNED NULL,
  `max_uses` INT UNSIGNED NULL,
  `per_shop_limit` INT UNSIGNED NOT NULL DEFAULT 1,
  `valid_from` DATETIME NULL,
  `valid_until` DATETIME NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_platform_vouchers_code` (`code`),
  CONSTRAINT `fk_platform_vouchers_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_platform_vouchers_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `token_topups`
  ADD COLUMN `voucher_id` INT UNSIGNED NULL AFTER `quote_note`,
  ADD COLUMN `voucher_code` VARCHAR(30) NULL AFTER `voucher_id`,
  ADD COLUMN `list_price_idr` DECIMAL(14, 2) NULL AFTER `voucher_code`,
  ADD COLUMN `discount_idr` DECIMAL(14, 2) NOT NULL DEFAULT 0 AFTER `list_price_idr`,
  ADD COLUMN `is_grant` TINYINT(1) NOT NULL DEFAULT 0 AFTER `discount_idr`,
  ADD INDEX `idx_topups_voucher` (`voucher_id`, `status`);
