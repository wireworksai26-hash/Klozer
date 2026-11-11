-- 026: Workspaces and CRM segments.
-- A workspace groups the businesses (institutions) of one owner. Every request still reads exactly one business: the
-- owner switches between the businesses of the workspace, and each business keeps its own owner account, so no data
-- of one business is ever readable through another business's session. A workspace-level view (overview, joined contacts,
-- assistant) reads the member businesses for an owner of that workspace, and only reads.

CREATE TABLE IF NOT EXISTS `workspaces` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  -- The Klozer team switches the assistant on for the workspaces that need it, with an optional monthly token ceiling.
  `assistant_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `assistant_monthly_token_cap` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `institutions`
  ADD COLUMN `workspace_id` INT UNSIGNED NULL,
  ADD INDEX `idx_institutions_workspace` (`workspace_id`),
  ADD CONSTRAINT `fk_institutions_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE SET NULL;

-- A saved filter over a business's contacts ("bought before, not for 60 days").
CREATE TABLE IF NOT EXISTS `crm_segments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `filters_json` JSON NOT NULL,
  `created_by` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_segments_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_segments_name` (`institution_id`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
