-- 024: A delivery PIC (the person who takes an order to the customer) and a manual VIP mark on contacts.
-- pic_delivery is a staff role with its own login. A manager hands an order to a PIC; the PIC sees only the deliveries
-- given to them, takes the order, and closes it as delivered or failed. The row also records whether the PIC was told
-- (in the dashboard and on their phone) so a manager can see when a notice did not arrive.

ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('superadmin', 'supervisor', 'owner', 'finance', 'cs', 'pic_warehouse', 'pic_delivery') NOT NULL DEFAULT 'cs';

ALTER TABLE `leads`
  ADD COLUMN `is_vip` TINYINT(1) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS `deliveries` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `order_id` INT UNSIGNED NOT NULL,
  `pic_user_id` INT UNSIGNED NOT NULL,
  `assigned_by` INT UNSIGNED NULL,
  `status` ENUM('assigned', 'picked_up', 'delivered', 'failed', 'cancelled') NOT NULL DEFAULT 'assigned',
  `recipient_name` VARCHAR(150) NULL,
  `recipient_phone` VARCHAR(30) NULL,
  `address_text` TEXT NULL,
  `manager_note` VARCHAR(500) NULL,
  `result_note` VARCHAR(500) NULL,
  `notify_status` ENUM('pending', 'sent', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
  `notify_detail` VARCHAR(200) NULL,
  `notified_at` DATETIME NULL,
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `picked_up_at` DATETIME NULL,
  `finished_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_deliveries_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_deliveries_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_deliveries_pic` FOREIGN KEY (`pic_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_deliveries_assigner` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_deliveries_pic` (`institution_id`, `pic_user_id`, `status`),
  INDEX `idx_deliveries_order` (`order_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
