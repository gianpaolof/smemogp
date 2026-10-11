CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`starts_at` integer NOT NULL,
	`ends_at` integer,
	`all_day` integer DEFAULT false NOT NULL,
	`venue_name` text,
	`address` text,
	`city` text,
	`lat` real,
	`lng` real,
	`category` text DEFAULT 'altro' NOT NULL,
	`price_text` text,
	`image_url` text,
	`url` text NOT NULL,
	`source_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_starts_at_idx` ON `events` (`starts_at`);--> statement-breakpoint
CREATE INDEX `events_lat_lng_idx` ON `events` (`lat`,`lng`);--> statement-breakpoint
CREATE INDEX `events_source_idx` ON `events` (`source_id`);--> statement-breakpoint
CREATE TABLE `geocache` (
	`query` text PRIMARY KEY NOT NULL,
	`lat` real,
	`lng` real,
	`display_name` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_runs` (
	`source_id` text PRIMARY KEY NOT NULL,
	`last_run_at` integer,
	`last_status` text,
	`last_error` text,
	`content_hash` text,
	`events_found` integer
);
