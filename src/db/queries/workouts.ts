/**
 * Workout queries and mutations — SQLite persistence for active & completed workouts.
 *
 * Guarantees that only ONE active workout ('in_progress') exists at any time.
 * Persists every modification immediately to SQLite, including rest timer state,
 * so app restarts and kills restore the session seamlessly.
 */

import { eq, and, isNull, desc, asc, ne, inArray, sql } from 'drizzle-orm';
import { getDb } from '../client';
import {
  workouts,
  workoutExercises,
  workoutSets,
  exercises,
  exercisePersonalRecords,
  settings,
  supersetGroups,
  type PrType,
  type SetType,
} from '../schema';
import { generateId as uuid, now } from '../../lib/uuid';
import {
  detectNewPRs,
  recomputeExercisePRHistory,
  type ExistingPR,
  type NewPRResult,
  type CandidateSet,
} from '../../domain/prDetection';
import { calculateWorkoutVolume } from '../../domain/calc';
import { getNextSupersetLabel } from '../../domain/supersets';
import { compareExerciseSessions } from '../../domain/comparison';
import type { ExerciseRow } from './exercises';

export type WorkoutRow = typeof workouts.$inferSelect;
export type WorkoutExerciseRow = typeof workoutExercises.$inferSelect;
export type WorkoutSetRow = typeof workoutSets.$inferSelect;

export interface FullWorkoutSet extends WorkoutSetRow {}

export interface FullWorkoutExercise extends WorkoutExerciseRow {
  exercise: ExerciseRow;
  sets: FullWorkoutSet[];
}

export interface ActiveWorkout extends WorkoutRow {
  exercises: FullWorkoutExercise[];
}

/**
 * Get the currently active in-progress workout, if one exists.
 * Returns null if no workout is in progress.
 */
export function getActiveWorkout(): ActiveWorkout | null {
  const db = getDb();

  // Find the active workout
  const activeList = db
    .select()
    .from(workouts)
    .where(and(eq(workouts.status, 'in_progress'), isNull(workouts.deletedAt)))
    .orderBy(desc(workouts.startedAt))
    .all();

  if (activeList.length === 0) return null;

  // Single active workout invariant: if multiple exist, pick the newest and discard older
  const activeWorkoutRow = activeList[0];
  if (activeList.length > 1) {
    for (let i = 1; i < activeList.length; i++) {
      db.update(workouts)
        .set({ status: 'discarded', updatedAt: now() })
        .where(eq(workouts.id, activeList[i].id))
        .run();
    }
  }

  // Load exercises for this workout
  const weRows = db
    .select()
    .from(workoutExercises)
    .where(
      and(
        eq(workoutExercises.workoutId, activeWorkoutRow.id),
        isNull(workoutExercises.deletedAt),
      ),
    )
    .orderBy(asc(workoutExercises.sortOrder))
    .all();

  const fullExercises: FullWorkoutExercise[] = [];

  for (const we of weRows) {
    const exRow = db
      .select()
      .from(exercises)
      .where(eq(exercises.id, we.exerciseId))
      .get();

    if (!exRow) continue;

    const sets = db
      .select()
      .from(workoutSets)
      .where(
        and(
          eq(workoutSets.workoutExerciseId, we.id),
          isNull(workoutSets.deletedAt),
        ),
      )
      .orderBy(asc(workoutSets.setIndex))
      .all();

    fullExercises.push({
      ...we,
      exercise: exRow,
      sets,
    });
  }

  return {
    ...activeWorkoutRow,
    exercises: fullExercises,
  };
}

/**
 * Start a new workout. If an active workout already exists, returns it.
 */
