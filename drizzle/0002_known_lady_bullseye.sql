CREATE TABLE `locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `book_copies` ADD `location_id` integer NOT NULL REFERENCES locations(id);
--> statement-breakpoint
INSERT INTO `locations` (`id`, `name`) VALUES (1, 'Saga') ON CONFLICT(`id`) DO NOTHING;
--> statement-breakpoint
INSERT INTO `locations` (`id`, `name`) VALUES (2, 'Elm') ON CONFLICT(`id`) DO NOTHING;
--> statement-breakpoint
INSERT INTO `locations` (`id`, `name`) VALUES (3, 'Cendana') ON CONFLICT(`id`) DO NOTHING;
