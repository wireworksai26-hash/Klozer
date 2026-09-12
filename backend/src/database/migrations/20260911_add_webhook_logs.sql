-- ============================================================================
-- KLOZER MIGRATION: WEBHOOK LOGS & IDEMPOTENCY SAFETY
-- Multi-Tenant Fintech Security Guard
-- ============================================================================

CREATE TABLE IF NOT EXISTS `webhook_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NULL,
  `idempotency_key` VARCHAR(150) NOT NULL UNIQUE,
  `provider` VARCHAR(50) NOT NULL DEFAULT 'midtrans',
  `event_type` VARCHAR(100) NOT NULL DEFAULT 'payment.settlement',
  `payload_json` JSON NOT NULL,
  `status` ENUM('PENDING', 'PROCESSED', 'FAILED', 'DUPLICATE') NOT NULL DEFAULT 'PENDING',
  `result_json` JSON NULL,
  `error_message` TEXT NULL,
  `processed_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_webhook_inst_status` (`institution_id`, `status`),
  INDEX `idx_webhook_idempotency` (`idempotency_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- WhatsApp Heartbeat / Session Health Logs
CREATE TABLE IF NOT EXISTS `whatsapp_session_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `session_status` ENUM('connected', 'connecting', 'disconnected', 'banned') NOT NULL DEFAULT 'disconnected',
  `phone_number` VARCHAR(30) NULL,
  `battery_level` INT NULL,
  `last_seen_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `alert_sent` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_wa_session_inst` (`institution_id`, `session_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
