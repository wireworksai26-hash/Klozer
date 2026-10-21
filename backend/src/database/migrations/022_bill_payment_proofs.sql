-- ============================================================================
-- 022: Proof of payment on Klozer's own bills.
-- After paying a token top up or a package bill, the shop can upload a picture of the transfer proof. The team sees it
-- next to the bill, the payment notices and the history, so what was paid can be checked and the money followed. A picture's
-- hash is kept so the same screenshot used on another bill can be spotted.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `platform_payment_proofs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ref_type` ENUM('topup', 'order') NOT NULL,
  `ref_id` INT UNSIGNED NOT NULL,
  `institution_id` INT UNSIGNED NOT NULL,
  `uploaded_by` INT UNSIGNED NULL,
  `file` MEDIUMBLOB NOT NULL,
  `mime` VARCHAR(40) NOT NULL,
  `size_bytes` INT UNSIGNED NOT NULL,
  `sha256` CHAR(64) NOT NULL,
  `note` VARCHAR(300) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_platform_proofs_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_platform_proofs_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_platform_proofs_bill` (`ref_type`, `ref_id`),
  INDEX `idx_platform_proofs_hash` (`sha256`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
