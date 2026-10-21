import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { ALL_EXERCISE_SEEDS } from '../../data/exerciseDefinitions';
import {
  determineMovementType,
  getExerciseInstructions,
  getExerciseCommonMistakes,
} from '../../data/exerciseContent';
import { STARTER_ROUTINES } from '../../domain/routines';

describe('Batch D: Exercise Content & Program Library', () => {
  it('contains over 400 unique built-in exercises', () => {
    assert.ok(
      ALL_EXERCISE_SEEDS.length >= 400,
      `Expected >= 400 exercises, found ${ALL_EXERCISE_SEEDS.length}`,
    );

    const slugSet = new Set(ALL_EXERCISE_SEEDS.map((e) => e.slug));
    assert.strictEqual(
      slugSet.size,
      ALL_EXERCISE_SEEDS.length,
      'Every exercise slug must be unique',
    );
  });

  it('verifies all exercises have valid muscle, equipment, and exerciseType definitions', () => {
    for (const ex of ALL_EXERCISE_SEEDS) {
      assert.ok(ex.slug.length > 0);
      assert.ok(ex.name.length > 0);
      assert.ok(ex.primaryMuscle.length > 0);
      assert.ok(ex.equipment.length > 0);
      assert.ok(ex.exerciseType.length > 0);
    }
  });

  it('correctly classifies compound vs isolation movement types', () => {
    // Known compounds
    assert.strictEqual(
      determineMovementType('barbell-flat-bench-press', 'Barbell Bench Press', 'chest', 'weight_reps'),
      'compound',
    );
    assert.strictEqual(
      determineMovementType('barbell-back-squat', 'Barbell Back Squat', 'quads', 'weight_reps'),
      'compound',
    );
    assert.strictEqual(
      determineMovementType('barbell-deadlift', 'Deadlift', 'back', 'weight_reps'),
      'compound',
    );
    assert.strictEqual(
      determineMovementType('pull-up', 'Pull-Up', 'back', 'bodyweight_reps'),
      'compound',
    );

    // Known isolations
    assert.strictEqual(
      determineMovementType('dumbbell-bicep-curl', 'Dumbbell Curl', 'biceps', 'weight_reps'),
      'isolation',
    );
    assert.strictEqual(
      determineMovementType('cable-tricep-pushdown', 'Tricep Pushdown', 'triceps', 'weight_reps'),
      'isolation',
    );
    assert.strictEqual(
      determineMovementType('dumbbell-lateral-raise', 'Lateral Raise', 'shoulders', 'weight_reps'),
      'isolation',
    );
    assert.strictEqual(
      determineMovementType('machine-leg-extension', 'Leg Extension', 'quads', 'weight_reps'),
      'isolation',
    );
  });

  it('generates step-by-step instructions and common mistakes for any exercise', () => {
    for (const ex of ALL_EXERCISE_SEEDS.slice(0, 50)) {
      const instructions = getExerciseInstructions(
        ex.slug,
        ex.name,
        ex.primaryMuscle,
        ex.equipment,
        ex.exerciseType,
      );
      assert.ok(
        instructions.length >= 2,
        `Exercise ${ex.slug} should have at least 2 instruction steps`,
      );

      const mistakes = getExerciseCommonMistakes(
        ex.slug,
        ex.name,
        ex.primaryMuscle,
        ex.equipment,
      );
      assert.ok(
        mistakes.length >= 2,
        `Exercise ${ex.slug} should have at least 2 common mistake cues`,
      );
    }
  });

  it('contains at least 20 starter program blueprints across varied training styles', () => {
    assert.ok(
      STARTER_ROUTINES.length >= 20,
      `Expected >= 20 starter routines, found ${STARTER_ROUTINES.length}`,
    );

    const folderNames = new Set(STARTER_ROUTINES.map((r) => r.folderName));
    assert.ok(folderNames.size >= 5, 'Should cover at least 5 distinct training splits/categories');
  });

  it('ensures all starter routines have tags and resolve to valid seed exercises', () => {
    const seedSlugSet = new Set(ALL_EXERCISE_SEEDS.map((e) => e.slug));

    for (const routine of STARTER_ROUTINES) {
      assert.ok(
        routine.tags && routine.tags.length > 0,
        `Routine "${routine.name}" must have at least one tag`,
      );

      for (const ex of routine.exercises) {
        assert.ok(
          seedSlugSet.has(ex.slug),
          `Routine "${routine.name}" references non-existent exercise slug "${ex.slug}"`,
        );
      }
    }
  });
});
