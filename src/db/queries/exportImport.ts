/**
 * Database queries & transactions for Data Portability:
 *   - Complete JSON backup export and restore (with merge and overwrite strategies)
 *   - CSV export of completed workout sessions
 *   - Hevy & Strong CSV import with deduplication and atomic transactions
 *   - Routine JSON export and import for sharing
 */

import { eq, and, isNull, inArray, desc, asc, or, sql } from 'drizzle-orm';
import { getDb, getRawDb } from '../client';
import {
  workouts,
  workoutExercises,
  workoutSets,
  routines,
  routineExercises,
  routineSets,
  bodyMeasurements,
  bodyMeasurementEntries,
  exercises,
  settings,
} from '../schema';
import { generateId as uuid, now, deterministicId } from '../../lib/uuid';
import {
  IRONLOG_BACKUP_SCHEMA_VERSION,
  type IronlogBackupData,
  type SharedRoutineJSON,
  validateBackupJSON,
  validateSharedRoutineJSON,
  generateWorkoutsCSV,
  parseExternalWorkoutsCSV,
  type ParsedCsvWorkout,
} from '../../domain/exportImport';
import { recomputeExercisePRsAfterEdit } from './workouts';
import { seedBuiltinMeasurements } from './measurements';
import { seedExercises } from '../seed';

/**
 * Export full Ironlog database as a versioned JSON string.
 */
