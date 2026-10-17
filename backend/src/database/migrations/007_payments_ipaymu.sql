-- iPaymu replaces Midtrans as the payment gateway. Existing Midtrans rows keep their provider value.
ALTER TABLE `payments`
  MODIFY COLUMN `provider` ENUM('xendit', 'midtrans', 'oy', 'doku', 'manual', 'ipaymu') NOT NULL;
