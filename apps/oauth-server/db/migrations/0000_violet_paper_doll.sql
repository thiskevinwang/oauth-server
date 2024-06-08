CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` text NOT NULL,
	`client_secret` text,
	`redirect_uri` text,
	`name` text,
	`created_at_ms` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at_ms` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` text NOT NULL,
	`device_code` text NOT NULL,
	`user_code` text NOT NULL,
	`verification_uri` text NOT NULL,
	`verification_uri_complete` text,
	`expires_in` integer NOT NULL,
	`interval` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at_ms` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at_ms` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`client_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `key_pairs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`private_key` text NOT NULL,
	`public_key` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_at_ms` integer NOT NULL,
	`created_at_ms` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at_ms` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`client_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`created_at_ms` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at_ms` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_client_id_unique` ON `clients` (`client_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `devices_device_code_unique` ON `devices` (`device_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `devices_user_code_unique` ON `devices` (`user_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `tokens_access_token_unique` ON `tokens` (`access_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `tokens_refresh_token_unique` ON `tokens` (`refresh_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);