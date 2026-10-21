/**
 * Exercise queries — search, filter, sort, and manage custom exercises.
 */

import { eq, and, isNull, like, or, asc, isNotNull, sql } from 'drizzle-orm';
import { getDb } from '../client';
import { exercises, workoutExercises, workouts } from '../schema';
import { generateId as uuid, now } from '../../lib/uuid';

export type ExerciseRow = typeof exercises.$inferSelect;

export type ExerciseSortOption = 'name' | 'most_used' | 'recently_used';

export interface ExerciseFilterOptions {
  query?: string;
  muscle?: string;
  equipment?: string;
  sortBy?: ExerciseSortOption;
  includeArchived?: boolean;
  limit?: number;
}

export interface CreateCustomExerciseInput {
  name: string;
  primaryMuscle: string;
  secondaryMuscles?: string[];
  equipment: string;
  exerciseType: string;
  notes?: string;
  defaultRestSeconds?: number;
}

/**
 * Search, filter, and sort exercises from the database.
 */
export function getExercises(options: ExerciseFilterOptions = {}): ExerciseRow[] {
  const db = getDb();
  const {
    query,
    muscle,
    equipment,
    sortBy = 'name',
    includeArchived = false,
    limit = 200,
  } = options;

  const conditions = [];
  if (!includeArchived) {
    conditions.push(isNull(exercises.deletedAt));
  }

  if (muscle && muscle !== 'all') {
    conditions.push(eq(exercises.primaryMuscle, muscle));
  }

  if (equipment && equipment !== 'all') {
    conditions.push(eq(exercises.equipment, equipment));
  }

  if (query && query.trim()) {
    const term = `%${query.trim().toLowerCase()}%`;
    conditions.push(
      or(
        like(exercises.name, term),
        like(exercises.primaryMuscle, term),
      )!,
    );
  }

  const baseQuery = db
    .select()
    .from(exercises)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  let rows = baseQuery.all();

  // Apply sorting
  if (sortBy === 'most_used') {
    const usageCounts = db
      .select({
        exerciseId: workoutExercises.exerciseId,
        count: sql<number>`count(${workoutExercises.id})`,
      })
      .from(workoutExercises)
      .where(isNull(workoutExercises.deletedAt))
      .groupBy(workoutExercises.exerciseId)
      .all();

    const countMap = new Map(usageCounts.map((u) => [u.exerciseId, Number(u.count)]));
    rows.sort((a, b) => {
      const countA = countMap.get(a.id) ?? 0;
      const countB = countMap.get(b.id) ?? 0;
      if (countB !== countA) return countB - countA;
      return a.name.localeCompare(b.name);
    });
  } else if (sortBy === 'recently_used') {
    const recents = db
      .select({
        exerciseId: workoutExercises.exerciseId,
        lastUsedAt: sql<string>`max(${workouts.startedAt})`,
      })
      .from(workoutExercises)
      .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
      .where(and(isNull(workoutExercises.deletedAt), isNull(workouts.deletedAt)))
      .groupBy(workoutExercises.exerciseId)
      .all();

    const recentMap = new Map(
      recents.map((r) => [r.exerciseId, new Date(r.lastUsedAt).getTime()]),
    );

    rows.sort((a, b) => {
      const timeA = recentMap.get(a.id) ?? 0;
      const timeB = recentMap.get(b.id) ?? 0;
      if (timeB !== timeA) return timeB - timeA;
      return a.name.localeCompare(b.name);
    });
  } else {
    // Default alphabetical
    rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  return rows.slice(0, limit);
}

/**
 * Get an exercise by ID.
 */
export function getExerciseById(id: string): ExerciseRow | null {
  const db = getDb();
  const result = db
    .select()
    .from(exercises)
    .where(eq(exercises.id, id))
    .get();

  return result ?? null;
}

/**
 * Create a new custom exercise.
 */
export function createCustomExercise(input: CreateCustomExerciseInput): ExerciseRow {
  const db = getDb();
  const timestamp = now();
  const id = uuid();
  const slug = `custom-${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;

  db.insert(exercises)
    .values({
      id,
      slug,
      name: input.name.trim(),
      primaryMuscle: input.primaryMuscle,
      secondaryMuscles: input.secondaryMuscles
        ? JSON.stringify(input.secondaryMuscles)
        : null,
      equipment: input.equipment,
      exerciseType: input.exerciseType,
      notes: input.notes?.trim() || null,
      isCustom: true,
      defaultRestSeconds: input.defaultRestSeconds ?? 90,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return getExerciseById(id)!;
}

/**
 * Update an existing custom or built-in exercise.
 */
export function updateExercise(
  id: string,
  updates: Partial<Pick<ExerciseRow, 'name' | 'primaryMuscle' | 'secondaryMuscles' | 'equipment' | 'exerciseType' | 'notes' | 'defaultRestSeconds'>>,
): ExerciseRow {
  const db = getDb();
  const timestamp = now();

  db.update(exercises)
    .set({
      ...updates,
      updatedAt: timestamp,
    })
    .where(eq(exercises.id, id))
    .run();

  return getExerciseById(id)!;
}

/**
 * Archive an exercise (soft delete).
 */
export function archiveExercise(id: string): void {
  const db = getDb();
  const timestamp = now();
  db.update(exercises)
    .set({ deletedAt: timestamp, updatedAt: timestamp })
    .where(eq(exercises.id, id))
    .run();
}

/**
 * Unarchive / restore an archived exercise.
 */
export function unarchiveExercise(id: string): void {
  const db = getDb();
  const timestamp = now();
  db.update(exercises)
    .set({ deletedAt: null, updatedAt: timestamp })
    .where(eq(exercises.id, id))
    .run();
}