export function startWorkout(options: {
  title?: string;
  routineId?: string;
} = {}): ActiveWorkout {
  const existing = getActiveWorkout();
  if (existing) return existing;

  const db = getDb();
  const timestamp = now();
  const id = uuid();

  // Default workout title: e.g. "Evening Workout"
  const defaultTitle = options.title ?? getDefaultWorkoutTitle();

  db.insert(workouts)
    .values({
      id,
      title: defaultTitle,
      startedAt: timestamp,
      status: 'in_progress',
      routineId: options.routineId ?? null,
      tzOffsetMinutes: new Date().getTimezoneOffset(),
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return getActiveWorkout()!;
}

/**
 * Add an exercise to the active workout.
 * Also appends an initial normal set.
 */
export function addExerciseToActiveWorkout(
  workoutId: string,
  exerciseId: string,
): FullWorkoutExercise {
  const db = getDb();
  const timestamp = now();

  // Get current max sort order
  const existingExercises = db
    .select({ sortOrder: workoutExercises.sortOrder })
    .from(workoutExercises)
    .where(
      and(
        eq(workoutExercises.workoutId, workoutId),
        isNull(workoutExercises.deletedAt),
      ),
    )
    .orderBy(desc(workoutExercises.sortOrder))
    .all();

  const nextSortOrder =
    existingExercises.length > 0 ? (existingExercises[0].sortOrder ?? 0) + 1 : 1;

  const weId = uuid();
  db.insert(workoutExercises)
    .values({
      id: weId,
      workoutId,
      exerciseId,
      sortOrder: nextSortOrder,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  // Add initial set
  const setId = uuid();
  db.insert(workoutSets)
    .values({
      id: setId,
      workoutExerciseId: weId,
      setIndex: 1,
      setType: 'normal',
      isCompleted: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  // Touch workout updated_at
  db.update(workouts)
    .set({ updatedAt: timestamp })
    .where(eq(workouts.id, workoutId))
    .run();

  const exRow = db.select().from(exercises).where(eq(exercises.id, exerciseId)).get()!;
  const setRow = db.select().from(workoutSets).where(eq(workoutSets.id, setId)).get()!;

  return {
    id: weId,
    workoutId,
    exerciseId,
    sortOrder: nextSortOrder,
    supersetGroupId: null,
    notes: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    exercise: exRow,
    sets: [setRow],
  };
}

/**
 * Remove an exercise from the active workout.
 */
export function removeExerciseFromWorkout(workoutExerciseId: string): void {
  const db = getDb();
  const timestamp = now();

  db.update(workoutExercises)
    .set({ deletedAt: timestamp, updatedAt: timestamp })
    .where(eq(workoutExercises.id, workoutExerciseId))
    .run();
}

/**
 * Reorder exercises in a workout.
 */
export function reorderWorkoutExercises(
  workoutId: string,
  orderedWorkoutExerciseIds: string[],
): void {
  const db = getDb();
  const timestamp = now();

  for (let i = 0; i < orderedWorkoutExerciseIds.length; i++) {
    db.update(workoutExercises)
      .set({ sortOrder: i + 1, updatedAt: timestamp })
      .where(eq(workoutExercises.id, orderedWorkoutExerciseIds[i]))
      .run();
  }

  db.update(workouts)
    .set({ updatedAt: timestamp })
    .where(eq(workouts.id, workoutId))
    .run();
}

/**
 * Add a set to an exercise in the workout.
 */
export function addSetToExercise(
  workoutExerciseId: string,
  copyPrevious: boolean = true,
): FullWorkoutSet {
  const db = getDb();
  const timestamp = now();

  // Find existing sets to determine next setIndex and copy values
  const existingSets = db
    .select()
    .from(workoutSets)
    .where(
      and(
        eq(workoutSets.workoutExerciseId, workoutExerciseId),
        isNull(workoutSets.deletedAt),
      ),
    )
    .orderBy(desc(workoutSets.setIndex))
    .all();

  const lastSet = existingSets[0];
  const nextIndex = existingSets.length > 0 ? (lastSet.setIndex ?? 0) + 1 : 1;

  const setId = uuid();
  const newSetData = {
    id: setId,
    workoutExerciseId,
    setIndex: nextIndex,
    setType: lastSet?.setType ?? 'normal',
    weightKg: copyPrevious && lastSet ? lastSet.weightKg : null,
    reps: copyPrevious && lastSet ? lastSet.reps : null,
    isCompleted: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  db.insert(workoutSets).values(newSetData).run();

  return db.select().from(workoutSets).where(eq(workoutSets.id, setId)).get()!;
}

/**
 * Update a set's attributes (weight, reps, type, etc.) in SQLite.
 */
export function updateWorkoutSet(
  setId: string,
  updates: Partial<Pick<WorkoutSetRow, 'weightKg' | 'reps' | 'setType' | 'rpe' | 'durationSeconds' | 'distanceMeters'>>,
): void {
  const db = getDb();
  db.update(workoutSets)
    .set({ ...updates, updatedAt: now() })
    .where(eq(workoutSets.id, setId))
    .run();

  // If load, reps, or setType changed, trigger PR recomputation
  if (updates.weightKg !== undefined || updates.reps !== undefined || updates.setType !== undefined) {
    const s = db.select().from(workoutSets).where(eq(workoutSets.id, setId)).get();
    if (s && s.isCompleted) {
      const we = db.select().from(workoutExercises).where(eq(workoutExercises.id, s.workoutExerciseId)).get();
      if (we) {
        recomputeExercisePRsAfterEdit(we.exerciseId);
      }
    }
  }
}

/**
 * Toggle a set's completion status.
 * When completed:
 *   - Updates completedAt timestamp
 *   - Checks and records PRs into exercise_personal_records
 *   - Automatically starts the rest timer and persists to workouts table
 */
export function toggleSetCompleted(
  workoutId: string,
  setId: string,
  isCompleted: boolean,
): {
  isCompleted: boolean;
  newPRs: NewPRResult[];
  restTimer: { startedAt: string; durationSeconds: number } | null;
} {
  const db = getDb();
  const timestamp = now();

  // 1. Update the set completion state
  db.update(workoutSets)
    .set({
      isCompleted,
      completedAt: isCompleted ? timestamp : null,
      updatedAt: timestamp,
    })
    .where(eq(workoutSets.id, setId))
    .run();

  const setRow = db.select().from(workoutSets).where(eq(workoutSets.id, setId)).get();
  if (!setRow) return { isCompleted, newPRs: [], restTimer: null };

  const weRow = db
    .select()
    .from(workoutExercises)
    .where(eq(workoutExercises.id, setRow.workoutExerciseId))
    .get();

  if (!weRow) return { isCompleted, newPRs: [], restTimer: null };

  const exRow = db.select().from(exercises).where(eq(exercises.id, weRow.exerciseId)).get();
  if (!exRow) return { isCompleted, newPRs: [], restTimer: null };

  if (!isCompleted) {
    // Set was uncompleted -> recompute PRs to demote any PR achieved on this set
    recomputeExercisePRsAfterEdit(exRow.id);
    return { isCompleted: false, newPRs: [], restTimer: null };
  }

  // Current PRs for this exercise
  const currentPRRows = db
    .select()
    .from(exercisePersonalRecords)
    .where(
      and(
        eq(exercisePersonalRecords.exerciseId, exRow.id),
        eq(exercisePersonalRecords.isCurrent, true),
        isNull(exercisePersonalRecords.deletedAt),
      ),
    )
    .all();

  const candidate = {
    id: setRow.id,
    exerciseId: exRow.id,
    weightKg: setRow.weightKg,
    reps: setRow.reps,
    setType: setRow.setType,
    isCompleted: true,
    exerciseType: exRow.exerciseType,
    completedAt: timestamp,
  };

  const detectedPRs = detectNewPRs(candidate, currentPRRows as ExistingPR[]);

  // 3. Persist new PRs
  for (const pr of detectedPRs) {
    // Demote prior current record for this type
    db.update(exercisePersonalRecords)
      .set({ isCurrent: false, updatedAt: timestamp })
      .where(
        and(
          eq(exercisePersonalRecords.exerciseId, exRow.id),
          eq(exercisePersonalRecords.recordType, pr.recordType),
          eq(exercisePersonalRecords.isCurrent, true),
        ),
      )
      .run();

    // Insert new PR
    db.insert(exercisePersonalRecords)
      .values({
        id: uuid(),
        exerciseId: exRow.id,
        recordType: pr.recordType,
        value: pr.value,
        weightKg: pr.weightKg,
        workoutSetId: setRow.id,
        isCurrent: true,
        achievedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
  }

  // 4. Start rest timer
  const userSettings = db.select().from(settings).where(eq(settings.id, 'default')).get();
  const restDuration = exRow.defaultRestSeconds ?? userSettings?.defaultRestSeconds ?? 90;

  db.update(workouts)
    .set({
      restStartedAt: timestamp,
      restDurationSeconds: restDuration,
      updatedAt: timestamp,
    })
    .where(eq(workouts.id, workoutId))
    .run();

  return {
    isCompleted: true,
    newPRs: detectedPRs,
    restTimer: { startedAt: timestamp, durationSeconds: restDuration },
  };
}

/**
 * Delete a set from an exercise.
 */
export function deleteWorkoutSet(setId: string): void {
  const db = getDb();
  const timestamp = now();

  const s = db.select().from(workoutSets).where(eq(workoutSets.id, setId)).get();

  db.update(workoutSets)
    .set({ deletedAt: timestamp, updatedAt: timestamp })
    .where(eq(workoutSets.id, setId))
    .run();

  if (s && s.isCompleted) {
    const we = db.select().from(workoutExercises).where(eq(workoutExercises.id, s.workoutExerciseId)).get();
    if (we) {
      recomputeExercisePRsAfterEdit(we.exerciseId);
    }
  }
}

/**
 * Persist rest timer state to the workout.
 */
export function updateWorkoutRestTimer(
  workoutId: string,
  restStartedAt: string | null,
  restDurationSeconds: number | null,
): void {
  const db = getDb();
  db.update(workouts)
    .set({
      restStartedAt,
      restDurationSeconds,
      updatedAt: now(),
    })
    .where(eq(workouts.id, workoutId))
    .run();
}

/**
 * Update workout metadata (title, notes).
 */
export function updateWorkoutMeta(
  workoutId: string,
  updates: { title?: string; notes?: string },
): void {
  const db = getDb();
  db.update(workouts)
    .set({ ...updates, updatedAt: now() })
    .where(eq(workouts.id, workoutId))
    .run();
}

/**
 * Update workout exercise notes.
 */
export function updateWorkoutExerciseNotes(
  workoutExerciseId: string,
  notes: string | null,
): void {
  const db = getDb();
  db.update(workoutExercises)
    .set({ notes, updatedAt: now() })
    .where(eq(workoutExercises.id, workoutExerciseId))
    .run();
}

/**
 * Finish a workout — computes total volume and duration, marks completed.
 */
export function finishWorkout(
  workoutId: string,
  summary: { title?: string; notes?: string } = {},
): WorkoutRow {
  const db = getDb();
  const timestamp = now();

  const workout = db.select().from(workouts).where(eq(workouts.id, workoutId)).get()!;
  const startedTime = new Date(workout.startedAt).getTime();
  const finishedTime = new Date(timestamp).getTime();
  const durationSeconds = Math.max(0, Math.round((finishedTime - startedTime) / 1000));

  // Compute total volume
  const active = getActiveWorkout();
  let totalVolumeKg = 0;
  if (active) {
    const allSets = active.exercises.flatMap((e) =>
      e.sets.map((s) => ({
        weightKg: s.weightKg,
        reps: s.reps,
        setType: s.setType,
        isCompleted: s.isCompleted,
      })),
    );
    totalVolumeKg = calculateWorkoutVolume(allSets);
  }

  db.update(workouts)
    .set({
      status: 'completed',
      finishedAt: timestamp,
      durationSeconds,
      totalVolumeKg,
      restStartedAt: null,
      restDurationSeconds: null,
      title: summary.title ?? workout.title,
      notes: summary.notes ?? workout.notes,
      updatedAt: timestamp,
    })
    .where(eq(workouts.id, workoutId))
    .run();

  return db.select().from(workouts).where(eq(workouts.id, workoutId)).get()!;
}

/**
 * Discard an in-progress workout.
 */
export function discardWorkout(workoutId: string): void {
  const db = getDb();
  const timestamp = now();

  const weRows = db
    .select({ exerciseId: workoutExercises.exerciseId })
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId))
    .all();

  db.update(workouts)
    .set({
      status: 'discarded',
      deletedAt: timestamp,
      restStartedAt: null,
      restDurationSeconds: null,
      updatedAt: timestamp,
    })
    .where(eq(workouts.id, workoutId))
    .run();

  for (const { exerciseId } of weRows) {
    recomputeExercisePRsAfterEdit(exerciseId);
  }
}

/**
 * Replace an exercise in the active workout with a different exercise.
 */
export function replaceWorkoutExercise(
  workoutExerciseId: string,
  newExerciseId: string,
): FullWorkoutExercise | null {
  const db = getDb();
  const timestamp = now();

  const we = db
    .select()
    .from(workoutExercises)
    .where(eq(workoutExercises.id, workoutExerciseId))
    .get();
  if (!we) return null;

  const oldExerciseId = we.exerciseId;

  db.update(workoutExercises)
    .set({ exerciseId: newExerciseId, updatedAt: timestamp })
    .where(eq(workoutExercises.id, workoutExerciseId))
    .run();

  recomputeExercisePRsAfterEdit(oldExerciseId);
  recomputeExercisePRsAfterEdit(newExerciseId);

  const exRow = db.select().from(exercises).where(eq(exercises.id, newExerciseId)).get()!;
  const sets = db
    .select()
    .from(workoutSets)
    .where(
      and(
        eq(workoutSets.workoutExerciseId, we.id),
        isNull(workoutSets.deletedAt),
      ),
    )
    .orderBy(asc(workoutSets.setIndex))
    .all();

  return {
    ...we,
    exerciseId: newExerciseId,
    exercise: exRow,
    sets,
  };
}

/**
 * Create or assign a superset group for a list of workout exercises.
 */
export function createOrAssignSupersetGroup(
  workoutId: string,
  workoutExerciseIds: string[],
): string {
  const db = getDb();
  const timestamp = now();

  const existingGroups = db
    .select()
    .from(supersetGroups)
    .where(and(eq(supersetGroups.workoutId, workoutId), isNull(supersetGroups.deletedAt)))
    .all();

  const nextLabel = getNextSupersetLabel(existingGroups.map((g) => g.label));
  const newGroupId = uuid();

  db.insert(supersetGroups)
    .values({
      id: newGroupId,
      workoutId,
      label: nextLabel,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  for (const weId of workoutExerciseIds) {
    db.update(workoutExercises)
      .set({ supersetGroupId: newGroupId, updatedAt: timestamp })
      .where(eq(workoutExercises.id, weId))
      .run();
  }

  return newGroupId;
}

/**
 * Ungroup a workout exercise from its superset group.
 */
export function ungroupWorkoutExercise(workoutExerciseId: string): void {
  const db = getDb();
  const timestamp = now();

  const we = db
    .select()
    .from(workoutExercises)
    .where(eq(workoutExercises.id, workoutExerciseId))
    .get();
  if (!we || !we.supersetGroupId) return;

  const groupId = we.supersetGroupId;

  db.update(workoutExercises)
    .set({ supersetGroupId: null, updatedAt: timestamp })
    .where(eq(workoutExercises.id, workoutExerciseId))
    .run();

  // If 1 or 0 exercises remain in the group, dissolve it
  const remaining = db
    .select()
    .from(workoutExercises)
    .where(
      and(
        eq(workoutExercises.supersetGroupId, groupId),
        isNull(workoutExercises.deletedAt),
      ),
    )
    .all();

  if (remaining.length <= 1) {
    for (const rem of remaining) {
      db.update(workoutExercises)
        .set({ supersetGroupId: null, updatedAt: timestamp })
        .where(eq(workoutExercises.id, rem.id))
        .run();
    }
    db.update(supersetGroups)
      .set({ deletedAt: timestamp, updatedAt: timestamp })
      .where(eq(supersetGroups.id, groupId))
      .run();
  }
}

/**
 * Get performance of a set from the most recent completed workout.
 */
export interface PreviousSetPerformance {
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
}

export function getPreviousSetPerformance(
  exerciseId: string,
  setIndex: number,
  currentWorkoutId?: string,
): PreviousSetPerformance | null {
  const db = getDb();

  const conditions = [
    eq(workoutExercises.exerciseId, exerciseId),
    eq(workouts.status, 'completed'),
    isNull(workouts.deletedAt),
    isNull(workoutExercises.deletedAt),
    isNull(workoutSets.deletedAt),
    eq(workoutSets.isCompleted, true),
  ];

  if (currentWorkoutId) {
    conditions.push(ne(workouts.id, currentWorkoutId));
  }

  const rows = db
    .select({
      weightKg: workoutSets.weightKg,
      reps: workoutSets.reps,
      rpe: workoutSets.rpe,
      setIndex: workoutSets.setIndex,
      startedAt: workouts.startedAt,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(...conditions))
    .orderBy(desc(workouts.startedAt), asc(workoutSets.setIndex))
    .all();

  if (rows.length === 0) return null;

  const latestStartedAt = rows[0].startedAt;
  const latestWorkoutSets = rows.filter((r) => r.startedAt === latestStartedAt);

  const exact = latestWorkoutSets.find((r) => r.setIndex === setIndex);
  if (exact) {
    return { weightKg: exact.weightKg, reps: exact.reps, rpe: exact.rpe };
  }

  const fallback =
    latestWorkoutSets[setIndex - 1] ?? latestWorkoutSets[latestWorkoutSets.length - 1];
  return fallback
    ? { weightKg: fallback.weightKg, reps: fallback.reps, rpe: fallback.rpe }
    : null;
}

/**
 * Recompute PR history for an exercise after an edit, deletion, or set change.
 * Enforces the append-only PR invariant while ensuring `is_current` is strictly accurate.
 */
export function recomputeExercisePRsAfterEdit(exerciseId: string): void {
  const db = getDb();
  const timestamp = now();

  const setRows = db
    .select({
      id: workoutSets.id,
      exerciseId: workoutExercises.exerciseId,
      weightKg: workoutSets.weightKg,
      reps: workoutSets.reps,
      setType: workoutSets.setType,
      isCompleted: workoutSets.isCompleted,
      exerciseType: exercises.exerciseType,
      completedAt: workoutSets.completedAt,
      createdAt: workoutSets.createdAt,
      workoutStartedAt: workouts.startedAt,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(
      and(
        eq(workoutExercises.exerciseId, exerciseId),
        eq(workoutSets.isCompleted, true),
        isNull(workoutSets.deletedAt),
        isNull(workoutExercises.deletedAt),
        isNull(workouts.deletedAt),
        ne(workouts.status, 'discarded'),
      ),
    )
    .all();

  const candidateSets: CandidateSet[] = setRows
    .map((s) => ({
      id: s.id,
      exerciseId: s.exerciseId,
      weightKg: s.weightKg,
      reps: s.reps,
      setType: s.setType,
      isCompleted: s.isCompleted,
      exerciseType: s.exerciseType,
      completedAt: s.completedAt || s.workoutStartedAt || s.createdAt,
    }))
    .sort(
      (a, b) =>
        new Date(a.completedAt ?? 0).getTime() - new Date(b.completedAt ?? 0).getTime(),
    );

  const recalculatedPRs = recomputeExercisePRHistory(candidateSets);

  // Demote old PR records
  db.update(exercisePersonalRecords)
    .set({ isCurrent: false, updatedAt: timestamp })
    .where(
      and(
        eq(exercisePersonalRecords.exerciseId, exerciseId),
        eq(exercisePersonalRecords.isCurrent, true),
      ),
    )
    .run();

  // Insert recalculated PRs
  for (const pr of recalculatedPRs) {
    db.insert(exercisePersonalRecords)
      .values({
        id: uuid(),
        exerciseId: pr.exerciseId,
        recordType: pr.recordType,
        value: pr.value,
        weightKg: pr.weightKg ?? null,
        workoutSetId: pr.workoutSetId!,
        isCurrent: pr.isCurrent ?? true,
        achievedAt: pr.achievedAt ?? timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
  }
}

/**
 * Helper to generate time-of-day workout title.
 */
function getDefaultWorkoutTitle(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning Workout';
  if (hour < 17) return 'Afternoon Workout';
  return 'Evening Workout';
}

// ────────────────────────────────────────────────────────────────────
// Completed Workouts & History Queries
// ────────────────────────────────────────────────────────────────────

export interface CompletedWorkoutSummary {
  id: string;
  title: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  totalVolumeKg: number | null;
  prCount: number;
  exerciseSummaries: Array<{
    exerciseId: string;
    name: string;
    setCount: number;
    bestSetSummary: string | null;
  }>;
}

export function getCompletedWorkouts(options?: {
  date?: string; // YYYY-MM-DD filter
  limit?: number;
  offset?: number;
}): CompletedWorkoutSummary[] {
  const db = getDb();

  const conditions = [
    eq(workouts.status, 'completed'),
    isNull(workouts.deletedAt),
  ];

  if (options?.date) {
    conditions.push(sql`substr(${workouts.startedAt}, 1, 10) = ${options.date}`);
  }

  let workoutQuery = db
    .select({
      id: workouts.id,
      title: workouts.title,
      startedAt: workouts.startedAt,
      finishedAt: workouts.finishedAt,
      durationSeconds: workouts.durationSeconds,
      notes: workouts.notes,
      totalVolumeKg: workouts.totalVolumeKg,
    })
    .from(workouts)
    .where(and(...conditions))
    .orderBy(desc(workouts.startedAt));

  if (options?.limit != null) {
    workoutQuery = (workoutQuery as any).limit(options.limit);
  }
  if (options?.offset != null) {
    workoutQuery = (workoutQuery as any).offset(options.offset);
  }

  const pageWorkouts = workoutQuery.all();
  if (pageWorkouts.length === 0) return [];

  const workoutIds = pageWorkouts.map((w) => w.id);

  // Bulk query 1: Fetch exercises for these page workouts
  const exerciseRows = db
    .select({
      workoutId: workoutExercises.workoutId,
      workoutExerciseId: workoutExercises.id,
      exerciseId: workoutExercises.exerciseId,
      name: exercises.name,
      sortOrder: workoutExercises.sortOrder,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(
      and(
        inArray(workoutExercises.workoutId, workoutIds),
        isNull(workoutExercises.deletedAt),
      ),
    )
    .orderBy(asc(workoutExercises.sortOrder))
    .all();

  const weIds = exerciseRows.map((e) => e.workoutExerciseId);

  // Bulk query 2: Fetch completed sets for these exercises
  const setsByWeId: Record<
    string,
    Array<{ id: string; weightKg: number | null; reps: number | null }>
  > = {};
  const allSetIds: string[] = [];

  if (weIds.length > 0) {
    const setRows = db
      .select({
        id: workoutSets.id,
        workoutExerciseId: workoutSets.workoutExerciseId,
        weightKg: workoutSets.weightKg,
        reps: workoutSets.reps,
      })
      .from(workoutSets)
      .where(
        and(
          inArray(workoutSets.workoutExerciseId, weIds),
          eq(workoutSets.isCompleted, true),
          isNull(workoutSets.deletedAt),
        ),
      )
      .orderBy(asc(workoutSets.setIndex))
      .all();

    for (const s of setRows) {
      allSetIds.push(s.id);
      if (!setsByWeId[s.workoutExerciseId]) {
        setsByWeId[s.workoutExerciseId] = [];
      }
      setsByWeId[s.workoutExerciseId].push(s);
    }
  }

  // Bulk query 3: Fetch PR set IDs for these sets in ONE query
  const prSetIds = new Set<string>();
  if (allSetIds.length > 0) {
    const prRows = db
      .select({ workoutSetId: exercisePersonalRecords.workoutSetId })
      .from(exercisePersonalRecords)
      .where(
        and(
          inArray(exercisePersonalRecords.workoutSetId, allSetIds),
          isNull(exercisePersonalRecords.deletedAt),
        ),
      )
      .all();

    for (const pr of prRows) {
      prSetIds.add(pr.workoutSetId);
    }
  }

  // Aggregate into map in O(N) linear time
  const workoutDataMap: Record<
    string,
    {
      prCount: number;
      exerciseSummaries: Array<{
        exerciseId: string;
        name: string;
        setCount: number;
        bestSetSummary: string | null;
      }>;
    }
  > = {};

  for (const wId of workoutIds) {
    workoutDataMap[wId] = { prCount: 0, exerciseSummaries: [] };
  }

  for (const we of exerciseRows) {
    const sets = setsByWeId[we.workoutExerciseId] ?? [];
    let maxWeight = -1;
    let maxReps = -1;

    for (const s of sets) {
      if (prSetIds.has(s.id)) {
        if (workoutDataMap[we.workoutId]) {
          workoutDataMap[we.workoutId].prCount++;
        }
      }
      const wt = s.weightKg ?? 0;
      const reps = s.reps ?? 0;
      if (wt > maxWeight || (wt === maxWeight && reps > maxReps)) {
        maxWeight = wt;
        maxReps = reps;
      }
    }

    let bestSetText: string | null = null;
    if (maxWeight > 0) {
      bestSetText = `${maxWeight} kg × ${maxReps}`;
    } else if (maxReps > 0) {
      bestSetText = `${maxReps} reps`;
    }

    if (workoutDataMap[we.workoutId]) {
      workoutDataMap[we.workoutId].exerciseSummaries.push({
        exerciseId: we.exerciseId,
        name: we.name,
        setCount: sets.length,
        bestSetSummary: bestSetText,
      });
    }
  }

  return pageWorkouts.map((w) => {
    const data = workoutDataMap[w.id] ?? { prCount: 0, exerciseSummaries: [] };
    return {
      id: w.id,
      title: w.title,
      startedAt: w.startedAt,
      finishedAt: w.finishedAt,
      durationSeconds: w.durationSeconds,
      notes: w.notes,
      totalVolumeKg: w.totalVolumeKg,
      prCount: data.prCount,
      exerciseSummaries: data.exerciseSummaries,
    };
  });
}

/**
 * Returns distinct YYYY-MM-DD dates that contain completed workouts.
 */
export function getCompletedWorkoutDates(): string[] {
  const db = getDb();
  const rows = db
    .select({ startedAt: workouts.startedAt })
    .from(workouts)
    .where(and(eq(workouts.status, 'completed'), isNull(workouts.deletedAt)))
    .orderBy(desc(workouts.startedAt))
    .all();

  const set = new Set<string>();
  for (const r of rows) {
    if (r.startedAt) {
      set.add(r.startedAt.slice(0, 10));
    }
  }
  return Array.from(set);
}

export interface DetailedWorkoutExercise extends FullWorkoutExercise {
  supersetLabel?: string | null;
  setsWithPRs: Array<
    FullWorkoutSet & {
      prTypes: PrType[];
    }
  >;
}

export interface CompletedWorkoutDetail extends WorkoutRow {
  exercises: DetailedWorkoutExercise[];
}

/**
 * Get complete workout details including exercises, sets, supersets, and PR badges.
 */
export function getCompletedWorkoutDetail(workoutId: string): CompletedWorkoutDetail | null {
  const db = getDb();

  const wRow = db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), isNull(workouts.deletedAt)))
    .get();

  if (!wRow) return null;

  const weRows = db
    .select()
    .from(workoutExercises)
    .where(and(eq(workoutExercises.workoutId, wRow.id), isNull(workoutExercises.deletedAt)))
    .orderBy(asc(workoutExercises.sortOrder))
    .all();

  const detailedExercises: DetailedWorkoutExercise[] = [];

  for (const we of weRows) {
    const exRow = db
      .select()
      .from(exercises)
      .where(eq(exercises.id, we.exerciseId))
      .get();

    if (!exRow) continue;

    let supersetLabel: string | null = null;
    if (we.supersetGroupId) {
      const sg = db
        .select({ label: supersetGroups.label })
        .from(supersetGroups)
        .where(eq(supersetGroups.id, we.supersetGroupId))
        .get();
      supersetLabel = sg?.label ?? null;
    }

    const sets = db
      .select()
      .from(workoutSets)
      .where(
        and(
          eq(workoutSets.workoutExerciseId, we.id),
          isNull(workoutSets.deletedAt),
        ),
      )
      .orderBy(asc(workoutSets.setIndex))
      .all();

    const setsWithPRs = sets.map((s) => {
      const prRows = db
        .select({ recordType: exercisePersonalRecords.recordType })
        .from(exercisePersonalRecords)
        .where(
          and(
            eq(exercisePersonalRecords.workoutSetId, s.id),
            isNull(exercisePersonalRecords.deletedAt),
          ),
        )
        .all();

      return {
        ...s,
        prTypes: prRows.map((r) => r.recordType as PrType),
      };
    });

    detailedExercises.push({
      ...we,
      exercise: exRow,
      sets,
      supersetLabel,
      setsWithPRs,
    });
  }

  return {
    ...wRow,
    exercises: detailedExercises,
  };
}

/**
 * Update completed workout metadata (title, date/time, notes).
 */
export function updateCompletedWorkout(
  workoutId: string,
  data: {
    title?: string;
    startedAt?: string;
    notes?: string;
  },
): void {
  const db = getDb();
  const timestamp = now();

  const updates: Record<string, any> = { updatedAt: timestamp };
  if (data.title !== undefined) updates.title = data.title;
  if (data.startedAt !== undefined) updates.startedAt = data.startedAt;
  if (data.notes !== undefined) updates.notes = data.notes;

  db.update(workouts).set(updates).where(eq(workouts.id, workoutId)).run();
}

/**
 * Update a set in a completed workout and recalculate volume and PRs.
 */
export function updateCompletedWorkoutSet(
  setId: string,
  data: {
    weightKg?: number | null;
    reps?: number | null;
    rpe?: number | null;
    setType?: SetType;
    isCompleted?: boolean;
    durationSeconds?: number | null;
    distanceMeters?: number | null;
  },
): void {
  const db = getDb();
  const timestamp = now();

  // Find workoutExercise and workout
  const setRow = db
    .select({
      workoutExerciseId: workoutSets.workoutExerciseId,
    })
    .from(workoutSets)
    .where(eq(workoutSets.id, setId))
    .get();

  if (!setRow) return;

  const weRow = db
    .select({
      workoutId: workoutExercises.workoutId,
      exerciseId: workoutExercises.exerciseId,
    })
    .from(workoutExercises)
    .where(eq(workoutExercises.id, setRow.workoutExerciseId))
    .get();

  if (!weRow) return;

  const updates: Record<string, any> = { updatedAt: timestamp };
  if (data.weightKg !== undefined) updates.weightKg = data.weightKg;
  if (data.reps !== undefined) updates.reps = data.reps;
  if (data.rpe !== undefined) updates.rpe = data.rpe;
  if (data.setType !== undefined) updates.setType = data.setType;
  if (data.isCompleted !== undefined) {
    updates.isCompleted = data.isCompleted;
    if (data.isCompleted) updates.completedAt = timestamp;
  }
  if (data.durationSeconds !== undefined) updates.durationSeconds = data.durationSeconds;
  if (data.distanceMeters !== undefined) updates.distanceMeters = data.distanceMeters;

  db.update(workoutSets).set(updates).where(eq(workoutSets.id, setId)).run();

  // Recalculate workout volume
  recalculateWorkoutTotalVolume(weRow.workoutId);

  // Recompute PRs for this exercise
  recomputeExercisePRsAfterEdit(weRow.exerciseId);
}

/**
 * Add a set to an exercise in a completed workout.
 */
export function addSetToCompletedWorkout(
  workoutExerciseId: string,
  data?: {
    weightKg?: number | null;
    reps?: number | null;
    setType?: SetType;
  },
): void {
  const db = getDb();
  const timestamp = now();

  const weRow = db
    .select({ workoutId: workoutExercises.workoutId, exerciseId: workoutExercises.exerciseId })
    .from(workoutExercises)
    .where(eq(workoutExercises.id, workoutExerciseId))
    .get();

  if (!weRow) return;

  const existingSets = db
    .select()
    .from(workoutSets)
    .where(
      and(
        eq(workoutSets.workoutExerciseId, workoutExerciseId),
        isNull(workoutSets.deletedAt),
      ),
    )
    .all();

  const nextIndex = existingSets.length + 1;
  const lastSet = existingSets[existingSets.length - 1];

  const id = uuid();
  db.insert(workoutSets)
    .values({
      id,
      workoutExerciseId,
      setIndex: nextIndex,
      setType: data?.setType ?? lastSet?.setType ?? 'normal',
      weightKg: data?.weightKg ?? lastSet?.weightKg ?? 20,
      reps: data?.reps ?? lastSet?.reps ?? 10,
      isCompleted: true,
      completedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  recalculateWorkoutTotalVolume(weRow.workoutId);
  recomputeExercisePRsAfterEdit(weRow.exerciseId);
}

/**
 * Delete a set from a completed workout.
 */
export function deleteSetFromCompletedWorkout(setId: string): void {
  const db = getDb();
  const timestamp = now();

  const setRow = db
    .select({ workoutExerciseId: workoutSets.workoutExerciseId })
    .from(workoutSets)
    .where(eq(workoutSets.id, setId))
    .get();

  if (!setRow) return;

  const weRow = db
    .select({ workoutId: workoutExercises.workoutId, exerciseId: workoutExercises.exerciseId })
    .from(workoutExercises)
    .where(eq(workoutExercises.id, setRow.workoutExerciseId))
    .get();

  if (!weRow) return;

  db.update(workoutSets)
    .set({ deletedAt: timestamp, updatedAt: timestamp })
    .where(eq(workoutSets.id, setId))
    .run();

  // Renumber remaining sets
  const remaining = db
    .select()
    .from(workoutSets)
    .where(
      and(
        eq(workoutSets.workoutExerciseId, setRow.workoutExerciseId),
        isNull(workoutSets.deletedAt),
      ),
    )
    .orderBy(asc(workoutSets.setIndex))
    .all();

  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].setIndex !== i + 1) {
      db.update(workoutSets)
        .set({ setIndex: i + 1, updatedAt: timestamp })
        .where(eq(workoutSets.id, remaining[i].id))
        .run();
    }
  }

  recalculateWorkoutTotalVolume(weRow.workoutId);
  recomputeExercisePRsAfterEdit(weRow.exerciseId);
}

/**
 * Delete a completed workout and all its contents, and recompute PRs for all affected exercises.
 */
export function deleteCompletedWorkout(workoutId: string): void {
  const db = getDb();
  const timestamp = now();

  // Collect affected exercises
  const weRows = db
    .select({ exerciseId: workoutExercises.exerciseId })
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId))
    .all();

  const affectedExerciseIds = Array.from(new Set(weRows.map((we) => we.exerciseId)));

  // Soft-delete workout, exercises, sets
  db.update(workoutSets)
    .set({ deletedAt: timestamp, updatedAt: timestamp })
    .where(
      and(
        isNull(workoutSets.deletedAt),
      ),
    )
    .run();

  db.update(workoutExercises)
    .set({ deletedAt: timestamp, updatedAt: timestamp })
    .where(eq(workoutExercises.workoutId, workoutId))
    .run();

  db.update(workouts)
    .set({ deletedAt: timestamp, status: 'discarded', updatedAt: timestamp })
    .where(eq(workouts.id, workoutId))
    .run();

  // Recompute PRs for each affected exercise
  for (const exId of affectedExerciseIds) {
    recomputeExercisePRsAfterEdit(exId);
  }
}

/**
 * Recalculate and update the total_volume_kg field on a workout.
 */
function recalculateWorkoutTotalVolume(workoutId: string): void {
  const db = getDb();
  const weRows = db
    .select({ id: workoutExercises.id, exerciseId: workoutExercises.exerciseId })
    .from(workoutExercises)
    .where(and(eq(workoutExercises.workoutId, workoutId), isNull(workoutExercises.deletedAt)))
    .all();

  let totalVol = 0;
  for (const we of weRows) {
    const ex = db.select().from(exercises).where(eq(exercises.id, we.exerciseId)).get();
    const sets = db
      .select()
      .from(workoutSets)
      .where(
        and(
          eq(workoutSets.workoutExerciseId, we.id),
          eq(workoutSets.isCompleted, true),
          isNull(workoutSets.deletedAt),
        ),
      )
      .all();

    totalVol += calculateWorkoutVolume(sets, ex?.exerciseType ?? 'weight_reps');
  }

  db.update(workouts)
    .set({ totalVolumeKg: Math.round(totalVol * 100) / 100, updatedAt: now() })
    .where(eq(workouts.id, workoutId))
    .run();
}

// ────────────────────────────────────────────────────────────────────
// Exercise History, PRs, and Comparison Queries
// ────────────────────────────────────────────────────────────────────

export interface ExerciseHistorySet {
  id: string;
  setIndex: number;
  setType: string;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  isCompleted: boolean;
  estimated1rm: number;
  prBadges: string[];
}

export interface ExerciseHistorySession {
  workoutId: string;
  workoutTitle: string;
  workoutDate: string;
  sets: ExerciseHistorySet[];
  totalVolumeKg: number;
  bestSet: { weightKg: number; reps: number } | null;
}

/**
 * Returns complete history of an exercise grouped by workout session, ordered newest first.
 */
export function getExerciseHistory(exerciseId: string): ExerciseHistorySession[] {
  const db = getDb();

  const weRows = db
    .select({
      id: workoutExercises.id,
      workoutId: workoutExercises.workoutId,
      workoutTitle: workouts.title,
      workoutDate: workouts.startedAt,
    })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(
      and(
        eq(workoutExercises.exerciseId, exerciseId),
        eq(workouts.status, 'completed'),
        isNull(workoutExercises.deletedAt),
        isNull(workouts.deletedAt),
      ),
    )
    .orderBy(desc(workouts.startedAt))
    .all();

  const sessions: ExerciseHistorySession[] = [];

  for (const we of weRows) {
    const sets = db
      .select()
      .from(workoutSets)
      .where(
        and(
          eq(workoutSets.workoutExerciseId, we.id),
          eq(workoutSets.isCompleted, true),
          isNull(workoutSets.deletedAt),
        ),
      )
      .orderBy(asc(workoutSets.setIndex))
      .all();

    if (sets.length === 0) continue;

    let totalVol = 0;
    let maxWeight = -1;
    let maxReps = -1;

    const historySets: ExerciseHistorySet[] = [];

    for (const s of sets) {
      const wt = s.weightKg ?? 0;
      const reps = s.reps ?? 0;
      const vol = calculateWorkoutVolume([s], 'weight_reps');
      totalVol += vol;

      if (wt > maxWeight || (wt === maxWeight && reps > maxReps)) {
        maxWeight = wt;
        maxReps = reps;
      }

      // Check PRs for this set
      const prs = db
        .select({ recordType: exercisePersonalRecords.recordType })
        .from(exercisePersonalRecords)
        .where(
          and(
            eq(exercisePersonalRecords.workoutSetId, s.id),
            isNull(exercisePersonalRecords.deletedAt),
          ),
        )
        .all();

      const badgeNames: string[] = [];
      for (const pr of prs) {
        if (pr.recordType === 'max_weight') badgeNames.push('Max Weight');
        else if (pr.recordType === 'best_1rm') badgeNames.push('Best 1RM');
        else if (pr.recordType === 'best_set_volume') badgeNames.push('Set Vol');
        else if (pr.recordType === 'max_reps_at_weight') badgeNames.push('Max Reps');
      }

      historySets.push({
        id: s.id,
        setIndex: s.setIndex,
        setType: s.setType,
        weightKg: s.weightKg,
        reps: s.reps,
        rpe: s.rpe,
        durationSeconds: s.durationSeconds,
        distanceMeters: s.distanceMeters,
        isCompleted: s.isCompleted,
        estimated1rm: Math.round(calculateWorkoutVolume([s], 'weight_reps') > 0 ? (s.weightKg ?? 0) * (1 + (s.reps ?? 0) / 30) : 0),
        prBadges: badgeNames,
      });
    }

    sessions.push({
      workoutId: we.workoutId,
      workoutTitle: we.workoutTitle ?? 'Workout',
      workoutDate: we.workoutDate,
      sets: historySets,
      totalVolumeKg: Math.round(totalVol * 100) / 100,
      bestSet: maxWeight > 0 ? { weightKg: maxWeight, reps: maxReps } : null,
    });
  }

  return sessions;
}

export interface ExercisePRItem {
  id: string;
  recordType: PrType;
  value: number;
  weightKg: number | null;
  achievedAt: string;
  workoutSetId: string;
  reps?: number | null;
}

/**
 * Returns current personal records for an exercise.
 */
export function getExercisePRs(exerciseId: string): ExercisePRItem[] {
  const db = getDb();

  const prRows = db
    .select({
      id: exercisePersonalRecords.id,
      recordType: exercisePersonalRecords.recordType,
      value: exercisePersonalRecords.value,
      weightKg: exercisePersonalRecords.weightKg,
      achievedAt: exercisePersonalRecords.achievedAt,
      workoutSetId: exercisePersonalRecords.workoutSetId,
      reps: workoutSets.reps,
    })
    .from(exercisePersonalRecords)
    .innerJoin(workoutSets, eq(exercisePersonalRecords.workoutSetId, workoutSets.id))
    .where(
      and(
        eq(exercisePersonalRecords.exerciseId, exerciseId),
        eq(exercisePersonalRecords.isCurrent, true),
        isNull(exercisePersonalRecords.deletedAt),
      ),
    )
    .orderBy(asc(exercisePersonalRecords.recordType))
    .all();

  return prRows.map((r) => ({
    id: r.id,
    recordType: r.recordType as PrType,
    value: r.value,
    weightKg: r.weightKg,
    achievedAt: r.achievedAt,
    workoutSetId: r.workoutSetId,
    reps: r.reps,
  }));
}

export interface GlobalPRItem {
  id: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: string;
  equipment: string;
  recordType: PrType;
  value: number;
  weightKg: number | null;
  reps: number | null;
  achievedAt: string;
}

/**
 * Returns all current PRs across all exercises for the Personal Records Board.
 */
export function getAllPersonalRecords(): GlobalPRItem[] {
  const db = getDb();

  const rows = db
    .select({
      id: exercisePersonalRecords.id,
      exerciseId: exercisePersonalRecords.exerciseId,
      exerciseName: exercises.name,
      primaryMuscle: exercises.primaryMuscle,
      equipment: exercises.equipment,
      recordType: exercisePersonalRecords.recordType,
      value: exercisePersonalRecords.value,
      weightKg: exercisePersonalRecords.weightKg,
      achievedAt: exercisePersonalRecords.achievedAt,
      reps: workoutSets.reps,
    })
    .from(exercisePersonalRecords)
    .innerJoin(exercises, eq(exercisePersonalRecords.exerciseId, exercises.id))
    .innerJoin(workoutSets, eq(exercisePersonalRecords.workoutSetId, workoutSets.id))
    .where(
      and(
        eq(exercisePersonalRecords.isCurrent, true),
        isNull(exercisePersonalRecords.deletedAt),
      ),
    )
    .orderBy(desc(exercisePersonalRecords.achievedAt))
    .all();

  return rows.map((r) => ({
    id: r.id,
    exerciseId: r.exerciseId,
    exerciseName: r.exerciseName,
    primaryMuscle: r.primaryMuscle,
    equipment: r.equipment,
    recordType: r.recordType as PrType,
    value: r.value,
    weightKg: r.weightKg,
    reps: r.reps,
    achievedAt: r.achievedAt,
  }));
}

/**
 * Compares two most recent sessions for an exercise (or session for workoutId vs previous session).
 */
export function getPastSessionComparisonForExercise(
  exerciseId: string,
  currentWorkoutId?: string,
) {
  const history = getExerciseHistory(exerciseId);
  if (history.length < 2) return null;

  let currentIndex = 0;
  if (currentWorkoutId) {
    const idx = history.findIndex((h) => h.workoutId === currentWorkoutId);
    if (idx !== -1) currentIndex = idx;
  }

  const currentSession = history[currentIndex];
  const previousSession = history[currentIndex + 1];

  if (!currentSession || !previousSession) return null;

  const currentSets = currentSession.sets.map((s) => ({
    setIndex: s.setIndex,
    weightKg: s.weightKg,
    reps: s.reps,
    setType: s.setType,
    isCompleted: s.isCompleted,
  }));

  const previousSets = previousSession.sets.map((s) => ({
    setIndex: s.setIndex,
    weightKg: s.weightKg,
    reps: s.reps,
    setType: s.setType,
    isCompleted: s.isCompleted,
  }));

  const comparison = compareExerciseSessions(currentSets, previousSets);

  return {
    currentSessionDate: currentSession.workoutDate,
    previousSessionDate: previousSession.workoutDate,
    currentSessionTitle: currentSession.workoutTitle,
    previousSessionTitle: previousSession.workoutTitle,
    ...comparison,
  };
}
