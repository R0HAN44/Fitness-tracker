/**
 * Routine queries and operations — full CRUD, folder management, starter presets,
 * and routine-to-workout / workout-to-routine copies.
 */

import { eq, and, isNull, desc, asc } from 'drizzle-orm';
import { getDb } from '../client';
import {
  routines,
  routineFolders,
  routineExercises,
  routineSets,
  supersetGroups,
  exercises,
  workouts,
  workoutExercises,
  workoutSets,
} from '../schema';
import { generateId as uuid, now } from '../../lib/uuid';
import { STARTER_ROUTINES } from '../../domain/routines';
import type { ExerciseRow } from './exercises';

export type RoutineRow = typeof routines.$inferSelect;
export type RoutineFolderRow = typeof routineFolders.$inferSelect;
export type RoutineExerciseRow = typeof routineExercises.$inferSelect;
export type RoutineSetRow = typeof routineSets.$inferSelect;

export interface FullRoutineSet extends RoutineSetRow {}

export interface FullRoutineExercise extends RoutineExerciseRow {
  exercise: ExerciseRow;
  sets: FullRoutineSet[];
}

export interface FullRoutine extends RoutineRow {
  folder?: RoutineFolderRow | null;
  exercises: FullWorkoutRoutineExercise[];
}

export type FullWorkoutRoutineExercise = FullRoutineExercise;

export interface CreateRoutineInput {
  name: string;
  folderId?: string | null;
  notes?: string | null;
  isPreset?: boolean;
  exercises: Array<{
    exerciseId: string;
    restSeconds?: number | null;
    notes?: string | null;
    supersetGroupId?: string | null;
    sets: Array<{
      setType?: string;
      targetWeightKg?: number | null;
      targetReps?: number | null;
      targetRpe?: number | null;
      targetDurationSeconds?: number | null;
    }>;
  }>;
}

// ────────────────────────────────────────────────────────────────────
// Folder Operations
// ────────────────────────────────────────────────────────────────────

export function getRoutineFolders(): RoutineFolderRow[] {
  const db = getDb();
  return db
    .select()
    .from(routineFolders)
    .where(isNull(routineFolders.deletedAt))
    .orderBy(asc(routineFolders.sortOrder), asc(routineFolders.name))
    .all();
}

