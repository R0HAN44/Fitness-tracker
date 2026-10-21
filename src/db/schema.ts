/**
 * Ironlog database schema — Drizzle ORM definitions for expo-sqlite.
 *
 * Design decisions:
 * - All PKs are TEXT (UUIDs) for future cloud sync.
 * - All tables include created_at, updated_at, deleted_at (soft delete).
 * - Weights stored in kg internally; converted at display time.
 * - PRAGMA foreign_keys = ON enforced at connection time.
 * - Built-in exercises use deterministic IDs derived from slug.
 * - exercise_personal_records is append-only with is_current flag.
 * - superset_groups shared between workouts and routines.
 */

import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ────────────────────────────────────────────────────────────────────
// Exercise types enum
// ────────────────────────────────────────────────────────────────────

export const EXERCISE_TYPES = [
  'weight_reps',
  'bodyweight_reps',
  'weighted_bodyweight',
  'assisted_bodyweight',
  'duration',
  'distance_duration',
  'weight_duration',
] as const;

export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const SET_TYPES = ['normal', 'warmup', 'drop', 'failure'] as const;
export type SetType = (typeof SET_TYPES)[number];

export const WORKOUT_STATUSES = ['in_progress', 'completed', 'discarded'] as const;
export type WorkoutStatus = (typeof WORKOUT_STATUSES)[number];

export const PR_TYPES = ['max_weight', 'best_1rm', 'best_set_volume', 'max_reps_at_weight'] as const;
export type PrType = (typeof PR_TYPES)[number];

// ────────────────────────────────────────────────────────────────────
// Exercises
// ────────────────────────────────────────────────────────────────────

export const exercises = sqliteTable(
  'exercises',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    primaryMuscle: text('primary_muscle').notNull(),
    secondaryMuscles: text('secondary_muscles'), // JSON array
    equipment: text('equipment').notNull(),
    exerciseType: text('exercise_type').notNull(),
    notes: text('notes'),
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
    defaultRestSeconds: integer('default_rest_seconds'),
    sortOrder: integer('sort_order'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    uniqueIndex('idx_exercises_slug').on(table.slug),
    index('idx_exercises_primary_muscle').on(table.primaryMuscle),
    index('idx_exercises_equipment').on(table.equipment),
    index('idx_exercises_name').on(table.name),
    index('idx_exercises_deleted_at').on(table.deletedAt),
  ],
);

// ────────────────────────────────────────────────────────────────────
// Workouts
// ────────────────────────────────────────────────────────────────────

export const workouts = sqliteTable(
  'workouts',
  {
    id: text('id').primaryKey(),
    title: text('title'),
    startedAt: text('started_at').notNull(),
    finishedAt: text('finished_at'),
    durationSeconds: integer('duration_seconds'),
    notes: text('notes'),
    totalVolumeKg: real('total_volume_kg'),
    status: text('status').notNull().default('in_progress'),
    routineId: text('routine_id').references(() => routines.id, { onDelete: 'set null' }),
    importSource: text('import_source'),       // e.g. 'hevy_csv', 'strong_csv', 'ironlog_json'
    importHash: text('import_hash'),           // hash of imported row for dedup
    tzOffsetMinutes: integer('tz_offset_minutes'), // timezone offset at workout start
    restStartedAt: text('rest_started_at'),    // ISO-8601 when rest timer started (for crash recovery)
    restDurationSeconds: integer('rest_duration_seconds'), // configured rest duration at crash time
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    index('idx_workouts_started_at').on(table.startedAt),
    index('idx_workouts_status').on(table.status),
    index('idx_workouts_deleted_at').on(table.deletedAt),
    index('idx_workouts_import_hash').on(table.importHash),
  ],
);

// ────────────────────────────────────────────────────────────────────
// Superset groups (shared between workouts and routines)
// ────────────────────────────────────────────────────────────────────

