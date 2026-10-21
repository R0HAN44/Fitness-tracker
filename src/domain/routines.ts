/**
 * Routine domain logic — transformations between routines and workouts,
 * and starter routine presets.
 */

export interface RoutineExerciseBlueprint {
  exerciseId: string;
  sortOrder: number;
  restSeconds?: number | null;
  targetSets: Array<{
    setIndex: number;
    setType: string;
    targetWeightKg?: number | null;
    targetReps?: number | null;
    targetRpe?: number | null;
  }>;
}

export interface StarterRoutineBlueprint {
  name: string;
  notes: string;
  folderName: string;
  exercises: Array<{
    slug: string;
    targetSets: number;
    targetReps: number;
    weightKg?: number;
  }>;
}

/**
 * Starter routine definitions:
 * - Push / Pull / Legs (PPL)
 * - Upper / Lower
 * - Full Body
 * - 5x5 Strength
 */
export const STARTER_ROUTINES: StarterRoutineBlueprint[] = [
  // ── PPL ────────────────────────────────────────────────────────
  {
    name: 'Push (Chest, Shoulders, Triceps)',
    notes: 'PPL cycle: Push Day focus on chest, front/side delts, and triceps.',
    folderName: 'Push Pull Legs',
    exercises: [
      { slug: 'barbell-flat-bench-press', targetSets: 4, targetReps: 8 },
      { slug: 'barbell-overhead-press', targetSets: 3, targetReps: 8 },
      { slug: 'dumbbell-incline-bench-press', targetSets: 3, targetReps: 10 },
      { slug: 'cable-high-to-low-fly', targetSets: 3, targetReps: 12 },
      { slug: 'bodyweight-tricep-dip', targetSets: 3, targetReps: 10 },
    ],
  },
  {
    name: 'Pull (Back, Biceps, Rear Delts)',
    notes: 'PPL cycle: Pull Day focus on lats, upper back, and biceps.',
    folderName: 'Push Pull Legs',
    exercises: [
      { slug: 'barbell-conventional-deadlift', targetSets: 3, targetReps: 5 },
      { slug: 'barbell-bent-over-row', targetSets: 4, targetReps: 8 },
      { slug: 'lat-pulldown-wide-grip', targetSets: 3, targetReps: 10 },
      { slug: 'cable-face-pull', targetSets: 3, targetReps: 15 },
      { slug: 'barbell-bicep-curl', targetSets: 3, targetReps: 10 },
    ],
  },
  {
    name: 'Legs (Quads, Hamstrings, Calves)',
    notes: 'PPL cycle: Leg Day focus on lower body compound strength.',
    folderName: 'Push Pull Legs',
    exercises: [
      { slug: 'barbell-back-squat', targetSets: 4, targetReps: 6 },
      { slug: 'barbell-romanian-deadlift', targetSets: 3, targetReps: 8 },
      { slug: 'machine-leg-press', targetSets: 3, targetReps: 10 },
      { slug: 'machine-leg-curl', targetSets: 3, targetReps: 12 },
      { slug: 'machine-standing-calf-raise', targetSets: 4, targetReps: 15 },
    ],
  },

  // ── Upper / Lower ──────────────────────────────────────────────
  {
    name: 'Upper Body Power',
    notes: 'Upper/Lower split: Heavy compound lifts for upper body.',
    folderName: 'Upper Lower Split',
    exercises: [
      { slug: 'barbell-flat-bench-press', targetSets: 4, targetReps: 6 },
      { slug: 'barbell-bent-over-row', targetSets: 4, targetReps: 6 },
      { slug: 'barbell-overhead-press', targetSets: 3, targetReps: 8 },
      { slug: 'bodyweight-pull-up', targetSets: 3, targetReps: 8 },
    ],
  },
  {
    name: 'Lower Body Power',
    notes: 'Upper/Lower split: Heavy compound lifts for lower body.',
    folderName: 'Upper Lower Split',
    exercises: [
      { slug: 'barbell-back-squat', targetSets: 4, targetReps: 6 },
      { slug: 'barbell-conventional-deadlift', targetSets: 3, targetReps: 5 },
      { slug: 'machine-leg-extension', targetSets: 3, targetReps: 12 },
      { slug: 'machine-seated-calf-raise', targetSets: 4, targetReps: 15 },
    ],
  },

  // ── Full Body ──────────────────────────────────────────────────
  {
    name: 'Full Body Foundations',
    notes: 'Full body session covering primary compound movement patterns.',
    folderName: 'Full Body',
    exercises: [
      { slug: 'barbell-back-squat', targetSets: 3, targetReps: 8 },
      { slug: 'barbell-flat-bench-press', targetSets: 3, targetReps: 8 },
      { slug: 'barbell-bent-over-row', targetSets: 3, targetReps: 8 },
      { slug: 'barbell-overhead-press', targetSets: 3, targetReps: 8 },
    ],
  },

  // ── 5x5 Strength ───────────────────────────────────────────────
  {
    name: '5x5 Strength Workout A',
    notes: 'Classic linear progression: 5 sets of 5 reps with heavy barbell compounds.',
    folderName: '5x5 Strength',
    exercises: [
      { slug: 'barbell-back-squat', targetSets: 5, targetReps: 5 },
      { slug: 'barbell-flat-bench-press', targetSets: 5, targetReps: 5 },
      { slug: 'barbell-bent-over-row', targetSets: 5, targetReps: 5 },
    ],
  },
  {
    name: '5x5 Strength Workout B',
    notes: 'Classic linear progression Workout B: Squat 5x5, OHP 5x5, Deadlift 1x5.',
    folderName: '5x5 Strength',
    exercises: [
      { slug: 'barbell-back-squat', targetSets: 5, targetReps: 5 },
      { slug: 'barbell-overhead-press', targetSets: 5, targetReps: 5 },
      { slug: 'barbell-conventional-deadlift', targetSets: 1, targetReps: 5 },
    ],
  },
];