export function createRoutineFolder(name: string): RoutineFolderRow {
  const db = getDb();
  const timestamp = now();
  const id = uuid();

  db.insert(routineFolders)
    .values({
      id,
      name,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return db.select().from(routineFolders).where(eq(routineFolders.id, id)).get()!;
}

export function updateRoutineFolder(id: string, name: string): void {
  const db = getDb();
  db.update(routineFolders)
    .set({ name, updatedAt: now() })
    .where(eq(routineFolders.id, id))
    .run();
}

export function deleteRoutineFolder(id: string): void {
  const db = getDb();
  const timestamp = now();

  // Move routines inside this folder to root (folderId = null)
  db.update(routines)
    .set({ folderId: null, updatedAt: timestamp })
    .where(eq(routines.folderId, id))
    .run();

  // Soft delete folder
  db.update(routineFolders)
    .set({ deletedAt: timestamp, updatedAt: timestamp })
    .where(eq(routineFolders.id, id))
    .run();
}

// ────────────────────────────────────────────────────────────────────
// Routine CRUD Operations
// ────────────────────────────────────────────────────────────────────

export function getRoutines(options: { folderId?: string | null } = {}): FullRoutine[] {
  const db = getDb();
  const conditions = [isNull(routines.deletedAt)];

  if (options.folderId !== undefined) {
    if (options.folderId === null) {
      conditions.push(isNull(routines.folderId));
    } else {
      conditions.push(eq(routines.folderId, options.folderId));
    }
  }

  const routineRows = db
    .select()
    .from(routines)
    .where(and(...conditions))
    .orderBy(asc(routines.sortOrder), asc(routines.name))
    .all();

  return routineRows.map((r) => getRoutineById(r.id)!);
}

export function getRoutineById(id: string): FullRoutine | null {
  const db = getDb();
  const rRow = db
    .select()
    .from(routines)
    .where(and(eq(routines.id, id), isNull(routines.deletedAt)))
    .get();

  if (!rRow) return null;

  const folder = rRow.folderId
    ? db
        .select()
        .from(routineFolders)
        .where(eq(routineFolders.id, rRow.folderId))
        .get() ?? null
    : null;

  const reRows = db
    .select()
    .from(routineExercises)
    .where(
      and(
        eq(routineExercises.routineId, rRow.id),
        isNull(routineExercises.deletedAt),
      ),
    )
    .orderBy(asc(routineExercises.sortOrder))
    .all();

  const fullExercises: FullRoutineExercise[] = [];

  for (const re of reRows) {
    const ex = db.select().from(exercises).where(eq(exercises.id, re.exerciseId)).get();
    if (!ex) continue;

    const sets = db
      .select()
      .from(routineSets)
      .where(
        and(
          eq(routineSets.routineExerciseId, re.id),
          isNull(routineSets.deletedAt),
        ),
      )
      .orderBy(asc(routineSets.setIndex))
      .all();

    fullExercises.push({
      ...re,
      exercise: ex,
      sets,
    });
  }

  return {
    ...rRow,
    folder,
    exercises: fullExercises,
  };
}

export function createRoutine(input: CreateRoutineInput): FullRoutine {
  const db = getDb();
  const timestamp = now();
  const routineId = uuid();

  db.insert(routines)
    .values({
      id: routineId,
      name: input.name,
      folderId: input.folderId ?? null,
      notes: input.notes ?? null,
      isPreset: input.isPreset ?? false,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  input.exercises.forEach((exItem, exIdx) => {
    const reId = uuid();
    db.insert(routineExercises)
      .values({
        id: reId,
        routineId,
        exerciseId: exItem.exerciseId,
        sortOrder: exIdx + 1,
        restSeconds: exItem.restSeconds ?? null,
        supersetGroupId: exItem.supersetGroupId ?? null,
        notes: exItem.notes ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    exItem.sets.forEach((setItem, sIdx) => {
      db.insert(routineSets)
        .values({
          id: uuid(),
          routineExerciseId: reId,
          setIndex: sIdx + 1,
          setType: setItem.setType ?? 'normal',
          targetWeightKg: setItem.targetWeightKg ?? null,
          targetReps: setItem.targetReps ?? null,
          targetRpe: setItem.targetRpe ?? null,
          targetDurationSeconds: setItem.targetDurationSeconds ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .run();
    });
  });

  return getRoutineById(routineId)!;
}

export function updateRoutine(
  routineId: string,
  updates: Partial<Pick<RoutineRow, 'name' | 'folderId' | 'notes'>>,
): void {
  const db = getDb();
  db.update(routines)
    .set({ ...updates, updatedAt: now() })
    .where(eq(routines.id, routineId))
    .run();
}

export function duplicateRoutine(routineId: string): FullRoutine {
  const original = getRoutineById(routineId);
  if (!original) throw new Error('Routine not found');

  return createRoutine({
    name: `${original.name} (Copy)`,
    folderId: original.folderId,
    notes: original.notes,
    isPreset: false,
    exercises: original.exercises.map((re) => ({
      exerciseId: re.exerciseId,
      restSeconds: re.restSeconds,
      notes: re.notes,
      supersetGroupId: null, // Reset superset group ID on duplicate for independence
      sets: re.sets.map((s) => ({
        setType: s.setType,
        targetWeightKg: s.targetWeightKg,
        targetReps: s.targetReps,
        targetRpe: s.targetRpe,
        targetDurationSeconds: s.targetDurationSeconds,
      })),
    })),
  });
}

export function deleteRoutine(routineId: string): void {
  const db = getDb();
  const timestamp = now();

  db.update(routines)
    .set({ deletedAt: timestamp, updatedAt: timestamp })
    .where(eq(routines.id, routineId))
    .run();
}

// ────────────────────────────────────────────────────────────────────
// Transfer: Start Workout from Routine & Save Workout as Routine
// ────────────────────────────────────────────────────────────────────

/**
 * Start a new workout copied from a routine template.
 */
export function startWorkoutFromRoutine(routineId: string): string {
  const routine = getRoutineById(routineId);
  if (!routine) throw new Error('Routine not found');

  const db = getDb();
  const timestamp = now();
  const workoutId = uuid();

  // Create workout row
  db.insert(workouts)
    .values({
      id: workoutId,
      title: routine.name,
      startedAt: timestamp,
      status: 'in_progress',
      routineId: routine.id,
      notes: routine.notes,
      tzOffsetMinutes: new Date().getTimezoneOffset(),
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  // Map superset groups from routine to new workout superset groups
  const supersetIdMap = new Map<string, string>();

  routine.exercises.forEach((re, exIdx) => {
    let workoutSupersetGroupId: string | null = null;

    if (re.supersetGroupId) {
      if (!supersetIdMap.has(re.supersetGroupId)) {
        const newGId = uuid();
        db.insert(supersetGroups)
          .values({
            id: newGId,
            workoutId,
            createdAt: timestamp,
            updatedAt: timestamp,
          })
          .run();
        supersetIdMap.set(re.supersetGroupId, newGId);
      }
      workoutSupersetGroupId = supersetIdMap.get(re.supersetGroupId)!;
    }

    const weId = uuid();
    db.insert(workoutExercises)
      .values({
        id: weId,
        workoutId,
        exerciseId: re.exerciseId,
        sortOrder: exIdx + 1,
        supersetGroupId: workoutSupersetGroupId,
        notes: re.notes,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    re.sets.forEach((rs, sIdx) => {
      db.insert(workoutSets)
        .values({
          id: uuid(),
          workoutExerciseId: weId,
          setIndex: sIdx + 1,
          setType: rs.setType,
          weightKg: rs.targetWeightKg,
          reps: rs.targetReps,
          rpe: rs.targetRpe,
          durationSeconds: rs.targetDurationSeconds,
          isCompleted: false,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .run();
    });
  });

  return workoutId;
}

/**
 * Save an active or completed workout as a reusable Routine template.
 */
export function saveWorkoutAsRoutine(
  workoutId: string,
  routineName: string,
  folderId?: string | null,
): FullRoutine {
  const db = getDb();
  const workout = db.select().from(workouts).where(eq(workouts.id, workoutId)).get();
  if (!workout) throw new Error('Workout not found');

  const weRows = db
    .select()
    .from(workoutExercises)
    .where(
      and(
        eq(workoutExercises.workoutId, workoutId),
        isNull(workoutExercises.deletedAt),
      ),
    )
    .orderBy(asc(workoutExercises.sortOrder))
    .all();

  const routineExercisesInput = weRows.map((we) => {
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
      exerciseId: we.exerciseId,
      notes: we.notes,
      sets: sets.map((s) => ({
        setType: s.setType,
        targetWeightKg: s.weightKg,
        targetReps: s.reps,
        targetRpe: s.rpe,
        targetDurationSeconds: s.durationSeconds,
      })),
    };
  });

  return createRoutine({
    name: routineName,
    folderId,
    notes: workout.notes,
    isPreset: false,
    exercises: routineExercisesInput,
  });
}

// ────────────────────────────────────────────────────────────────────
// Starter Presets Seeding
// ────────────────────────────────────────────────────────────────────

export function seedStarterRoutines(): void {
  const db = getDb();

  // Check if presets are already seeded
  const existingPreset = db
    .select({ id: routines.id })
    .from(routines)
    .where(eq(routines.isPreset, true))
    .get();

  if (existingPreset) return;

  const folderMap = new Map<string, string>();

  for (const blueprint of STARTER_ROUTINES) {
    // Ensure folder exists
    let folderId = folderMap.get(blueprint.folderName);
    if (!folderId) {
      const existingFolder = db
        .select()
        .from(routineFolders)
        .where(
          and(
            eq(routineFolders.name, blueprint.folderName),
            isNull(routineFolders.deletedAt),
          ),
        )
        .get();

      if (existingFolder) {
        folderId = existingFolder.id;
      } else {
        const newFolder = createRoutineFolder(blueprint.folderName);
        folderId = newFolder.id;
      }
      folderMap.set(blueprint.folderName, folderId);
    }

    // Resolve exercises by slug
    const routineExercisesData: CreateRoutineInput['exercises'] = [];

    for (const exPlan of blueprint.exercises) {
      const ex = db
        .select()
        .from(exercises)
        .where(eq(exercises.slug, exPlan.slug))
        .get();

      if (!ex) continue;

      const sets: CreateRoutineInput['exercises'][0]['sets'] = [];
      for (let s = 1; s <= exPlan.targetSets; s++) {
        sets.push({
          setType: 'normal',
          targetReps: exPlan.targetReps,
          targetWeightKg: exPlan.weightKg ?? null,
        });
      }

      routineExercisesData.push({
        exerciseId: ex.id,
        sets,
      });
    }

    createRoutine({
      name: blueprint.name,
      folderId,
      notes: blueprint.notes,
      isPreset: true,
      exercises: routineExercisesData,
    });
  }
}