export function exportAllDataAsJSON(): string {
  const db = getDb();

  // Workouts
  const allWorkouts = db
    .select()
    .from(workouts)
    .where(isNull(workouts.deletedAt))
    .orderBy(asc(workouts.startedAt))
    .all();

  const formattedWorkouts = allWorkouts.map((w) => {
    const wes = db
      .select({
        id: workoutExercises.id,
        exerciseId: workoutExercises.exerciseId,
        exerciseSlug: exercises.slug,
        exerciseName: exercises.name,
        sortOrder: workoutExercises.sortOrder,
        notes: workoutExercises.notes,
      })
      .from(workoutExercises)
      .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
      .where(and(eq(workoutExercises.workoutId, w.id), isNull(workoutExercises.deletedAt)))
      .orderBy(asc(workoutExercises.sortOrder))
      .all();

    const exercisesWithSets = wes.map((we) => {
      const sets = db
        .select()
        .from(workoutSets)
        .where(and(eq(workoutSets.workoutExerciseId, we.id), isNull(workoutSets.deletedAt)))
        .orderBy(asc(workoutSets.setIndex))
        .all();

      return {
        id: we.id,
        exerciseId: we.exerciseId,
        exerciseSlug: we.exerciseSlug,
        exerciseName: we.exerciseName,
        sortOrder: we.sortOrder,
        notes: we.notes,
        sets: sets.map((s) => ({
          id: s.id,
          setIndex: s.setIndex,
          setType: s.setType,
          weightKg: s.weightKg,
          reps: s.reps,
          durationSeconds: s.durationSeconds,
          distanceMeters: s.distanceMeters,
          rpe: s.rpe,
          isCompleted: s.isCompleted,
        })),
      };
    });

    return {
      id: w.id,
      title: w.title,
      startedAt: w.startedAt,
      finishedAt: w.finishedAt,
      durationSeconds: w.durationSeconds,
      notes: w.notes,
      totalVolumeKg: w.totalVolumeKg,
      status: w.status,
      routineId: w.routineId,
      importSource: w.importSource,
      importHash: w.importHash,
      exercises: exercisesWithSets,
    };
  });

  // Routines
  const allRoutines = db
    .select()
    .from(routines)
    .where(isNull(routines.deletedAt))
    .orderBy(asc(routines.sortOrder))
    .all();

  const formattedRoutines = allRoutines.map((r) => {
    const res = db
      .select({
        id: routineExercises.id,
        exerciseId: routineExercises.exerciseId,
        exerciseSlug: exercises.slug,
        exerciseName: exercises.name,
        sortOrder: routineExercises.sortOrder,
        restSeconds: routineExercises.restSeconds,
        notes: routineExercises.notes,
      })
      .from(routineExercises)
      .innerJoin(exercises, eq(routineExercises.exerciseId, exercises.id))
      .where(and(eq(routineExercises.routineId, r.id), isNull(routineExercises.deletedAt)))
      .orderBy(asc(routineExercises.sortOrder))
      .all();

    const routineExsWithSets = res.map((re) => {
      const sets = db
        .select()
        .from(routineSets)
        .where(and(eq(routineSets.routineExerciseId, re.id), isNull(routineSets.deletedAt)))
        .orderBy(asc(routineSets.setIndex))
        .all();

      return {
        id: re.id,
        exerciseId: re.exerciseId,
        exerciseSlug: re.exerciseSlug,
        exerciseName: re.exerciseName,
        sortOrder: re.sortOrder,
        restSeconds: re.restSeconds,
        notes: re.notes,
        sets: sets.map((s) => ({
          id: s.id,
          setIndex: s.setIndex,
          setType: s.setType,
          targetWeightKg: s.targetWeightKg,
          targetReps: s.targetReps,
          targetDurationSeconds: s.targetDurationSeconds,
          targetDistanceMeters: s.targetDistanceMeters,
          targetRpe: s.targetRpe,
        })),
      };
    });

    return {
      id: r.id,
      name: r.name,
      notes: r.notes,
      folderId: r.folderId,
      sortOrder: r.sortOrder ?? 0,
      isPreset: r.isPreset,
      exercises: routineExsWithSets,
    };
  });

  // Body measurements
  const allMeasurements = db
    .select()
    .from(bodyMeasurements)
    .where(isNull(bodyMeasurements.deletedAt))
    .orderBy(asc(bodyMeasurements.sortOrder))
    .all();

  const formattedMeasurements = allMeasurements.map((m) => {
    const entries = db
      .select()
      .from(bodyMeasurementEntries)
      .where(
        and(
          eq(bodyMeasurementEntries.measurementId, m.id),
          isNull(bodyMeasurementEntries.deletedAt),
        ),
      )
      .orderBy(asc(bodyMeasurementEntries.measuredAt))
      .all();

    return {
      id: m.id,
      name: m.name,
      unit: m.unit,
      isBuiltin: m.isBuiltin,
      sortOrder: m.sortOrder,
      entries: entries.map((e) => ({
        id: e.id,
        value: e.value,
        measuredAt: e.measuredAt,
        notes: e.notes,
      })),
    };
  });

  // Custom exercises
  const customExs = db
    .select()
    .from(exercises)
    .where(and(eq(exercises.isCustom, true), isNull(exercises.deletedAt)))
    .all();

  const formattedCustomExercises = customExs.map((ex) => ({
    id: ex.id,
    slug: ex.slug,
    name: ex.name,
    primaryMuscle: ex.primaryMuscle,
    secondaryMuscles: ex.secondaryMuscles ? JSON.parse(ex.secondaryMuscles) : [],
    equipment: ex.equipment,
    exerciseType: ex.exerciseType,
  }));

  // Settings
  const settingsRow = db.select().from(settings).where(eq(settings.id, 'default')).get();

  const backupData: IronlogBackupData = {
    schemaVersion: IRONLOG_BACKUP_SCHEMA_VERSION,
    app: 'ironlog',
    exportedAt: now(),
    metadata: {
      workoutsCount: formattedWorkouts.length,
      routinesCount: formattedRoutines.length,
      measurementsCount: formattedMeasurements.reduce((acc, m) => acc + m.entries.length, 0),
      appVersion: '1.0.0',
    },
    workouts: formattedWorkouts,
    routines: formattedRoutines,
    measurements: formattedMeasurements,
    customExercises: formattedCustomExercises,
    settings: settingsRow ?? undefined,
  };

  // Mark last backup time in settings
  db.update(settings)
    .set({ lastBackupAt: now(), updatedAt: now() })
    .where(eq(settings.id, 'default'))
    .run();

  return JSON.stringify(backupData, null, 2);
}

/**
 * Restore database from an Ironlog backup JSON string.
 */
