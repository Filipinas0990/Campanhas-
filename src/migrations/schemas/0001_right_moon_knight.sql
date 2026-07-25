CREATE TABLE IF NOT EXISTS `schedule_message_csv` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`schedule_message_id` bigint NOT NULL,
	`name` varchar(255),
	`number` varchar(255),
	`created_at` date NOT NULL,
	`updated_at` date,
	`deleted_at` date
);
--> statement-breakpoint
-- ALTER TABLE `api_containers` MODIFY COLUMN `created_at` date NOT NULL;--> statement-breakpoint
-- ALTER TABLE `api_containers` MODIFY COLUMN `updated_at` date NOT NULL;--> statement-breakpoint
-- ALTER TABLE `api_containers` MODIFY COLUMN `deleted_at` date;--> statement-breakpoint
-- ALTER TABLE `schedule_message_cadence` MODIFY COLUMN `is_sending` boolean;--> statement-breakpoint
-- ALTER TABLE `schedule_message_cadence` MODIFY COLUMN `send_date` date;--> statement-breakpoint
-- ALTER TABLE `schedule_messages` MODIFY COLUMN `send_date` date NOT NULL;--> statement-breakpoint
-- ALTER TABLE `schedulemessages_whatsapp` MODIFY COLUMN `created_at` date;--> statement-breakpoint
-- ALTER TABLE `schedulemessages_whatsapp` MODIFY COLUMN `updated_at` date;--> statement-breakpoint
-- ALTER TABLE `schedulemessages_whatsapp` MODIFY COLUMN `deleted_at` date;--> statement-breakpoint
-- ALTER TABLE `whatsapps` MODIFY COLUMN `plugged` boolean;--> statement-breakpoint
-- ALTER TABLE `whatsapps` MODIFY COLUMN `default` boolean;--> statement-breakpoint
-- ALTER TABLE `whatsapps` MODIFY COLUMN `wab_connection` boolean;--> statement-breakpoint
-- ALTER TABLE `whatsapps` MODIFY COLUMN `wab_connection` boolean DEFAULT false;--> statement-breakpoint
-- CREATE INDEX `schedule_message_id` ON `schedule_message_csv` (`schedule_message_id`);--> statement-breakpoint
-- ALTER TABLE `schedule_message_csv` ADD CONSTRAINT `schedule_message_csv_schedule_message_id_schedule_messages_id_fk` FOREIGN KEY (`schedule_message_id`) REFERENCES `schedule_messages`(`id`) ON DELETE restrict ON UPDATE restrict;
