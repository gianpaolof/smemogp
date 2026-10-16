CREATE TABLE `deleted_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` text NOT NULL,
	`reason` text NOT NULL,
	`payload` text NOT NULL,
	`deleted_at` integer DEFAULT (unixepoch()) NOT NULL
);