export async function restoreFromBackupJSON(
  jsonStr: string,
  mode: 'merge' | 'overwrite' = 'merge',
): Promise<{
  workoutsRestored: number;
  routinesRestored: number;
  measurementsRestored: number;
}> {
  const validation = validateBackupJSON(jsonStr);
  if (!validation.valid || !validation.data) {
    throw new Error(validation.error || 'Invalid backup data.');
  }

  const backup = validation.data;
  const rawDb = getRawDb();
  const db = getDb();
  const timestamp = now();

  // Make sure base seed data is in place
  await seedExercises();
  seedBuiltinMeasurements();

  let workoutsRestored = 0;
  let routinesRestored = 0;
  let measurementsRestored = 0;
  const affectedExerciseIds = new Set<string>();

  rawDb.withTransactionSync(() => {
    if (mode === 'overwrite') {
      // Clear workouts, routines, and measurements completely
      rawDb.execSync(`
        DELETE FROM workout_sets;
        DELETE FROM workout_exercises;
        DELETE FROM workouts;
        DELETE FROM routine_sets;
        DELETE FROM routine_exercises;
        DELETE FROM routines;
        DELETE FROM body_measurement_entries;
        DELETE FROM exercise_personal_records;
      `);
    }

    // 1. Restore custom exercises
    if (Array.isArray(backup.customExercises)) {
      for (const cex of backup.customExercises) {
        const existing = db.select({ id: exercises.id }).from(exercises).where(eq(exercises.id, cex.id)).get();
        if (!existing) {
          rawDb.runSync(
            `INSERT INTO exercises (id, slug, name, primary_muscle, secondary_muscles, equipment, exercise_type, is_custom, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            [
              cex.id,
              cex.slug,
              cex.name,
              cex.primaryMuscle,
              JSON.stringify(cex.secondaryMuscles || []),
              cex.equipment,
              cex.exerciseType,
              timestamp,
              timestamp,
            ],
          );
        }
      }
    }

    // 2. Restore routines
    if (Array.isArray(backup.routines)) {
      for (const r of backup.routines) {
        if (mode === 'merge') {
          const existing = db.select({ id: routines.id }).from(routines).where(eq(routines.id, r.id)).get();
          if (existing) continue; // Skip existing routine
        }

        rawDb.runSync(
          `INSERT INTO routines (id, name, notes, folder_id, sort_order, is_preset, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.id, r.name, r.notes, r.folderId, r.sortOrder ?? 0, r.isPreset ? 1 : 0, timestamp, timestamp],
        );

        routinesRestored++;

        for (const re of r.exercises) {
          rawDb.runSync(
            `INSERT INTO routine_exercises (id, routine_id, exercise_id, sort_order, rest_seconds, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [re.id, r.id, re.exerciseId, re.sortOrder, re.restSeconds ?? null, re.notes, timestamp, timestamp],
          );

          for (const s of re.sets) {
            rawDb.runSync(
              `INSERT INTO routine_sets (id, routine_exercise_id, set_index, set_type, target_weight_kg, target_reps, target_duration_seconds, target_distance_meters, target_rpe, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                s.id,
                re.id,
                s.setIndex,
                s.setType,
                s.targetWeightKg,
                s.targetReps,
                s.targetDurationSeconds,
                s.targetDistanceMeters,
                s.targetRpe,
                timestamp,
                timestamp,
              ],
            );
          }
        }
      }
    }

    // 3. Restore workouts
    if (Array.isArray(backup.workouts)) {
      for (const w of backup.workouts) {
        if (mode === 'merge') {
          const existing = db
            .select({ id: workouts.id })
            .from(workouts)
            .where(or(eq(workouts.id, w.id), and(eq(workouts.startedAt, w.startedAt), eq(workouts.title, w.title ?? ''))))
            .get();
          if (existing) continue; // Skip duplicate workout
        }

        rawDb.runSync(
          `INSERT INTO workouts (id, title, started_at, finished_at, duration_seconds, notes, total_volume_kg, status, routine_id, import_source, import_hash, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            w.id,
            w.title,
            w.startedAt,
            w.finishedAt,
            w.durationSeconds,
            w.notes,
            w.totalVolumeKg,
            w.status,
            w.routineId,
            w.importSource ?? 'ironlog_json',
            w.importHash,
            timestamp,
            timestamp,
          ],
        );

        workoutsRestored++;

        for (const we of w.exercises) {
          affectedExerciseIds.add(we.exerciseId);

          rawDb.runSync(
            `INSERT INTO workout_exercises (id, workout_id, exercise_id, sort_order, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [we.id, w.id, we.exerciseId, we.sortOrder, we.notes, timestamp, timestamp],
          );

          for (const s of we.sets) {
            rawDb.runSync(
              `INSERT INTO workout_sets (id, workout_exercise_id, set_index, set_type, weight_kg, reps, duration_seconds, distance_meters, rpe, is_completed, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                s.id,
                we.id,
                s.setIndex,
                s.setType,
                s.weightKg,
                s.reps,
                s.durationSeconds,
                s.distanceMeters,
                s.rpe,
                s.isCompleted ? 1 : 0,
                timestamp,
                timestamp,
              ],
            );
          }
        }
      }
    }

    // 4. Restore measurements & entries
    if (Array.isArray(backup.measurements)) {
      for (const m of backup.measurements) {
        // Ensure measurement definition exists
        const existingM = db.select({ id: bodyMeasurements.id }).from(bodyMeasurements).where(eq(bodyMeasurements.id, m.id)).get();
        if (!existingM) {
          rawDb.runSync(
            `INSERT INTO body_measurements (id, name, unit, is_builtin, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [m.id, m.name, m.unit, m.isBuiltin ? 1 : 0, m.sortOrder ?? 50, timestamp, timestamp],
          );
        }

        for (const e of m.entries) {
          if (mode === 'merge') {
            const existingE = db
              .select({ id: bodyMeasurementEntries.id })
              .from(bodyMeasurementEntries)
              .where(
                and(
                  eq(bodyMeasurementEntries.measurementId, m.id),
                  eq(bodyMeasurementEntries.measuredAt, e.measuredAt),
                ),
              )
              .get();
            if (existingE) continue;
          }

          rawDb.runSync(
            `INSERT INTO body_measurement_entries (id, measurement_id, value, measured_at, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [e.id, m.id, e.value, e.measuredAt, e.notes, timestamp, timestamp],
          );
          measurementsRestored++;
        }
      }
    }
  });

  // Recompute PRs for all affected exercises
  for (const exId of affectedExerciseIds) {
    try {
      recomputeExercisePRsAfterEdit(exId);
    } catch (e) {
      console.warn(`Could not recompute PRs for exercise ${exId} after restore:`, e);
    }
  }

  return {
    workoutsRestored,
    routinesRestored,
    measurementsRestored,
  };
}

/**
 * Export completed workouts as standard readable CSV string.
 */
export function exportWorkoutsAsCSV(): string {
  const db = getDb();

  const rows = db
    .select({
      startedAt: workouts.startedAt,
      title: workouts.title,
      durationSeconds: workouts.durationSeconds,
      workoutNotes: workouts.notes,
      exerciseName: exercises.name,
      setOrder: workoutSets.setIndex,
      setType: workoutSets.setType,
      weightKg: workoutSets.weightKg,
      reps: workoutSets.reps,
      distanceMeters: workoutSets.distanceMeters,
      setDurationSeconds: workoutSets.durationSeconds,
      rpe: workoutSets.rpe,
      setNotes: workoutExercises.notes,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(
      and(
        eq(workouts.status, 'completed'),
        eq(workoutSets.isCompleted, true),
        isNull(workoutSets.deletedAt),
        isNull(workoutExercises.deletedAt),
        isNull(workouts.deletedAt),
      ),
    )
    .orderBy(desc(workouts.startedAt), asc(workoutExercises.sortOrder), asc(workoutSets.setIndex))
    .all();

  return generateWorkoutsCSV(rows);
}

/**
 * Import workouts from Hevy or Strong CSV string.
 * Deduplicates by importHash and matches/creates exercises atomically.
 */
export async function importExternalCSVWorkouts(csvText: string): Promise<{
  format: string;
  importedCount: number;
  skippedDuplicatesCount: number;
}> {
  const parsed = parseExternalWorkoutsCSV(csvText);
  if (parsed.workouts.length === 0) {
    throw new Error(parsed.error || 'No valid workouts found in CSV.');
  }

  const db = getDb();
  const rawDb = getRawDb();
  const timestamp = now();
  let importedCount = 0;
  let skippedDuplicatesCount = 0;
  const affectedExerciseIds = new Set<string>();

  // Pre-load all exercises for fast name matching
  const allExercises = db
    .select({ id: exercises.id, name: exercises.name, slug: exercises.slug })
    .from(exercises)
    .where(isNull(exercises.deletedAt))
    .all();

  const exerciseLookup = new Map<string, string>();
  for (const ex of allExercises) {
    exerciseLookup.set(ex.name.toLowerCase().trim(), ex.id);
    exerciseLookup.set(ex.slug.toLowerCase().trim(), ex.id);
  }

  const resolveOrCreateExercise = (rawName: string): string => {
    const cleanName = rawName.trim();
    const key = cleanName.toLowerCase();
    const existing = exerciseLookup.get(key);
    if (existing) return existing;

    // Create custom exercise so user data is never lost
    const customId = uuid();
    const slug = `custom-${key.replace(/[^a-z0-9]+/g, '-')}`;

    rawDb.runSync(
      `INSERT INTO exercises (id, slug, name, primary_muscle, secondary_muscles, equipment, exercise_type, is_custom, created_at, updated_at)
       VALUES (?, ?, ?, 'other', '[]', 'other', 'weight_reps', 1, ?, ?)`,
      [customId, slug, cleanName, timestamp, timestamp],
    );

    exerciseLookup.set(key, customId);
    return customId;
  };

  rawDb.withTransactionSync(() => {
    for (const pw of parsed.workouts) {
      // Check deduplication by import_hash or exact started_at + title
      const existing = db
        .select({ id: workouts.id })
        .from(workouts)
        .where(
          or(
            eq(workouts.importHash, pw.importHash),
            and(eq(workouts.startedAt, pw.startedAt), eq(workouts.title, pw.title)),
          ),
        )
        .get();

      if (existing) {
        skippedDuplicatesCount++;
        continue;
      }

      const workoutId = uuid();
      let totalVolume = 0;

      rawDb.runSync(
        `INSERT INTO workouts (id, title, started_at, finished_at, duration_seconds, notes, total_volume_kg, status, import_source, import_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 'completed', ?, ?, ?, ?)`,
        [
          workoutId,
          pw.title,
          pw.startedAt,
          pw.finishedAt ?? null,
          pw.durationSeconds ?? 3600,
          pw.notes ?? null,
          pw.importSource,
          pw.importHash,
          timestamp,
          timestamp,
        ],
      );

      importedCount++;

      for (let eIdx = 0; eIdx < pw.exercises.length; eIdx++) {
        const pEx = pw.exercises[eIdx];
        const exerciseId = resolveOrCreateExercise(pEx.exerciseName);
        affectedExerciseIds.add(exerciseId);

        const weId = uuid();
        rawDb.runSync(
          `INSERT INTO workout_exercises (id, workout_id, exercise_id, sort_order, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, null, ?, ?)`,
          [weId, workoutId, exerciseId, eIdx, timestamp, timestamp],
        );

        for (let sIdx = 0; sIdx < pEx.sets.length; sIdx++) {
          const pSet = pEx.sets[sIdx];
          const wsId = uuid();

          rawDb.runSync(
            `INSERT INTO workout_sets (id, workout_exercise_id, set_index, set_type, weight_kg, reps, duration_seconds, distance_meters, rpe, is_completed, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            [
              wsId,
              weId,
              sIdx,
              pSet.setType,
              pSet.weightKg,
              pSet.reps,
              pSet.durationSeconds,
              pSet.distanceMeters,
              pSet.rpe,
              timestamp,
              timestamp,
            ],
          );

          if (pSet.setType !== 'warmup' && pSet.weightKg && pSet.reps) {
            totalVolume += pSet.weightKg * pSet.reps;
          }
        }
      }

      // Update calculated volume
      rawDb.runSync(`UPDATE workouts SET total_volume_kg = ? WHERE id = ?`, [totalVolume, workoutId]);
    }
  });

  // Recompute PRs for all affected exercises
  for (const exId of affectedExerciseIds) {
    try {
      recomputeExercisePRsAfterEdit(exId);
    } catch (e) {
      console.warn(`Could not recompute PRs for ${exId} after CSV import:`, e);
    }
  }

  return {
    format: parsed.format,
    importedCount,
    skippedDuplicatesCount,
  };
}

/**
 * Export a single routine as a shareable JSON string.
 */
export function exportRoutineAsJSON(routineId: string): string {
  const db = getDb();
  const routine = db.select().from(routines).where(eq(routines.id, routineId)).get();
  if (!routine) {
    throw new Error('Routine not found.');
  }

  const res = db
    .select({
      id: routineExercises.id,
      exerciseName: exercises.name,
      exerciseSlug: exercises.slug,
      primaryMuscle: exercises.primaryMuscle,
      equipment: exercises.equipment,
      sortOrder: routineExercises.sortOrder,
      restSeconds: routineExercises.restSeconds,
      notes: routineExercises.notes,
    })
    .from(routineExercises)
    .innerJoin(exercises, eq(routineExercises.exerciseId, exercises.id))
    .where(and(eq(routineExercises.routineId, routineId), isNull(routineExercises.deletedAt)))
    .orderBy(asc(routineExercises.sortOrder))
    .all();

  const exercisesList = res.map((re) => {
    const sets = db
      .select()
      .from(routineSets)
      .where(and(eq(routineSets.routineExerciseId, re.id), isNull(routineSets.deletedAt)))
      .orderBy(asc(routineSets.setIndex))
      .all();

    return {
      exerciseName: re.exerciseName,
      exerciseSlug: re.exerciseSlug,
      primaryMuscle: re.primaryMuscle,
      equipment: re.equipment,
      sortOrder: re.sortOrder,
      notes: re.notes,
      sets: sets.map((s) => ({
        setIndex: s.setIndex,
        setType: s.setType,
        targetWeightKg: s.targetWeightKg,
        targetReps: s.targetReps,
        targetRpe: s.targetRpe,
        restSeconds: re.restSeconds,
      })),
    };
  });

  const shared: SharedRoutineJSON = {
    schemaVersion: 1,
    type: 'ironlog_routine',
    title: routine.name,
    notes: routine.notes,
    exercises: exercisesList,
  };

  return JSON.stringify(shared, null, 2);
}

/**
 * Import a shared routine JSON into user's routines.
 */
export function importSharedRoutineJSON(jsonStr: string): string {
  const validation = validateSharedRoutineJSON(jsonStr);
  if (!validation.valid || !validation.data) {
    throw new Error(validation.error || 'Invalid routine JSON format.');
  }

  const routineData = validation.data;
  const db = getDb();
  const rawDb = getRawDb();
  const timestamp = now();
  const newRoutineId = uuid();

  // Find max sort order
  const maxOrder = db.select({ order: routines.sortOrder }).from(routines).orderBy(desc(routines.sortOrder)).limit(1).get();
  const nextOrder = (maxOrder?.order ?? 0) + 1;

  rawDb.withTransactionSync(() => {
    rawDb.runSync(
      `INSERT INTO routines (id, name, notes, folder_id, sort_order, is_preset, created_at, updated_at)
       VALUES (?, ?, ?, null, ?, 0, ?, ?)`,
      [newRoutineId, routineData.title, routineData.notes ?? null, nextOrder, timestamp, timestamp],
    );

    for (let eIdx = 0; eIdx < routineData.exercises.length; eIdx++) {
      const exObj = routineData.exercises[eIdx];
      let exerciseId: string | null = null;

      // Lookup exercise by slug or name
      if (exObj.exerciseSlug) {
        const found = db.select({ id: exercises.id }).from(exercises).where(eq(exercises.slug, exObj.exerciseSlug)).get();
        if (found) exerciseId = found.id;
      }

      if (!exerciseId) {
        const found = db.select({ id: exercises.id }).from(exercises).where(eq(exercises.name, exObj.exerciseName)).get();
        if (found) exerciseId = found.id;
      }

      if (!exerciseId) {
        // Create custom exercise
        exerciseId = uuid();
        const slug = `custom-${exObj.exerciseName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        rawDb.runSync(
          `INSERT INTO exercises (id, slug, name, primary_muscle, secondary_muscles, equipment, exercise_type, is_custom, created_at, updated_at)
           VALUES (?, ?, ?, ?, '[]', ?, 'weight_reps', 1, ?, ?)`,
          [exerciseId, slug, exObj.exerciseName, exObj.primaryMuscle || 'other', exObj.equipment || 'other', timestamp, timestamp],
        );
      }

      const restSec = exObj.sets[0]?.restSeconds ?? null;
      const reId = uuid();
      rawDb.runSync(
        `INSERT INTO routine_exercises (id, routine_id, exercise_id, sort_order, rest_seconds, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [reId, newRoutineId, exerciseId, eIdx, restSec, exObj.notes ?? null, timestamp, timestamp],
      );

      for (let sIdx = 0; sIdx < exObj.sets.length; sIdx++) {
        const s = exObj.sets[sIdx];
        const rsId = uuid();
        rawDb.runSync(
          `INSERT INTO routine_sets (id, routine_exercise_id, set_index, set_type, target_weight_kg, target_reps, target_duration_seconds, target_distance_meters, target_rpe, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, null, null, ?, ?, ?)`,
          [
            rsId,
            reId,
            s.setIndex ?? sIdx,
            s.setType || 'normal',
            s.targetWeightKg ?? null,
            s.targetReps ?? null,
            s.targetRpe ?? null,
            timestamp,
            timestamp,
          ],
        );
      }
    }
  });

  return newRoutineId;
}
