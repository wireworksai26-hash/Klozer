ALTER TABLE `channels`
  MODIFY COLUMN `type` ENUM('whatsapp', 'whatsapp_web', 'instagram', 'messenger', 'telegram', 'webchat') NOT NULL;

ALTER TABLE `leads`
  MODIFY COLUMN `channel_type` ENUM('whatsapp', 'whatsapp_web', 'instagram', 'messenger', 'telegram', 'webchat') NOT NULL DEFAULT 'whatsapp';
