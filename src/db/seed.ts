/**
 * Exercise seed data — 400+ built-in exercises.
 *
 * Each exercise has a deterministic UUID derived from its slug for
 * stable IDs across seed updates. Includes movementType (compound/isolation),
 * step-by-step instructions, and common mistakes cues.
 */

import { getDb } from './client';
import { exercises } from './schema';
import { deterministicId, now } from '../lib/uuid';
import { eq } from 'drizzle-orm';
import { ALL_EXERCISE_SEEDS } from '../data/exerciseDefinitions';
import {
  determineMovementType,
  getExerciseInstructions,
  getExerciseCommonMistakes,
} from '../data/exerciseContent';

export { ALL_EXERCISE_SEEDS as EXERCISE_SEEDS };

/** Seed all built-in exercises. Idempotent — upserts by slug and backfills missing metadata. */
export async function seedExercises(): Promise<void> {
  const db = getDb();
  const timestamp = now();

  for (const ex of ALL_EXERCISE_SEEDS) {
    const id = deterministicId(ex.slug);
    const movementType = determineMovementType(ex.slug, ex.name, ex.primaryMuscle, ex.exerciseType);
    const instructions = JSON.stringify(
      getExerciseInstructions(ex.slug, ex.name, ex.primaryMuscle, ex.equipment, ex.exerciseType),
    );
    const commonMistakes = JSON.stringify(
      getExerciseCommonMistakes(ex.slug, ex.name, ex.primaryMuscle, ex.equipment),
    );

    const existing = db
      .select({
        id: exercises.id,
        movementType: exercises.movementType,
        instructions: exercises.instructions,
        commonMistakes: exercises.commonMistakes,
      })
      .from(exercises)
      .where(eq(exercises.slug, ex.slug))
      .get();

    if (!existing) {
      db.insert(exercises)
        .values({
          id,
          slug: ex.slug,
          name: ex.name,
          primaryMuscle: ex.primaryMuscle,
          secondaryMuscles: JSON.stringify(ex.secondaryMuscles),
          equipment: ex.equipment,
          exerciseType: ex.exerciseType,
          movementType,
          instructions,
          commonMistakes,
          isCustom: false,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .run();
    } else if (!existing.movementType || !existing.instructions || !existing.commonMistakes) {
      // Backfill missing content fields for existing database rows
      db.update(exercises)
        .set({
          movementType: existing.movementType ?? movementType,
          instructions: existing.instructions ?? instructions,
          commonMistakes: existing.commonMistakes ?? commonMistakes,
          updatedAt: timestamp,
        })
        .where(eq(exercises.id, existing.id))
        .run();
    }
  }
}
