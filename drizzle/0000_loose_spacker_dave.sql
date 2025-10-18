CREATE TABLE `book_copies` (
	`qr_code_id` text PRIMARY KEY NOT NULL,
	`book_id` integer NOT NULL,
	`copy_number` integer NOT NULL,
	`status` text DEFAULT 'available',
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `books` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`isbn` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`author` text NOT NULL,
	`image_url` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `books_isbn_unique` ON `books` (`isbn`);--> statement-breakpoint
CREATE TABLE `loans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`qr_code_id` text NOT NULL,
	`telegram_user_id` integer NOT NULL,
	`telegram_username` text,
	`borrowed_at` integer NOT NULL,
	`due_date` integer NOT NULL,
	`returned_at` integer,
	`last_reminder_sent` integer,
	FOREIGN KEY (`qr_code_id`) REFERENCES `book_copies`(`qr_code_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_active_loans` ON `loans` (`qr_code_id`,`returned_at`);