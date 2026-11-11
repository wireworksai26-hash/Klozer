-- 025: Forgotten-password requests. Someone who cannot sign in asks from the login page; the Klozer team sees the
-- request at once (a notice in the dashboard) and handles it by giving the person a new password. No link or code is
-- ever emailed, so nothing here can be used to take over an account without a team member's decision.

CREATE TABLE IF NOT EXISTS `password_reset_requests` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `institution_id` INT UNSIGNED NOT NULL,
  `email` VARCHAR(120) NOT NULL,
  `status` ENUM('pending', 'handled', 'dismissed') NOT NULL DEFAULT 'pending',
  `requested_ip` VARCHAR(64) NULL,
  `handled_by` INT UNSIGNED NULL,
  `handled_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_pwreset_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_pwreset_status` (`status`, `created_at`),
  INDEX `idx_pwreset_user` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
