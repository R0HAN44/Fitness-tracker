CREATE TABLE IF NOT EXISTS `body_measurement_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`measurement_id` text NOT NULL,
	`value` real NOT NULL,
	`measured_at` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`measurement_id`) REFERENCES `body_measurements`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_bme_measurement_id` ON `body_measurement_entries` (`measurement_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_bme_measured_at` ON `body_measurement_entries` (`measured_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `body_measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`is_builtin` integer DEFAULT false NOT NULL,
	`sort_order` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `exercise_personal_records` (
	`id` text PRIMARY KEY NOT NULL,
	`exercise_id` text NOT NULL,
	`record_type` text NOT NULL,
	`value` real NOT NULL,
	`weight_kg` real,
	`workout_set_id` text NOT NULL,
	`is_current` integer DEFAULT true NOT NULL,
	`achieved_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workout_set_id`) REFERENCES `workout_sets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_pr_exercise_id` ON `exercise_personal_records` (`exercise_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_pr_exercise_type` ON `exercise_personal_records` (`exercise_id`,`record_type`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_pr_is_current` ON `exercise_personal_records` (`exercise_id`,`is_current`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`primary_muscle` text NOT NULL,
	`secondary_muscles` text,
	`equipment` text NOT NULL,
	`exercise_type` text NOT NULL,
	`notes` text,
	`is_custom` integer DEFAULT false NOT NULL,
	`default_rest_seconds` integer,
	`sort_order` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_exercises_slug` ON `exercises` (`slug`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_exercises_primary_muscle` ON `exercises` (`primary_muscle`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_exercises_equipment` ON `exercises` (`equipment`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_exercises_name` ON `exercises` (`name`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_exercises_deleted_at` ON `exercises` (`deleted_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `progress_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`taken_at` text NOT NULL,
	`label` text,
	`notes` text,
	`workout_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `routine_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`rest_seconds` integer,
	`superset_group_id` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`superset_group_id`) REFERENCES `superset_groups`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `routine_folders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `routine_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_exercise_id` text NOT NULL,
	`set_index` integer NOT NULL,
	`set_type` text DEFAULT 'normal' NOT NULL,
	`target_weight_kg` real,
	`target_reps` integer,
	`target_duration_seconds` real,
	`target_distance_meters` real,
	`target_rpe` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`routine_exercise_id`) REFERENCES `routine_exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `routines` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`folder_id` text,
	`notes` text,
	`is_preset` integer DEFAULT false NOT NULL,
	`sort_order` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`folder_id`) REFERENCES `routine_folders`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`weight_unit` text DEFAULT 'kg' NOT NULL,
	`length_unit` text DEFAULT 'cm' NOT NULL,
	`week_start` integer DEFAULT 1 NOT NULL,
	`default_rest_seconds` integer DEFAULT 90 NOT NULL,
	`barbell_weight_kg` real DEFAULT 20 NOT NULL,
	`available_plates_kg` text DEFAULT '[25,20,15,10,5,2.5,1.25]' NOT NULL,
	`haptics_enabled` integer DEFAULT true NOT NULL,
	`sound_enabled` integer DEFAULT true NOT NULL,
	`palette_id` text DEFAULT 'volt' NOT NULL,
	`appearance_mode` text DEFAULT 'dark' NOT NULL,
	`custom_accent` text,
	`weekly_workout_goal` integer DEFAULT 4 NOT NULL,
	`app_lock_enabled` integer DEFAULT false NOT NULL,
	`auto_backup_reminder_days` integer DEFAULT 14 NOT NULL,
	`last_backup_at` text,
	`backup_schema_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `superset_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text,
	`routine_id` text,
	`label` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workout_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`superset_group_id` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`superset_group_id`) REFERENCES `superset_groups`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_we_workout_id` ON `workout_exercises` (`workout_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_we_exercise_id` ON `workout_exercises` (`exercise_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_we_exercise_workout` ON `workout_exercises` (`exercise_id`,`workout_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workout_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_exercise_id` text NOT NULL,
	`set_index` integer NOT NULL,
	`set_type` text DEFAULT 'normal' NOT NULL,
	`weight_kg` real,
	`reps` integer,
	`duration_seconds` real,
	`distance_meters` real,
	`rpe` real,
	`is_completed` integer DEFAULT false NOT NULL,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`workout_exercise_id`) REFERENCES `workout_exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ws_workout_exercise_id` ON `workout_sets` (`workout_exercise_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ws_completed` ON `workout_sets` (`is_completed`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`started_at` text NOT NULL,
	`finished_at` text,
	`duration_seconds` integer,
	`notes` text,
	`total_volume_kg` real,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`routine_id` text,
	`import_source` text,
	`import_hash` text,
	`tz_offset_minutes` integer,
	`rest_started_at` text,
	`rest_duration_seconds` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_workouts_started_at` ON `workouts` (`started_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_workouts_status` ON `workouts` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_workouts_deleted_at` ON `workouts` (`deleted_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_workouts_import_hash` ON `workouts` (`import_hash`);