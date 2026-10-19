-- ============================================================================
-- 009: Knowledge base. SOPs, policies and business notes the AI reads before answering.
--  * knowledge_documents keeps the full text (so it can be edited and re-split)
--  * knowledge_chunks holds the passages the AI searches (FULLTEXT)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `knowledge_documents` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `source_type` ENUM('text', 'file') NOT NULL DEFAULT 'text',
  `file_name` VARCHAR(255) NULL,
  `mime_type` VARCHAR(80) NULL,
  `byte_size` INT UNSIGNED NOT NULL DEFAULT 0,
  `source_text` MEDIUMTEXT NOT NULL,
  `char_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `chunk_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_kdocs_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  INDEX `idx_kdocs_inst_active` (`institution_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `knowledge_chunks` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `document_id` INT UNSIGNED NOT NULL,
  `institution_id` INT UNSIGNED NOT NULL,
  `position` INT UNSIGNED NOT NULL,
  `content` TEXT NOT NULL,
  CONSTRAINT `fk_kchunks_document` FOREIGN KEY (`document_id`) REFERENCES `knowledge_documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_kchunks_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  INDEX `idx_kchunks_doc_pos` (`document_id`, `position`),
  FULLTEXT KEY `ft_kchunks_content` (`content`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