export const supersetGroups = sqliteTable(
  'superset_groups',
  {
    id: text('id').primaryKey(),
    workoutId: text('workout_id').references(() => workouts.id, { onDelete: 'cascade' }),
    routineId: text('routine_id').references(() => routines.id, { onDelete: 'cascade' }),
    label: text('label'), // A, B, C…
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
);

// ────────────────────────────────────────────────────────────────────
// Workout exercises
// ────────────────────────────────────────────────────────────────────

export const workoutExercises = sqliteTable(
  'workout_exercises',
  {
    id: text('id').primaryKey(),
    workoutId: text('workout_id').notNull().references(() => workouts.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id').notNull().references(() => exercises.id, { onDelete: 'restrict' }),
    sortOrder: integer('sort_order').notNull(),
    supersetGroupId: text('superset_group_id').references(() => supersetGroups.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    index('idx_we_workout_id').on(table.workoutId),
    index('idx_we_exercise_id').on(table.exerciseId),
    index('idx_we_exercise_workout').on(table.exerciseId, table.workoutId),
  ],
);

// ────────────────────────────────────────────────────────────────────
// Workout sets
// ────────────────────────────────────────────────────────────────────

export const workoutSets = sqliteTable(
  'workout_sets',
  {
    id: text('id').primaryKey(),
    workoutExerciseId: text('workout_exercise_id').notNull().references(() => workoutExercises.id, { onDelete: 'cascade' }),
    setIndex: integer('set_index').notNull(),
    setType: text('set_type').notNull().default('normal'),
    weightKg: real('weight_kg'),
    reps: integer('reps'),
    durationSeconds: real('duration_seconds'),
    distanceMeters: real('distance_meters'),
    rpe: real('rpe'),
    isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
    completedAt: text('completed_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    index('idx_ws_workout_exercise_id').on(table.workoutExerciseId),
    index('idx_ws_completed').on(table.isCompleted),
  ],
);

// ────────────────────────────────────────────────────────────────────
// Exercise personal records (append-only with is_current flag)
// ────────────────────────────────────────────────────────────────────

export const exercisePersonalRecords = sqliteTable(
  'exercise_personal_records',
  {
    id: text('id').primaryKey(),
    exerciseId: text('exercise_id').notNull().references(() => exercises.id, { onDelete: 'cascade' }),
    recordType: text('record_type').notNull(), // max_weight, best_1rm, best_set_volume, max_reps_at_weight
    value: real('value').notNull(),
    weightKg: real('weight_kg'), // context: weight used (for max_reps_at_weight)
    workoutSetId: text('workout_set_id').notNull().references(() => workoutSets.id, { onDelete: 'cascade' }),
    isCurrent: integer('is_current', { mode: 'boolean' }).notNull().default(true),
    achievedAt: text('achieved_at').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    index('idx_pr_exercise_id').on(table.exerciseId),
    index('idx_pr_exercise_type').on(table.exerciseId, table.recordType),
    index('idx_pr_is_current').on(table.exerciseId, table.isCurrent),
  ],
);

// ────────────────────────────────────────────────────────────────────
// Routine folders
// ────────────────────────────────────────────────────────────────────

export const routineFolders = sqliteTable(
  'routine_folders',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    sortOrder: integer('sort_order'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
);

// ────────────────────────────────────────────────────────────────────
// Routines
// ────────────────────────────────────────────────────────────────────

export const routines = sqliteTable(
  'routines',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    folderId: text('folder_id').references(() => routineFolders.id, { onDelete: 'set null' }),
    notes: text('notes'),
    isPreset: integer('is_preset', { mode: 'boolean' }).notNull().default(false),
    sortOrder: integer('sort_order'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
);

// ────────────────────────────────────────────────────────────────────
// Routine exercises
// ────────────────────────────────────────────────────────────────────

export const routineExercises = sqliteTable(
  'routine_exercises',
  {
    id: text('id').primaryKey(),
    routineId: text('routine_id').notNull().references(() => routines.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id').notNull().references(() => exercises.id, { onDelete: 'restrict' }),
    sortOrder: integer('sort_order').notNull(),
    restSeconds: integer('rest_seconds'),
    supersetGroupId: text('superset_group_id').references(() => supersetGroups.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
);

// ────────────────────────────────────────────────────────────────────
// Routine sets (templates)
// ────────────────────────────────────────────────────────────────────

export const routineSets = sqliteTable(
  'routine_sets',
  {
    id: text('id').primaryKey(),
    routineExerciseId: text('routine_exercise_id').notNull().references(() => routineExercises.id, { onDelete: 'cascade' }),
    setIndex: integer('set_index').notNull(),
    setType: text('set_type').notNull().default('normal'),
    targetWeightKg: real('target_weight_kg'),
    targetReps: integer('target_reps'),
    targetDurationSeconds: real('target_duration_seconds'),
    targetDistanceMeters: real('target_distance_meters'),
    targetRpe: real('target_rpe'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
);

// ────────────────────────────────────────────────────────────────────
// Body measurements (definition of trackable metrics)
// ────────────────────────────────────────────────────────────────────

export const bodyMeasurements = sqliteTable(
  'body_measurements',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(), // e.g. "bodyweight", "body_fat_pct", "chest"
    unit: text('unit').notNull(), // kg, cm, pct
    isBuiltin: integer('is_builtin', { mode: 'boolean' }).notNull().default(false),
    sortOrder: integer('sort_order'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
);

// ────────────────────────────────────────────────────────────────────
// Body measurement entries (individual data points)
// ────────────────────────────────────────────────────────────────────

export const bodyMeasurementEntries = sqliteTable(
  'body_measurement_entries',
  {
    id: text('id').primaryKey(),
    measurementId: text('measurement_id').notNull().references(() => bodyMeasurements.id, { onDelete: 'cascade' }),
    value: real('value').notNull(), // stored in base unit (kg or cm)
    measuredAt: text('measured_at').notNull(),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    index('idx_bme_measurement_id').on(table.measurementId),
    index('idx_bme_measured_at').on(table.measuredAt),
  ],
);

// ────────────────────────────────────────────────────────────────────
// Progress photos
// ────────────────────────────────────────────────────────────────────

export const progressPhotos = sqliteTable(
  'progress_photos',
  {
    id: text('id').primaryKey(),
    filename: text('filename').notNull(), // filename only; full path resolved at runtime
    takenAt: text('taken_at').notNull(),
    label: text('label'), // front, side, back
    notes: text('notes'),
    workoutId: text('workout_id').references(() => workouts.id, { onDelete: 'set null' }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
);

// ────────────────────────────────────────────────────────────────────
// Settings (singleton row, id = 'default')
// ────────────────────────────────────────────────────────────────────

export const settings = sqliteTable(
  'settings',
  {
    id: text('id').primaryKey(), // always 'default'
    weightUnit: text('weight_unit').notNull().default('kg'),
    lengthUnit: text('length_unit').notNull().default('cm'),
    weekStart: integer('week_start').notNull().default(1), // 0=Sun, 1=Mon
    defaultRestSeconds: integer('default_rest_seconds').notNull().default(90),
    barbellWeightKg: real('barbell_weight_kg').notNull().default(20.0),
    availablePlatesKg: text('available_plates_kg').notNull().default('[25,20,15,10,5,2.5,1.25]'),
    hapticsEnabled: integer('haptics_enabled', { mode: 'boolean' }).notNull().default(true),
    soundEnabled: integer('sound_enabled', { mode: 'boolean' }).notNull().default(true),
    paletteId: text('palette_id').notNull().default('volt'),
    appearanceMode: text('appearance_mode').notNull().default('dark'),
    customAccent: text('custom_accent'),
    weeklyWorkoutGoal: integer('weekly_workout_goal').notNull().default(4),
    appLockEnabled: integer('app_lock_enabled', { mode: 'boolean' }).notNull().default(false),
    autoBackupReminderDays: integer('auto_backup_reminder_days').notNull().default(14),
    lastBackupAt: text('last_backup_at'),
    backupSchemaVersion: integer('backup_schema_version').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
);
