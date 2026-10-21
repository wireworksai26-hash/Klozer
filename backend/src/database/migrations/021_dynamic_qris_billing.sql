-- ============================================================================
-- 021: Dynamic QRIS and package purchases.
--  * the merchant's QRIS code text is kept on the QRIS payment method, so a code with the exact amount can be made per bill
--  * a bill carries the amount to pay: the price plus a small unique number (kode unik), so a payment can be matched to
--    exactly one open bill
--  * platform_orders: a shop buying a package (plan and period); paying it activates the plan, features and tokens
--  * platform_pay_amounts: the amounts open bills are waiting for, one row each (unique), which is what makes the match safe
--  * platform_payment_notifications: every payment notice received from outside (bank, e-wallet or a forwarder), and what
--    it was matched to
-- ============================================================================

ALTER TABLE `platform_payment_methods`
  ADD COLUMN `qris_payload` VARCHAR(700) NULL AFTER `qris_mime`;

ALTER TABLE `token_topups`
  ADD COLUMN `pay_amount_idr` DECIMAL(14, 2) NULL AFTER `discount_idr`,
  ADD COLUMN `unique_code` SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER `pay_amount_idr`,
  ADD COLUMN `paid_via` ENUM('auto', 'manual') NULL AFTER `unique_code`;

CREATE TABLE IF NOT EXISTS `platform_orders` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `requested_by` INT UNSIGNED NULL,
  `plan` ENUM('starter', 'pro') NOT NULL,
  `period` ENUM('monthly', 'annual') NOT NULL,
  `months` TINYINT UNSIGNED NOT NULL,
  `list_price_idr` DECIMAL(14, 2) NOT NULL,
  `discount_idr` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  `base_amount_idr` DECIMAL(14, 2) NOT NULL,
  `unique_code` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `pay_amount_idr` DECIMAL(14, 2) NULL,
  `status` ENUM('pending', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
  `expires_at` DATETIME NOT NULL,
  `payment_claimed_at` DATETIME NULL,
  `payment_reference` VARCHAR(300) NULL,
  `paid_at` DATETIME NULL,
  `paid_via` ENUM('auto', 'manual') NULL,
  `paid_by` INT UNSIGNED NULL,
  `activated_until` DATETIME NULL,
  `tokens_granted` BIGINT UNSIGNED NULL,
  `cancelled_at` DATETIME NULL,
  `cancelled_by` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_platform_orders_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_platform_orders_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_platform_orders_paid_by` FOREIGN KEY (`paid_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_platform_orders_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_platform_orders_tenant` (`institution_id`, `id`),
  INDEX `idx_platform_orders_queue` (`status`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `platform_pay_amounts` (
  `amount` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  `ref_type` ENUM('topup', 'order') NOT NULL,
  `ref_id` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_platform_pay_amounts_ref` (`ref_type`, `ref_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `platform_payment_notifications` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `amount_idr` DECIMAL(14, 2) NOT NULL,
  `reference` VARCHAR(80) NULL,
  `source` VARCHAR(40) NULL,
  `payer` VARCHAR(120) NULL,
  `status` ENUM('matched', 'unmatched', 'failed') NOT NULL,
  `matched_type` ENUM('topup', 'order') NULL,
  `matched_id` INT UNSIGNED NULL,
  `institution_id` INT UNSIGNED NULL,
  `note` VARCHAR(300) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_platform_payment_notifications_reference` (`reference`),
  INDEX `idx_platform_payment_notifications_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
