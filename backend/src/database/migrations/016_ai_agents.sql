-- ============================================================================
-- 016: Several AI agents per tenant, and the routing between them.
--  * ai_agents: a role (sales, support, general...) with its own instructions, persona, knowledge and the situations
--    it is meant for.
--  * ai_agent_knowledge: which documents an agent may read (none listed = all of the tenant's documents).
--  * agent_settings: how the choice of agent is made for the tenant.
--  * agent_routing_logs: why each switch happened (reviewable, and the basis for tuning the rules).
--  * leads.ai_agent_id / ai_agent_pinned: who is handling a conversation, and whether staff fixed it.
--  * chat_messages.ai_agent_id: which agent wrote a reply (evaluation per agent).
-- A tenant with no agents behaves exactly as before.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `ai_agents` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `description` VARCHAR(300) NOT NULL,
  `instructions` TEXT NOT NULL,
  `bot_name` VARCHAR(60) NULL,
  `tone` VARCHAR(200) NULL,
  `greeting` VARCHAR(300) NULL,
  `capabilities_json` JSON NOT NULL,
  `triggers_json` JSON NOT NULL,
  `priority` SMALLINT NOT NULL DEFAULT 100,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ai_agents_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_ai_agents_name` (`institution_id`, `name`),
  INDEX `idx_ai_agents_active` (`institution_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai_agent_knowledge` (
  `agent_id` INT UNSIGNED NOT NULL,
  `document_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`agent_id`, `document_id`),
  CONSTRAINT `fk_agent_knowledge_agent` FOREIGN KEY (`agent_id`) REFERENCES `ai_agents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_agent_knowledge_document` FOREIGN KEY (`document_id`) REFERENCES `knowledge_documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `agent_settings` (
  `institution_id` INT UNSIGNED NOT NULL PRIMARY KEY,
  `router_mode` ENUM('rules', 'smart') NOT NULL DEFAULT 'rules',
  `switch_confidence` TINYINT UNSIGNED NOT NULL DEFAULT 70,
  `announce_switch` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_agent_settings_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `agent_routing_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `lead_id` INT UNSIGNED NOT NULL,
  `from_agent_id` INT UNSIGNED NULL,
  `to_agent_id` INT UNSIGNED NULL,
  `method` ENUM('rule', 'smart', 'sticky', 'default', 'pinned', 'order', 'none') NOT NULL,
  `reason` VARCHAR(200) NOT NULL,
  `confidence` TINYINT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_routing_logs_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_routing_logs_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  INDEX `idx_routing_logs_tenant` (`institution_id`, `id`),
  INDEX `idx_routing_logs_lead` (`lead_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `leads`
  ADD COLUMN `ai_agent_id` INT UNSIGNED NULL,
  ADD COLUMN `ai_agent_pinned` TINYINT(1) NOT NULL DEFAULT 0,
  ADD CONSTRAINT `fk_leads_ai_agent` FOREIGN KEY (`ai_agent_id`) REFERENCES `ai_agents` (`id`) ON DELETE SET NULL;

ALTER TABLE `chat_messages`
  ADD COLUMN `ai_agent_id` INT UNSIGNED NULL,
  ADD INDEX `idx_chat_messages_agent` (`ai_agent_id`, `created_at`);
