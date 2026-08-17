CREATE TABLE `responses` (
	`id` text PRIMARY KEY NOT NULL,
	`condition` text NOT NULL,
	`product` text NOT NULL,
	`ai_disclosure` integer NOT NULL,
	`pilot` integer DEFAULT false NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`duration_seconds` integer,
	`attention_passed` integer,
	`manipulation_passed` integer,
	`answers_json` text DEFAULT '{}' NOT NULL
);
