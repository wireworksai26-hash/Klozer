-- ============================================================================
-- 004: columns the dashboard needs so nothing it edits is silently dropped
-- ============================================================================

ALTER TABLE `leads`
  MODIFY COLUMN `source` VARCHAR(80) NOT NULL DEFAULT 'manual',
  ADD COLUMN `interest` VARCHAR(150) NULL AFTER `source`,
  ADD COLUMN `est_value` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 AFTER `interest`,
  ADD COLUMN `notes` TEXT NULL AFTER `est_value`;

ALTER TABLE `users`
  ADD COLUMN `permissions_json` JSON NULL AFTER `commission_flat_idr`;
