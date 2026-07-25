CREATE TABLE IF NOT EXISTS `api_containers` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` varchar(255) NOT NULL,
	`port` int,
	`max_connections` int DEFAULT 15,
	`active` tinyint DEFAULT 1,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	`deleted_at` datetime
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `companies` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`whatsapp_lib` varchar(255) DEFAULT 'whatsapp-webjs',
	`plan_id` bigint,
	`subscription_id` bigint,
	`plan_type` enum('boleto','credito') DEFAULT 'boleto',
	`mercado_pago_subscription_id` varchar(255),
	`wab_business_id` varchar(255),
	`cnpj_cpf` bigint NOT NULL,
	`address` varchar(255),
	`address_number` varchar(255),
	`address_complement` varchar(255),
	`neighborhood` varchar(255),
	`city` varchar(255),
	`state` varchar(255),
	`country` varchar(255),
	`logo_url` varchar(255),
	`init_message` text,
	`transfer_message` varchar(255),
	`end_message` text,
	`token` varchar(255) NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	`deleted_at` datetime
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `company_subscription` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`company_id` bigint NOT NULL,
	`plan_id` bigint NOT NULL,
	`mercado_pago_subscription_id` varchar(255),
	`status` varchar(255),
	`observation_expiration_date` varchar(255),
	`card_type` varchar(255),
	`email` varchar(255),
	`last_four_digits` varchar(4),
	`next_payment_date` varchar(255) DEFAULT 'NULL',
	`created_at` datetime NOT NULL,
	`updated_at` datetime
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `contacts` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`company_id` bigint,
	`name` varchar(255) NOT NULL,
	`number` varchar(255),
	`country` varchar(255) DEFAULT 'BR',
	`ddi` varchar(255) DEFAULT '55',
	`email` varchar(255),
	`cpf` varchar(11),
	`client_company` varchar(255),
	`state` text,
	`city` text,
	`neighborhood` text,
	`street_number` bigint,
	`street_name` text,
	`zip_code` bigint,
	`address` longtext,
	`meta_id` varchar(255),
	`instagram_name` varchar(255),
	`instagram_connection` varchar(255),
	`profile_pic_url` text,
	`group_color` varchar(255),
	`group_contact` tinyint DEFAULT 0,
	`bot_enabled` tinyint NOT NULL DEFAULT 1,
	`schedule_enabled` tinyint NOT NULL DEFAULT 1,
	`queue_enabled` tinyint NOT NULL DEFAULT 1,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	`deleted_at` datetime,
	`notes` text,
	`type` varchar(255),
	`telegram_chat_id` varchar(255) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `plans` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`type` varchar(255) DEFAULT 'mensal',
	`plan_days` bigint,
	`payment_type` enum('boleto','credito') DEFAULT 'boleto',
	`mercado_pago_id` varchar(255),
	`mercado_pago_plan_url` varchar(255),
	`mercado_pago_subscription_id` varchar(255),
	`billing_day` bigint,
	`name` varchar(255) NOT NULL,
	`plan_price` decimal(15,2) NOT NULL,
	`final_price` decimal(15,2) NOT NULL,
	`wab_conversation_price` decimal(15,2),
	`user_price` decimal(15,2),
	`connection_price` decimal(15,2),
	`user_count` bigint,
	`connection_count` bigint,
	`sms_count` bigint,
	`sms_price` decimal(15,2),
	`conversation_count` bigint,
	`test_days` bigint,
	`active` tinyint NOT NULL,
	`custom` tinyint DEFAULT 0,
	`is_email` tinyint NOT NULL DEFAULT 0,
	`email_count` bigint NOT NULL,
	`email_price` decimal(15,2) NOT NULL DEFAULT '0.00',
	`velip_count` bigint NOT NULL,
	`velip_price` decimal(15,2) NOT NULL DEFAULT '0.00',
	`is_velip` tinyint NOT NULL DEFAULT 0,
	`is_sms` tinyint,
	`ia` tinyint DEFAULT 0,
	`ia_price` decimal(15,2) DEFAULT '0.00',
	`chatgpt` tinyint DEFAULT 0,
	`chatgpt_price` decimal(15,2) DEFAULT '0.00',
	`chatgpt_tokens` bigint,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	`deleted_at` datetime,
	`status` varchar(255) NOT NULL,
	`is_chatshop` tinyint NOT NULL DEFAULT 0,
	`chatshop_price` decimal(15,2) NOT NULL DEFAULT '0.00'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `schedule_message_cadence` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`schedule_message_id` bigint NOT NULL,
	`interval` bigint NOT NULL,
	`minutes` bigint,
	`hours` bigint,
	`message` text NOT NULL,
	`media_path` varchar(255),
	`is_sending` tinyint,
	`send_date` datetime,
	`job_id` varchar(255),
	`created_at` datetime NOT NULL,
	`updated_at` datetime,
	`deleted_at` datetime,
	`media_type` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `schedule_messages` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`company_id` bigint NOT NULL,
	`title` varchar(255) NOT NULL,
	`subject` text,
	`message` text NOT NULL,
	`send_date` datetime NOT NULL,
	`type` varchar(255),
	`media_path` varchar(255),
	`media_type` varchar(255),
	`audio_path` varchar(255),
	`job_id` varchar(255),
	`csv_name` varchar(255),
	`send_contacts` longtext,
	`all_contacts` boolean DEFAULT false,
	`tags` varchar(255),
	`is_running` boolean,
	`is_sending` boolean,
	`is_paused` boolean,
	`repeat` varchar(255),
	`signature` varchar(255),
	`research_id` varchar(255),
	`goodbye_message` varchar(255),
	`greetings_message` varchar(255),
	`velip_campaign_id` text,
	`velip_campaign_begin_date` datetime,
	`velip_campaign_end_date` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_DATE,
	`updated_at` datetime DEFAULT CURRENT_DATE,
	`deleted_at` datetime,
	`template_id` bigint,
	`email_color` varchar(255),
	`email_template` varchar(255),
	`cluster_name` varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `schedulemessages_contacts` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`schedule_message_id` bigint NOT NULL,
	`contact_id` bigint NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime,
	`deleted_at` datetime
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `schedulemessages_sendMessages` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`schedule_message_id` bigint NOT NULL,
	`contact_id` bigint,
	`csv_id` varchar(255),
	`number` varchar(255) NOT NULL,
	`is_sended` tinyint,
	`sended_date` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime,
	`deleted_at` datetime
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `schedulemessages_whatsapp` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`schedule_message_id` bigint NOT NULL,
	`whatsapp_id` bigint NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime,
	`deleted_at` datetime
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `statuses` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`tag` varchar(255) NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	`deleted_at` datetime,
	CONSTRAINT `tag` UNIQUE(`tag`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `templates` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`company_id` bigint NOT NULL,
	`name` varchar(255) NOT NULL,
	`meta_template_id` varchar(255) DEFAULT 'NULL',
	`created_at` datetime NOT NULL,
	`updated_at` datetime,
	`whatsapp_id` bigint NOT NULL,
	`business_id` varchar(255),
	`status` varchar(255),
	`category` varchar(255),
	`language` varchar(255),
	`header_text` text,
	`header_media_path` longtext,
	`body_text` text,
	`footer_text` text,
	`deleted_at` datetime
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `whatsapps` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`serialized_id` varchar(255),
	`auth_baileys` text,
	`type` varchar(255) DEFAULT 'whatsapp-webjs',
	`contacts_json` longtext,
	`company_id` bigint NOT NULL,
	`api_container_id` bigint,
	`answer_type` varchar(255) DEFAULT 'number',
	`name` varchar(255) NOT NULL,
	`wab_token` varchar(255),
	`session` text,
	`qrcode` text,
	`wab_business_number` varchar(2555) DEFAULT 'NULL',
	`wab_business_phonenumber_id` varchar(255),
	`wab_business_id` varchar(255),
	`status_id` bigint NOT NULL,
	`greeting_message` text,
	`battery` varchar(255),
	`plugged` tinyint,
	`default` tinyint,
	`wab_connection` tinyint DEFAULT 0,
	`insta_id` varchar(255),
	`meta_page_id` varchar(255),
	`meta_token` varchar(255),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	`deleted_at` datetime,
	`telegram_token` varchar(255),
	`telegram_bot_id` varchar(255),
	`telegram_bot_name` varchar(255) DEFAULT 'NULL',
	`groups` tinyint DEFAULT 0
);
--> statement-breakpoint
-- CREATE INDEX `company_id` ON `company_subscription` (`company_id`);--> statement-breakpoint
-- CREATE INDEX `plan_id` ON `company_subscription` (`plan_id`);--> statement-breakpoint
-- CREATE INDEX `idx_number_contacts` ON `contacts` (`number`);--> statement-breakpoint
-- CREATE INDEX `contacts_name` ON `contacts` (`name`);--> statement-breakpoint
-- CREATE INDEX `schedule_message_id` ON `schedule_message_cadence` (`schedule_message_id`);--> statement-breakpoint
-- CREATE INDEX `company_id` ON `schedule_messages` (`company_id`);--> statement-breakpoint
-- CREATE INDEX `schedule_message_id` ON `schedulemessages_contacts` (`schedule_message_id`);--> statement-breakpoint
-- CREATE INDEX `contact_id` ON `schedulemessages_contacts` (`contact_id`);--> statement-breakpoint
-- CREATE INDEX `schedule_message_id` ON `schedulemessages_sendMessages` (`schedule_message_id`);--> statement-breakpoint
-- CREATE INDEX `contact_id` ON `schedulemessages_sendMessages` (`contact_id`);--> statement-breakpoint
-- CREATE INDEX `schedule_message_id` ON `schedulemessages_whatsapp` (`schedule_message_id`);--> statement-breakpoint
-- CREATE INDEX `whatsapp_id` ON `schedulemessages_whatsapp` (`whatsapp_id`);--> statement-breakpoint
-- CREATE INDEX `company_id` ON `templates` (`company_id`);--> statement-breakpoint
-- CREATE INDEX `company_id` ON `whatsapps` (`company_id`);--> statement-breakpoint
-- CREATE INDEX `status_id` ON `whatsapps` (`status_id`);--> statement-breakpoint
-- CREATE INDEX `idx_serialized_id_whatsapps` ON `whatsapps` (`serialized_id`);--> statement-breakpoint
-- ALTER TABLE `companies` ADD CONSTRAINT `companies_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
-- ALTER TABLE `companies` ADD CONSTRAINT `companies_subscription_id_company_subscription_id_fk` FOREIGN KEY (`subscription_id`) REFERENCES `company_subscription`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
-- ALTER TABLE `company_subscription` ADD CONSTRAINT `company_subscription_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
-- ALTER TABLE `company_subscription` ADD CONSTRAINT `company_subscription_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
-- ALTER TABLE `contacts` ADD CONSTRAINT `contacts_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
-- ALTER TABLE `schedule_message_cadence` ADD CONSTRAINT `schedule_message_cadence_schedule_message_id_schedule_messages_id_fk` FOREIGN KEY (`schedule_message_id`) REFERENCES `schedule_messages`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
-- ALTER TABLE `schedule_messages` ADD CONSTRAINT `schedule_messages_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
-- ALTER TABLE `schedule_messages` ADD CONSTRAINT `schedule_messages_template_id_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
-- ALTER TABLE `schedulemessages_contacts` ADD CONSTRAINT `schedulemessages_contacts_schedule_message_id_schedule_messages_id_fk` FOREIGN KEY (`schedule_message_id`) REFERENCES `schedule_messages`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
-- ALTER TABLE `schedulemessages_contacts` ADD CONSTRAINT `schedulemessages_contacts_contact_id_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
-- ALTER TABLE `schedulemessages_sendMessages` ADD CONSTRAINT `schedulemessages_sendMessages_schedule_message_id_schedule_messages_id_fk` FOREIGN KEY (`schedule_message_id`) REFERENCES `schedule_messages`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
-- ALTER TABLE `schedulemessages_sendMessages` ADD CONSTRAINT `schedulemessages_sendMessages_contact_id_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
-- ALTER TABLE `schedulemessages_whatsapp` ADD CONSTRAINT `schedulemessages_whatsapp_schedule_message_id_schedule_messages_id_fk` FOREIGN KEY (`schedule_message_id`) REFERENCES `schedule_messages`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
-- ALTER TABLE `schedulemessages_whatsapp` ADD CONSTRAINT `schedulemessages_whatsapp_whatsapp_id_whatsapps_id_fk` FOREIGN KEY (`whatsapp_id`) REFERENCES `whatsapps`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
-- ALTER TABLE `templates` ADD CONSTRAINT `templates_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
-- ALTER TABLE `templates` ADD CONSTRAINT `templates_whatsapp_id_whatsapps_id_fk` FOREIGN KEY (`whatsapp_id`) REFERENCES `whatsapps`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
-- ALTER TABLE `whatsapps` ADD CONSTRAINT `whatsapps_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
-- ALTER TABLE `whatsapps` ADD CONSTRAINT `whatsapps_api_container_id_api_containers_id_fk` FOREIGN KEY (`api_container_id`) REFERENCES `api_containers`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
-- ALTER TABLE `whatsapps` ADD CONSTRAINT `whatsapps_status_id_statuses_id_fk` FOREIGN KEY (`status_id`) REFERENCES `statuses`(`id`) ON DELETE restrict ON UPDATE restrict;
