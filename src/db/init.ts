/**
 * Database initialization — creates tables and seeds initial data.
 *
 * Uses raw SQL for table creation (Drizzle's push approach) since
 * expo-sqlite doesn't support Drizzle's migration runner natively.
 * Tables are created IF NOT EXISTS for idempotency.
 */

import { getRawDb, getDb } from './client';
import { settings } from './schema';
import { now } from '../lib/uuid';
import { eq } from 'drizzle-orm';

/**
 * Initialize the database: create tables, indexes, and seed the
 * default settings row if it doesn't exist.
 */
export async function initializeDatabase(): Promise<void> {
  const rawDb = getRawDb();

  // Create all tables
  rawDb.execSync(CREATE_TABLES_SQL);

  // Ensure the default settings row exists
  const db = getDb();
  const existing = db.select().from(settings).where(eq(settings.id, 'default')).get();

  if (!existing) {
    const timestamp = now();
    db.insert(settings)
      .values({
        id: 'default',
        weightUnit: 'kg',
        lengthUnit: 'cm',
        weekStart: 1,
        defaultRestSeconds: 90,
        barbellWeightKg: 20.0,
        availablePlatesKg: JSON.stringify([25, 20, 15, 10, 5, 2.5, 1.25]),
        hapticsEnabled: true,
        soundEnabled: true,
        paletteId: 'volt',
        appearanceMode: 'dark',
        weeklyWorkoutGoal: 4,
        appLockEnabled: false,
        autoBackupReminderDays: 14,
        backupSchemaVersion: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
  }
}

// ────────────────────────────────────────────────────────────────────
// Raw SQL for table creation
// ────────────────────────────────────────────────────────────────────

const CREATE_TABLES_SQL = `
-- Exercises
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  primary_muscle TEXT NOT NULL,
  secondary_muscles TEXT,
  equipment TEXT NOT NULL,
  exercise_type TEXT NOT NULL,
  notes TEXT,
  is_custom INTEGER NOT NULL DEFAULT 0,
  default_rest_seconds INTEGER,
  sort_order INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_slug ON exercises(slug);
CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscle ON exercises(primary_muscle);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);
CREATE INDEX IF NOT EXISTS idx_exercises_deleted_at ON exercises(deleted_at);

-- Routine folders
CREATE TABLE IF NOT EXISTS routine_folders (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Routines
CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  folder_id TEXT REFERENCES routine_folders(id) ON DELETE SET NULL,
  notes TEXT,
  is_preset INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Workouts
CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  duration_seconds INTEGER,
  notes TEXT,
  total_volume_kg REAL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  routine_id TEXT REFERENCES routines(id) ON DELETE SET NULL,
  import_source TEXT,
  import_hash TEXT,
  tz_offset_minutes INTEGER,
  rest_started_at TEXT,
  rest_duration_seconds INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_workouts_started_at ON workouts(started_at);
CREATE INDEX IF NOT EXISTS idx_workouts_status ON workouts(status);
CREATE INDEX IF NOT EXISTS idx_workouts_deleted_at ON workouts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_workouts_import_hash ON workouts(import_hash);

-- Superset groups (shared between workouts and routines)
CREATE TABLE IF NOT EXISTS superset_groups (
  id TEXT PRIMARY KEY NOT NULL,
  workout_id TEXT REFERENCES workouts(id) ON DELETE CASCADE,
  routine_id TEXT REFERENCES routines(id) ON DELETE CASCADE,
  label TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Workout exercises
CREATE TABLE IF NOT EXISTS workout_exercises (
  id TEXT PRIMARY KEY NOT NULL,
  workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL,
  superset_group_id TEXT REFERENCES superset_groups(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_we_workout_id ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_we_exercise_id ON workout_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_we_exercise_workout ON workout_exercises(exercise_id, workout_id);

-- Workout sets
CREATE TABLE IF NOT EXISTS workout_sets (
  id TEXT PRIMARY KEY NOT NULL,
  workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_index INTEGER NOT NULL,
  set_type TEXT NOT NULL DEFAULT 'normal',
  weight_kg REAL,
  reps INTEGER,
  duration_seconds REAL,
  distance_meters REAL,
  rpe REAL,
  is_completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_ws_workout_exercise_id ON workout_sets(workout_exercise_id);
CREATE INDEX IF NOT EXISTS idx_ws_completed ON workout_sets(is_completed);

-- Exercise personal records (append-only)
CREATE TABLE IF NOT EXISTS exercise_personal_records (
  id TEXT PRIMARY KEY NOT NULL,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  value REAL NOT NULL,
  weight_kg REAL,
  workout_set_id TEXT NOT NULL REFERENCES workout_sets(id) ON DELETE CASCADE,
  is_current INTEGER NOT NULL DEFAULT 1,
  achieved_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_pr_exercise_id ON exercise_personal_records(exercise_id);
CREATE INDEX IF NOT EXISTS idx_pr_exercise_type ON exercise_personal_records(exercise_id, record_type);
CREATE INDEX IF NOT EXISTS idx_pr_is_current ON exercise_personal_records(exercise_id, is_current);

-- Routine exercises
CREATE TABLE IF NOT EXISTS routine_exercises (
  id TEXT PRIMARY KEY NOT NULL,
  routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL,
  rest_seconds INTEGER,
  superset_group_id TEXT REFERENCES superset_groups(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Routine sets
CREATE TABLE IF NOT EXISTS routine_sets (
  id TEXT PRIMARY KEY NOT NULL,
  routine_exercise_id TEXT NOT NULL REFERENCES routine_exercises(id) ON DELETE CASCADE,
  set_index INTEGER NOT NULL,
  set_type TEXT NOT NULL DEFAULT 'normal',
  target_weight_kg REAL,
  target_reps INTEGER,
  target_duration_seconds REAL,
  target_distance_meters REAL,
  target_rpe REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Body measurements
CREATE TABLE IF NOT EXISTS body_measurements (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  is_builtin INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Body measurement entries
CREATE TABLE IF NOT EXISTS body_measurement_entries (
  id TEXT PRIMARY KEY NOT NULL,
  measurement_id TEXT NOT NULL REFERENCES body_measurements(id) ON DELETE CASCADE,
  value REAL NOT NULL,
  measured_at TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_bme_measurement_id ON body_measurement_entries(measurement_id);
CREATE INDEX IF NOT EXISTS idx_bme_measured_at ON body_measurement_entries(measured_at);

-- Progress photos
CREATE TABLE IF NOT EXISTS progress_photos (
  id TEXT PRIMARY KEY NOT NULL,
  filename TEXT NOT NULL,
  taken_at TEXT NOT NULL,
  label TEXT,
  notes TEXT,
  workout_id TEXT REFERENCES workouts(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Settings (singleton)
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY NOT NULL,
  weight_unit TEXT NOT NULL DEFAULT 'kg',
  length_unit TEXT NOT NULL DEFAULT 'cm',
  week_start INTEGER NOT NULL DEFAULT 1,
  default_rest_seconds INTEGER NOT NULL DEFAULT 90,
  barbell_weight_kg REAL NOT NULL DEFAULT 20.0,
  available_plates_kg TEXT NOT NULL DEFAULT '[25,20,15,10,5,2.5,1.25]',
  haptics_enabled INTEGER NOT NULL DEFAULT 1,
  sound_enabled INTEGER NOT NULL DEFAULT 1,
  palette_id TEXT NOT NULL DEFAULT 'volt',
  appearance_mode TEXT NOT NULL DEFAULT 'dark',
  custom_accent TEXT,
  weekly_workout_goal INTEGER NOT NULL DEFAULT 4,
  app_lock_enabled INTEGER NOT NULL DEFAULT 0,
  auto_backup_reminder_days INTEGER NOT NULL DEFAULT 14,
  last_backup_at TEXT,
  backup_schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
`;
