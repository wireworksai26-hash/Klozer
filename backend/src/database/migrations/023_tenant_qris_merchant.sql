-- 023: A tenant's own static QRIS merchant (for example GoPay Merchant).
-- A bank_accounts row with qris_image is a QRIS destination, not a bank transfer. The picture is what the customer
-- scans; the account number/name fields hold the merchant id and merchant name shown to staff.

ALTER TABLE `bank_accounts`
  ADD COLUMN `qris_image` MEDIUMBLOB NULL AFTER `transfer_instruction`,
  ADD COLUMN `qris_mime` VARCHAR(40) NULL AFTER `qris_image`,
  ADD COLUMN `qris_payload` VARCHAR(700) NULL AFTER `qris_mime`;
