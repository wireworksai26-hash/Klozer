-- ============================================================================
-- 012: Room for what other channels send.
--  * Messenger and Instagram message ids and customers' file addresses are much longer than WhatsApp's.
--  * wa_message_id keeps its name (it is the platform's id for any channel) but grows to 255 characters.
--  * payment_proofs.image_url holds a reference to the customer's file: a WhatsApp media id, or a CDN address.
-- ============================================================================

ALTER TABLE `chat_messages` MODIFY COLUMN `wa_message_id` VARCHAR(255) NULL;

ALTER TABLE `payment_proofs` MODIFY COLUMN `image_url` TEXT NOT NULL;
