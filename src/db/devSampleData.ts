/**
 * Developer sample data loader and clearer.
 *
 * Exclusively active in development builds (__DEV__).
 * All sample items are tagged with 'sample_data' and prefixed with 'sample_'
 * so clearSampleData() CAN NEVER delete or alter real user data.
 */

import { eq, or, like, inArray, sql } from 'drizzle-orm';
import { getDb, getRawDb } from './client';
import {
  workouts,
  workoutExercises,
  workoutSets,
  bodyMeasurementEntries,
  exercises,
} from './schema';
import { deterministicId } from '../lib/uuid';
import { recomputeExercisePRsAfterEdit } from './queries/workouts';
import { seedBuiltinMeasurements } from './queries/measurements';

export interface SampleDataSummary {
  workoutsCount: number;
  entriesCount: number;
}

/**
 * Check if sample data is currently loaded in the database.
 */
export function hasSampleData(): boolean {
  if (!__DEV__) return false;
  const db = getDb();
  const sampleWorkout = db
    .select({ id: workouts.id })
    .from(workouts)
    .where(or(eq(workouts.importSource, 'sample_data'), like(workouts.id, 'sample_workout_%')))
    .limit(1)
    .get();

  return !!sampleWorkout;
}

/**
 * Remove all sample data from the database.
 * Strictly filters by sample_data tag and sample_ prefixes so real user data is 100% safe.
 */
export function clearSampleData(): { deletedWorkoutsCount: number; deletedEntriesCount: number } {
  if (!__DEV__) {
    throw new Error('Sample data operations are only allowed in development builds.');
  }

  const db = getDb();
  const rawDb = getRawDb();

  // Find all sample workouts to collect affected exercise IDs
  const sampleWorkouts = db
    .select({ id: workouts.id })
    .from(workouts)
    .where(or(eq(workouts.importSource, 'sample_data'), like(workouts.id, 'sample_workout_%')))
    .all();

  const sampleWorkoutIds = sampleWorkouts.map((w) => w.id);

  let affectedExerciseIds: string[] = [];
  if (sampleWorkoutIds.length > 0) {
    const sampleWes = db
      .select({ exerciseId: workoutExercises.exerciseId })
      .from(workoutExercises)
      .where(
        or(
          like(workoutExercises.id, 'sample_we_%'),
          inArray(workoutExercises.workoutId, sampleWorkoutIds),
        ),
      )
      .all();
    affectedExerciseIds = Array.from(new Set(sampleWes.map((we) => we.exerciseId)));
  }

  // Count deleted entries before removal
  const deletedWorkoutsCount = sampleWorkoutIds.length;
  let deletedEntriesCount = 0;

  const sampleEntries = db
    .select({ id: bodyMeasurementEntries.id })
    .from(bodyMeasurementEntries)
    .where(
      or(
        like(bodyMeasurementEntries.id, 'sample_me_%'),
        eq(bodyMeasurementEntries.notes, '[sample_data]'),
      ),
    )
    .all();
  deletedEntriesCount = sampleEntries.length;

  // Execute deletion in a single raw transaction
  rawDb.withTransactionSync(() => {
    // 1. Delete sample workout sets
    rawDb.execSync(`
      DELETE FROM workout_sets 
      WHERE id LIKE 'sample_ws_%' 
         OR workout_exercise_id IN (SELECT id FROM workout_exercises WHERE id LIKE 'sample_we_%' OR workout_id LIKE 'sample_workout_%');
    `);

    // 2. Delete sample workout exercises
    rawDb.execSync(`
      DELETE FROM workout_exercises 
      WHERE id LIKE 'sample_we_%' 
         OR workout_id LIKE 'sample_workout_%';
    `);

    // 3. Delete sample workouts
    rawDb.execSync(`
      DELETE FROM workouts 
      WHERE import_source = 'sample_data' 
         OR id LIKE 'sample_workout_%';
    `);

    // 4. Delete sample body measurement entries
    rawDb.execSync(`
      DELETE FROM body_measurement_entries 
      WHERE id LIKE 'sample_me_%' 
         OR notes = '[sample_data]';
    `);
  });

  // Recompute PRs for affected exercises so any records achieved on sample data are removed
  for (const exId of affectedExerciseIds) {
    try {
      recomputeExercisePRsAfterEdit(exId);
    } catch (e) {
      console.warn(`Could not recompute PRs for exercise ${exId} after clearing sample data:`, e);
    }
  }

  return { deletedWorkoutsCount, deletedEntriesCount };
}

