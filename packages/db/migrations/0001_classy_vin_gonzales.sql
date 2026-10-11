CREATE TABLE `event_sources` (
	`event_id` text NOT NULL,
	`source_id` text NOT NULL,
	`url` text NOT NULL,
	`first_seen_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`event_id`, `source_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_sources_source_idx` ON `event_sources` (`source_id`);
--> statement-breakpoint
INSERT INTO `event_sources` (`event_id`, `source_id`, `url`, `first_seen_at`, `last_seen_at`)
SELECT `id`, `source_id`, `url`, `created_at`, `updated_at` FROM `events`;