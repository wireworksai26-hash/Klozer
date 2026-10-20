-- ============================================================================
-- 017: Tasks for the team, and what AI agents may do besides talking.
--  * tasks / task_events: work for a person ("call the customer tomorrow", "check stock with the warehouse"), made by
--    staff, by an AI agent through a fixed list of actions, by a rule (hand-off, payment proof) or through the API.
--    Every change is written down. dedupe_key keeps one open task per contact and kind: it is set while a task is
--    open and cleared when it ends, and the unique key lets the database refuse a second open one.
--  * task_settings: which rules make tasks by themselves (off by default), who they go to and how soon they are due.
--  * agent_tool_calls: every action an AI agent took (what it asked for, what came of it), for review.
--  * agent_routing_logs.method gets 'tool' for a conversation an agent passed on to another agent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `tasks` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `lead_id` INT UNSIGNED NULL,
  `order_id` INT UNSIGNED NULL,
  `type` ENUM('follow_up', 'check_stock', 'call_customer', 'check_payment', 'handle_chat', 'other') NOT NULL DEFAULT 'other',
  `title` VARCHAR(160) NOT NULL,
  `note` TEXT NULL,
  `status` ENUM('open', 'in_progress', 'done', 'cancelled') NOT NULL DEFAULT 'open',
  `priority` ENUM('low', 'normal', 'high') NOT NULL DEFAULT 'normal',
  `assigned_to` INT UNSIGNED NULL,
  `due_at` DATETIME NULL,
  `source` ENUM('staff', 'ai_agent', 'rule', 'api') NOT NULL DEFAULT 'staff',
  `created_by` INT UNSIGNED NULL,
  `agent_id` INT UNSIGNED NULL,
  `dedupe_key` VARCHAR(80) NULL,
  `overdue_notified_at` DATETIME NULL,
  `completed_at` DATETIME NULL,
  `completed_by` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tasks_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tasks_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_assignee` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_completer` FOREIGN KEY (`completed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_agent` FOREIGN KEY (`agent_id`) REFERENCES `ai_agents` (`id`) ON DELETE SET NULL,
  UNIQUE KEY `uq_tasks_dedupe` (`institution_id`, `dedupe_key`),
  INDEX `idx_tasks_queue` (`institution_id`, `status`, `due_at`),
  INDEX `idx_tasks_assignee` (`institution_id`, `assigned_to`, `status`),
  INDEX `idx_tasks_lead` (`lead_id`, `status`),
  INDEX `idx_tasks_overdue` (`status`, `due_at`, `overdue_notified_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `task_events` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `task_id` INT UNSIGNED NOT NULL,
  `institution_id` INT UNSIGNED NOT NULL,
  `actor_type` ENUM('user', 'ai_agent', 'system') NOT NULL,
  `actor_user_id` INT UNSIGNED NULL,
  `actor_agent_id` INT UNSIGNED NULL,
  `event` ENUM('created', 'assigned', 'status', 'updated', 'comment', 'overdue') NOT NULL,
  `detail` VARCHAR(600) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_task_events_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  INDEX `idx_task_events_task` (`task_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `task_settings` (
  `institution_id` INT UNSIGNED NOT NULL PRIMARY KEY,
  `auto_on_handoff` TINYINT(1) NOT NULL DEFAULT 0,
  `auto_on_payment_proof` TINYINT(1) NOT NULL DEFAULT 0,
  `assign_to_chat_owner` TINYINT(1) NOT NULL DEFAULT 1,
  `default_due_minutes` INT UNSIGNED NOT NULL DEFAULT 60,
  `notify_overdue` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_task_settings_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `agent_tool_calls` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `lead_id` INT UNSIGNED NULL,
  `agent_id` INT UNSIGNED NULL,
  `tool` VARCHAR(40) NOT NULL,
  `args_json` JSON NULL,
  `result_json` JSON NULL,
  `ok` TINYINT(1) NOT NULL,
  `error` VARCHAR(240) NULL,
  `duration_ms` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tool_calls_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tool_calls_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tool_calls_agent` FOREIGN KEY (`agent_id`) REFERENCES `ai_agents` (`id`) ON DELETE SET NULL,
  INDEX `idx_tool_calls_tenant` (`institution_id`, `id`),
  INDEX `idx_tool_calls_lead` (`lead_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `agent_routing_logs`
  MODIFY COLUMN `method` ENUM('rule', 'smart', 'sticky', 'default', 'pinned', 'order', 'none', 'tool') NOT NULL;