/**
 * Load realistic sample data spanning 16 weeks:
 *   - 47 completed workouts across 16 weeks (3/week, 2 in current week)
 *   - Progressive overload curve (volume increases over time from 7.5k to 12.5k kg)
 *   - Balanced muscle distribution (chest, back, quads, shoulders, biceps, abs)
 *   - 16 bodyweight entries + 24 other body tracking entries
 *   - Automatic PR computation for key lifts
 */
export function loadSampleData(): SampleDataSummary {
  if (!__DEV__) {
    throw new Error('Sample data operations are only allowed in development builds.');
  }

  // Clear existing sample data first for idempotency
  clearSampleData();
  seedBuiltinMeasurements();

  const rawDb = getRawDb();
  const nowMs = Date.now();

  // Key exercise IDs
  const benchId = deterministicId('barbell-flat-bench-press');
  const inclineBenchId = deterministicId('barbell-incline-bench-press');
  const overheadPressId = deterministicId('barbell-overhead-press');
  const deadliftId = deterministicId('barbell-deadlift');
  const rowId = deterministicId('barbell-bent-over-row');
  const pulldownId = deterministicId('cable-lat-pulldown');
  const curlId = deterministicId('barbell-curl');
  const squatId = deterministicId('barbell-back-squat');
  const rdlId = deterministicId('barbell-romanian-deadlift');
  const crunchId = deterministicId('cable-crunch');

  const affectedExerciseIds = [
    benchId,
    inclineBenchId,
    overheadPressId,
    deadliftId,
    rowId,
    pulldownId,
    curlId,
    squatId,
    rdlId,
    crunchId,
  ];

  interface ExercisePlan {
    exerciseId: string;
    warmup: { weight: number; reps: number };
    working: Array<{ weight: number; reps: number }>;
  }

  interface WorkoutTemplate {
    title: string;
    exercises: (progressFactor: number) => ExercisePlan[];
  }

  const templates: WorkoutTemplate[] = [
    // 0: Push Day
    {
      title: 'Push Day',
      exercises: (p) => [
        {
          exerciseId: benchId,
          warmup: { weight: Math.round(40 + 10 * p), reps: 10 },
          working: [
            { weight: Math.round(60 + 35 * p), reps: 8 },
            { weight: Math.round(65 + 35 * p), reps: 6 },
            { weight: Math.round(70 + 35 * p), reps: 5 },
          ],
        },
        {
          exerciseId: inclineBenchId,
          warmup: { weight: Math.round(30 + 10 * p), reps: 10 },
          working: [
            { weight: Math.round(50 + 25 * p), reps: 8 },
            { weight: Math.round(52.5 + 25 * p), reps: 8 },
            { weight: Math.round(55 + 25 * p), reps: 6 },
          ],
        },
        {
          exerciseId: overheadPressId,
          warmup: { weight: Math.round(25 + 5 * p), reps: 10 },
          working: [
            { weight: Math.round(35 + 20 * p), reps: 8 },
            { weight: Math.round(37.5 + 20 * p), reps: 8 },
            { weight: Math.round(40 + 20 * p), reps: 6 },
          ],
        },
      ],
    },
    // 1: Pull Day
    {
      title: 'Pull Day',
      exercises: (p) => [
        {
          exerciseId: deadliftId,
          warmup: { weight: Math.round(60 + 20 * p), reps: 8 },
          working: [
            { weight: Math.round(100 + 50 * p), reps: 5 },
            { weight: Math.round(110 + 50 * p), reps: 5 },
            { weight: Math.round(120 + 50 * p), reps: 4 },
          ],
        },
        {
          exerciseId: rowId,
          warmup: { weight: Math.round(40 + 10 * p), reps: 10 },
          working: [
            { weight: Math.round(60 + 25 * p), reps: 8 },
            { weight: Math.round(65 + 25 * p), reps: 8 },
            { weight: Math.round(70 + 25 * p), reps: 6 },
          ],
        },
        {
          exerciseId: pulldownId,
          warmup: { weight: Math.round(35 + 10 * p), reps: 10 },
          working: [
            { weight: Math.round(50 + 20 * p), reps: 10 },
            { weight: Math.round(55 + 20 * p), reps: 10 },
            { weight: Math.round(60 + 20 * p), reps: 8 },
          ],
        },
        {
          exerciseId: curlId,
          warmup: { weight: Math.round(15 + 5 * p), reps: 12 },
          working: [
            { weight: Math.round(25 + 15 * p), reps: 10 },
            { weight: Math.round(27.5 + 15 * p), reps: 8 },
            { weight: Math.round(30 + 15 * p), reps: 8 },
          ],
        },
      ],
    },
    // 2: Legs & Core Day
    {
      title: 'Legs & Core',
      exercises: (p) => [
        {
          exerciseId: squatId,
          warmup: { weight: Math.round(50 + 20 * p), reps: 8 },
          working: [
            { weight: Math.round(80 + 45 * p), reps: 6 },
            { weight: Math.round(85 + 45 * p), reps: 6 },
            { weight: Math.round(90 + 45 * p), reps: 5 },
          ],
        },
        {
          exerciseId: rdlId,
          warmup: { weight: Math.round(40 + 15 * p), reps: 10 },
          working: [
            { weight: Math.round(70 + 35 * p), reps: 8 },
            { weight: Math.round(75 + 35 * p), reps: 8 },
            { weight: Math.round(80 + 35 * p), reps: 6 },
          ],
        },
        {
          exerciseId: crunchId,
          warmup: { weight: Math.round(20 + 5 * p), reps: 15 },
          working: [
            { weight: Math.round(30 + 20 * p), reps: 12 },
            { weight: Math.round(35 + 20 * p), reps: 12 },
            { weight: Math.round(40 + 20 * p), reps: 10 },
          ],
        },
      ],
    },
  ];

  let totalWorkoutsGenerated = 0;
  let totalEntriesGenerated = 0;

  rawDb.withTransactionSync(() => {
    // Generate 47 completed workouts over 16 weeks (weeks 15 down to 0)
    for (let week = 15; week >= 0; week--) {
      // Week 0 has 2 workouts (Mon, Wed) -> leaves 2/4 progress for this week!
      // Weeks 1..15 have 3 workouts (Mon, Wed, Fri) -> 16 week streak!
      const daysCount = week === 0 ? 2 : 3;

      for (let day = 0; day < daysCount; day++) {
        const daysAgo = week * 7 + (daysCount === 2 ? (day === 0 ? 3 : 1) : [5, 3, 1][day]);
        const workoutDate = new Date(nowMs - daysAgo * 86400000);
        // Start workout at 18:00
        workoutDate.setHours(18, 0, 0, 0);
        const startedAt = workoutDate.toISOString();
        const durationSeconds = 3000 + Math.floor(Math.random() * 900); // 50 to 65 mins
        const finishedAt = new Date(workoutDate.getTime() + durationSeconds * 1000).toISOString();

        const templateIdx = (15 - week + day) % 3;
        const template = templates[templateIdx];

        // Progress factor: 0.0 (15 weeks ago) -> 1.0 (today)
        const progressFactor = Math.min(1.0, Math.max(0.0, (15 - week + day * 0.3) / 15));
        const plannedExercises = template.exercises(progressFactor);

        const workoutId = `sample_workout_${week}_${day}`;
        let workoutVolume = 0;

        // Insert workout row
        rawDb.runSync(
          `INSERT INTO workouts (id, title, started_at, finished_at, duration_seconds, notes, total_volume_kg, status, import_source, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', 'sample_data', ?, ?)`,
          [
            workoutId,
            template.title,
            startedAt,
            finishedAt,
            durationSeconds,
            '[sample_data] Generated for testing',
            0, // will update below
            startedAt,
            startedAt,
          ],
        );

        totalWorkoutsGenerated++;

        // Insert workout exercises and sets
        for (let eIdx = 0; eIdx < plannedExercises.length; eIdx++) {
          const exPlan = plannedExercises[eIdx];
          const weId = `sample_we_${week}_${day}_${eIdx}`;

          rawDb.runSync(
            `INSERT INTO workout_exercises (id, workout_id, exercise_id, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [weId, workoutId, exPlan.exerciseId, eIdx, startedAt, startedAt],
          );

          // 1. Warmup set (volume excluded)
          const wsWarmupId = `sample_ws_${week}_${day}_${eIdx}_0`;
          rawDb.runSync(
            `INSERT INTO workout_sets (id, workout_exercise_id, set_index, set_type, weight_kg, reps, is_completed, created_at, updated_at)
             VALUES (?, ?, ?, 'warmup', ?, ?, 1, ?, ?)`,
            [wsWarmupId, weId, 0, exPlan.warmup.weight, exPlan.warmup.reps, startedAt, startedAt],
          );

          // 2. Working sets (volume included)
          for (let sIdx = 0; sIdx < exPlan.working.length; sIdx++) {
            const setObj = exPlan.working[sIdx];
            const wsWorkingId = `sample_ws_${week}_${day}_${eIdx}_${sIdx + 1}`;
            rawDb.runSync(
              `INSERT INTO workout_sets (id, workout_exercise_id, set_index, set_type, weight_kg, reps, is_completed, created_at, updated_at)
               VALUES (?, ?, ?, 'normal', ?, ?, 1, ?, ?)`,
              [wsWorkingId, weId, sIdx + 1, setObj.weight, setObj.reps, startedAt, startedAt],
            );

            workoutVolume += setObj.weight * setObj.reps;
          }
        }

        // Update workout total volume
        rawDb.runSync(
          `UPDATE workouts SET total_volume_kg = ? WHERE id = ?`,
          [workoutVolume, workoutId],
        );
      }
    }

    // ─────────────────────────────────────────────────────────────
    // Body Measurements (16 weekly weight logs + bi-weekly tape logs)
    // ─────────────────────────────────────────────────────────────
    const bwId = deterministicId('measurement-bodyweight');
    const bfId = deterministicId('measurement-body_fat_pct');
    const waistId = deterministicId('measurement-waist');
    const bicepsId = deterministicId('measurement-biceps');

    // Bodyweight dropping steadily over 16 weeks from 84.2 kg to 79.2 kg (-5 kg)
    const bwTrend = [
      84.2, 83.9, 83.6, 83.1, 82.8, 82.4, 82.1, 81.7,
      81.4, 81.0, 80.7, 80.3, 80.0, 79.7, 79.5, 79.2,
    ];

    for (let w = 15; w >= 0; w--) {
      const daysAgo = w * 7;
      const entryDate = new Date(nowMs - daysAgo * 86400000);
      entryDate.setHours(8, 0, 0, 0);
      const measuredAt = entryDate.toISOString();
      const val = bwTrend[15 - w];

      const entryId = `sample_me_bw_${w}`;
      rawDb.runSync(
        `INSERT INTO body_measurement_entries (id, measurement_id, value, measured_at, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, '[sample_data]', ?, ?)`,
        [entryId, bwId, val, measuredAt, measuredAt, measuredAt],
      );
      totalEntriesGenerated++;
    }

    // Body fat %, waist, biceps bi-weekly (8 entries)
    const bfTrend = [18.5, 18.0, 17.4, 16.8, 16.2, 15.6, 15.1, 14.6];
    const waistTrend = [88.0, 87.2, 86.1, 85.0, 84.2, 83.3, 82.4, 81.5];
    const bicepsTrend = [36.5, 36.6, 36.8, 37.0, 37.2, 37.4, 37.6, 37.8];

    for (let i = 0; i < 8; i++) {
      const daysAgo = (7 - i) * 14;
      const entryDate = new Date(nowMs - daysAgo * 86400000);
      entryDate.setHours(8, 30, 0, 0);
      const measuredAt = entryDate.toISOString();

      // Body fat %
      rawDb.runSync(
        `INSERT INTO body_measurement_entries (id, measurement_id, value, measured_at, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, '[sample_data]', ?, ?)`,
        [`sample_me_bf_${i}`, bfId, bfTrend[i], measuredAt, measuredAt, measuredAt],
      );

      // Waist
      rawDb.runSync(
        `INSERT INTO body_measurement_entries (id, measurement_id, value, measured_at, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, '[sample_data]', ?, ?)`,
        [`sample_me_waist_${i}`, waistId, waistTrend[i], measuredAt, measuredAt, measuredAt],
      );

      // Biceps
      rawDb.runSync(
        `INSERT INTO body_measurement_entries (id, measurement_id, value, measured_at, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, '[sample_data]', ?, ?)`,
        [`sample_me_biceps_${i}`, bicepsId, bicepsTrend[i], measuredAt, measuredAt, measuredAt],
      );

      totalEntriesGenerated += 3;
    }
  });

  // Recompute PR history for all affected exercises so PR cards & milestones light up
  for (const exId of affectedExerciseIds) {
    try {
      recomputeExercisePRsAfterEdit(exId);
    } catch (e) {
      console.warn(`Could not recompute PRs for exercise ${exId} during sample data loading:`, e);
    }
  }

  return {
    workoutsCount: totalWorkoutsGenerated,
    entriesCount: totalEntriesGenerated,
  };
}
