-- 027: What owners asked the Workspace Assistant, and what it answered. Kept so the conversation survives a reload,
-- so a follow-up ("and last month?") has the previous exchange to refer to, and so the team can see how it is used.
-- Only the question, the answer and the names of the read-only queries are stored, never the rows that were read.

CREATE TABLE IF NOT EXISTS `workspace_assistant_log` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `workspace_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `question` VARCHAR(500) NOT NULL,
  `answer` TEXT NOT NULL,
  `sources_json` JSON NULL,
  `tokens` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_wslog_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wslog_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_wslog_user` (`workspace_id`, `user_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
