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
  tags: string[];
  exercises: Array<{
    slug: string;
    targetSets: number;
    targetReps: number;
    weightKg?: number;
  }>;
}

/**
 * Starter routine definitions:
 * - Push / Pull / Legs (PPL - 6 routines: Strength & Hypertrophy)
 * - Upper / Lower Split (4 routines: Power & Hypertrophy)
 * - Full Body (3 routines: Foundations, Hypertrophy, Conditioning)
 * - 5x5 Strength (2 routines: Workout A, Workout B)
 * - Arnold Split (3 routines: Chest & Back, Shoulders & Arms, Legs & Core)
 * - Dumbbell Only (2 routines: Upper Body, Lower Body)
 * - Calisthenics & Bodyweight (2 routines: Push & Core, Pull & Legs)
 */
export const STARTER_ROUTINES: StarterRoutineBlueprint[] = [
  // ── PPL (Strength) ─────────────────────────────────────────────
  {
    name: 'Push (Chest, Shoulders, Triceps)',
    notes: 'Heavy compound pushing focusing on chest, front delts, and triceps.',
    folderName: 'Push Pull Legs',
    tags: ['ppl', 'strength', 'intermediate'],
    exercises: [
      { slug: 'barbell-flat-bench-press', targetSets: 4, targetReps: 6, weightKg: 70 },
      { slug: 'barbell-overhead-press', targetSets: 3, targetReps: 6, weightKg: 45 },
      { slug: 'dumbbell-incline-bench-press', targetSets: 3, targetReps: 8, weightKg: 24 },
      { slug: 'cable-high-to-low-fly', targetSets: 3, targetReps: 12, weightKg: 15 },
      { slug: 'dip-tricep', targetSets: 3, targetReps: 10 },
    ],
  },
  {
    name: 'Pull (Back, Biceps, Rear Delts)',
    notes: 'Heavy pulling session focusing on deadlifts, rows, and vertical pulling.',
    folderName: 'Push Pull Legs',
    tags: ['ppl', 'strength', 'intermediate'],
    exercises: [
      { slug: 'barbell-deadlift', targetSets: 3, targetReps: 5, weightKg: 100 },
      { slug: 'barbell-bent-over-row', targetSets: 4, targetReps: 6, weightKg: 60 },
      { slug: 'cable-lat-pulldown', targetSets: 3, targetReps: 8, weightKg: 55 },
      { slug: 'cable-face-pull', targetSets: 3, targetReps: 15, weightKg: 20 },
      { slug: 'barbell-curl', targetSets: 3, targetReps: 8, weightKg: 30 },
    ],
  },
  {
    name: 'Legs (Quads, Hamstrings, Calves)',
    notes: 'Heavy lower body session focusing on back squats and hip hinge development.',
    folderName: 'Push Pull Legs',
    tags: ['ppl', 'strength', 'intermediate'],
    exercises: [
      { slug: 'barbell-back-squat', targetSets: 4, targetReps: 6, weightKg: 85 },
      { slug: 'barbell-romanian-deadlift', targetSets: 3, targetReps: 8, weightKg: 75 },
      { slug: 'machine-leg-press', targetSets: 3, targetReps: 10, weightKg: 140 },
      { slug: 'machine-lying-leg-curl', targetSets: 3, targetReps: 12, weightKg: 45 },
      { slug: 'machine-standing-calf-raise', targetSets: 4, targetReps: 15, weightKg: 60 },
    ],
  },

  // ── PPL (Hypertrophy) ──────────────────────────────────────────
  {
    name: 'Push (Hypertrophy Focus)',
    notes: 'Higher repetition volume targeting peak muscle hypertrophy and pump.',
    folderName: 'Push Pull Legs',
    tags: ['ppl', 'hypertrophy', 'advanced'],
    exercises: [
      { slug: 'dumbbell-incline-bench-press', targetSets: 4, targetReps: 10, weightKg: 26 },
      { slug: 'machine-chest-press', targetSets: 3, targetReps: 12, weightKg: 60 },
      { slug: 'dumbbell-lateral-raise', targetSets: 4, targetReps: 15, weightKg: 10 },
      { slug: 'cable-overhead-rope-extension', targetSets: 3, targetReps: 12, weightKg: 25 },
      { slug: 'push-up', targetSets: 3, targetReps: 15 },
    ],
  },
  {
    name: 'Pull (Hypertrophy Focus)',
    notes: 'Lat and upper back hypertrophy targeting peak squeeze and metabolic fatigue.',
    folderName: 'Push Pull Legs',
    tags: ['ppl', 'hypertrophy', 'advanced'],
    exercises: [
      { slug: 'dumbbell-one-arm-row', targetSets: 4, targetReps: 10, weightKg: 28 },
      { slug: 'cable-seated-row', targetSets: 3, targetReps: 12, weightKg: 50 },
      { slug: 'pull-up', targetSets: 3, targetReps: 8 },
      { slug: 'dumbbell-hammer-curl', targetSets: 3, targetReps: 12, weightKg: 14 },
      { slug: 'cable-cross-body-rear-delt-fly', targetSets: 3, targetReps: 15, weightKg: 10 },
    ],
  },
  {
    name: 'Legs (Hypertrophy Focus)',
    notes: 'High-tension quad and glute hypertrophy with machine stability.',
    folderName: 'Push Pull Legs',
    tags: ['ppl', 'hypertrophy', 'advanced'],
    exercises: [
      { slug: 'hack-squat-machine', targetSets: 4, targetReps: 10, weightKg: 80 },
      { slug: 'dumbbell-bulgarian-split-squat', targetSets: 3, targetReps: 10, weightKg: 16 },
      { slug: 'machine-seated-leg-curl', targetSets: 3, targetReps: 12, weightKg: 40 },
      { slug: 'machine-leg-extension', targetSets: 3, targetReps: 15, weightKg: 50 },
      { slug: 'machine-seated-calf-raise', targetSets: 4, targetReps: 15, weightKg: 35 },
    ],
  },

  // ── Upper / Lower Split ─────────────────────────────────────────
  {
    name: 'Upper Body Power',
    notes: 'Heavy upper body compound session prioritizing strength progression.',
    folderName: 'Upper Lower Split',
    tags: ['upper_lower', 'strength', 'intermediate'],
    exercises: [
      { slug: 'barbell-flat-bench-press', targetSets: 4, targetReps: 5, weightKg: 75 },
      { slug: 'barbell-bent-over-row', targetSets: 4, targetReps: 6, weightKg: 65 },
      { slug: 'barbell-overhead-press', targetSets: 3, targetReps: 6, weightKg: 45 },
      { slug: 'pull-up', targetSets: 3, targetReps: 8 },
      { slug: 'barbell-curl', targetSets: 3, targetReps: 8, weightKg: 30 },
    ],
  },
  {
    name: 'Lower Body Power',
    notes: 'Heavy lower body strength session with squat and deadlift compounds.',
    folderName: 'Upper Lower Split',
    tags: ['upper_lower', 'strength', 'intermediate'],
    exercises: [
      { slug: 'barbell-back-squat', targetSets: 4, targetReps: 5, weightKg: 90 },
      { slug: 'barbell-deadlift', targetSets: 3, targetReps: 5, weightKg: 105 },
      { slug: 'machine-leg-press', targetSets: 3, targetReps: 8, weightKg: 160 },
      { slug: 'machine-standing-calf-raise', targetSets: 4, targetReps: 12, weightKg: 70 },
    ],
  },
  {
    name: 'Upper Body Hypertrophy',
    notes: 'Targeted upper body volume for shoulders, chest, back, and arms.',
    folderName: 'Upper Lower Split',
    tags: ['upper_lower', 'hypertrophy', 'intermediate'],
    exercises: [
      { slug: 'dumbbell-incline-bench-press', targetSets: 4, targetReps: 10, weightKg: 24 },
      { slug: 'cable-seated-row', targetSets: 3, targetReps: 12, weightKg: 50 },
      { slug: 'dumbbell-lateral-raise', targetSets: 4, targetReps: 15, weightKg: 10 },
      { slug: 'cable-lat-pulldown', targetSets: 3, targetReps: 10, weightKg: 55 },
      { slug: 'cable-rope-hammer-curl', targetSets: 3, targetReps: 12, weightKg: 25 },
      { slug: 'dumbbell-incline-curl', targetSets: 3, targetReps: 10, weightKg: 12 },
    ],
  },
  {
    name: 'Lower Body Hypertrophy',
    notes: 'High-rep lower body stimulus focusing on quads, hamstrings, and calves.',
    folderName: 'Upper Lower Split',
    tags: ['upper_lower', 'hypertrophy', 'intermediate'],
    exercises: [
      { slug: 'barbell-front-squat', targetSets: 4, targetReps: 8, weightKg: 60 },
      { slug: 'barbell-romanian-deadlift', targetSets: 3, targetReps: 10, weightKg: 70 },
      { slug: 'machine-leg-extension', targetSets: 3, targetReps: 12, weightKg: 45 },
      { slug: 'machine-lying-leg-curl', targetSets: 3, targetReps: 12, weightKg: 40 },
      { slug: 'machine-seated-calf-raise', targetSets: 4, targetReps: 15, weightKg: 35 },
      { slug: 'hanging-leg-raise', targetSets: 3, targetReps: 12 },
    ],
  },

  // ── Full Body ──────────────────────────────────────────────────
  {
    name: 'Full Body Foundations',
    notes: 'Complete full-body workout hitting all major movement patterns.',
    folderName: 'Full Body',
    tags: ['full_body', 'beginner', 'strength'],
    exercises: [
      { slug: 'barbell-back-squat', targetSets: 3, targetReps: 8, weightKg: 60 },
      { slug: 'barbell-flat-bench-press', targetSets: 3, targetReps: 8, weightKg: 55 },
      { slug: 'barbell-bent-over-row', targetSets: 3, targetReps: 8, weightKg: 50 },
      { slug: 'barbell-overhead-press', targetSets: 3, targetReps: 8, weightKg: 35 },
      { slug: 'plank', targetSets: 3, targetReps: 60 },
    ],
  },
  {
    name: 'Full Body Hypertrophy',
    notes: 'Dumbbell-focused full body session maximizing muscle tension across all groups.',
    folderName: 'Full Body',
    tags: ['full_body', 'hypertrophy', 'intermediate'],
    exercises: [
      { slug: 'dumbbell-flat-bench-press', targetSets: 3, targetReps: 10, weightKg: 24 },
      { slug: 'dumbbell-one-arm-row', targetSets: 3, targetReps: 10, weightKg: 26 },
      { slug: 'dumbbell-heel-elevated-goblet-squat', targetSets: 3, targetReps: 12, weightKg: 24 },
      { slug: 'dumbbell-romanian-deadlift', targetSets: 3, targetReps: 10, weightKg: 24 },
      { slug: 'dumbbell-lateral-raise', targetSets: 3, targetReps: 15, weightKg: 10 },
      { slug: 'dumbbell-hammer-curl', targetSets: 3, targetReps: 12, weightKg: 14 },
    ],
  },
  {
    name: 'Full Body Conditioning',
    notes: 'High-intensity functional conditioning combining swings, calisthenics, and core.',
    folderName: 'Full Body',
    tags: ['full_body', 'conditioning', 'endurance'],
    exercises: [
      { slug: 'kettlebell-swing-two-arm', targetSets: 4, targetReps: 20, weightKg: 24 },
      { slug: 'push-up', targetSets: 3, targetReps: 15 },
      { slug: 'pull-up', targetSets: 3, targetReps: 8 },
      { slug: 'dumbbell-walking-lunge', targetSets: 3, targetReps: 12, weightKg: 16 },
      { slug: 'ab-wheel-rollout', targetSets: 3, targetReps: 12 },
    ],
  },

  // ── 5x5 Strength ───────────────────────────────────────────────
  {
    name: '5x5 Strength Workout A',
    notes: 'Classic linear progression: 5 sets of 5 reps with heavy barbell compounds.',
    folderName: '5x5 Strength',
    tags: ['strength', '5x5', 'beginner'],
    exercises: [
      { slug: 'barbell-back-squat', targetSets: 5, targetReps: 5, weightKg: 70 },
      { slug: 'barbell-flat-bench-press', targetSets: 5, targetReps: 5, weightKg: 60 },
      { slug: 'barbell-bent-over-row', targetSets: 5, targetReps: 5, weightKg: 55 },
    ],
  },
  {
    name: '5x5 Strength Workout B',
    notes: 'Classic linear progression Workout B: Squat 5x5, OHP 5x5, Deadlift 1x5.',
    folderName: '5x5 Strength',
    tags: ['strength', '5x5', 'beginner'],
    exercises: [
      { slug: 'barbell-back-squat', targetSets: 5, targetReps: 5, weightKg: 72.5 },
      { slug: 'barbell-overhead-press', targetSets: 5, targetReps: 5, weightKg: 42.5 },
      { slug: 'barbell-deadlift', targetSets: 1, targetReps: 5, weightKg: 95 },
    ],
  },

  // ── Arnold Split ───────────────────────────────────────────────
  {
    name: 'Arnold Split: Chest & Back',
    notes: 'The iconic antagonistic superset routine for massive chest and back fullness.',
    folderName: 'Arnold Split',
    tags: ['arnold', 'hypertrophy', 'advanced'],
    exercises: [
      { slug: 'barbell-flat-bench-press', targetSets: 4, targetReps: 8, weightKg: 75 },
      { slug: 'pull-up', targetSets: 4, targetReps: 8 },
      { slug: 'barbell-incline-bench-press', targetSets: 3, targetReps: 10, weightKg: 60 },
      { slug: 'barbell-bent-over-row', targetSets: 3, targetReps: 8, weightKg: 65 },
      { slug: 'dumbbell-flat-fly', targetSets: 3, targetReps: 12, weightKg: 16 },
      { slug: 'dumbbell-pullover', targetSets: 3, targetReps: 12, weightKg: 24 },
    ],
  },
  {
    name: 'Arnold Split: Shoulders & Arms',
    notes: 'Complete shoulder caps and intense arm supersets for maximum sleeve-filling growth.',
    folderName: 'Arnold Split',
    tags: ['arnold', 'hypertrophy', 'advanced'],
    exercises: [
      { slug: 'dumbbell-arnold-press-seated', targetSets: 4, targetReps: 8, weightKg: 20 },
      { slug: 'dumbbell-lateral-raise', targetSets: 4, targetReps: 15, weightKg: 10 },
      { slug: 'cable-rear-delt-fly', targetSets: 3, targetReps: 15, weightKg: 10 },
      { slug: 'barbell-curl', targetSets: 4, targetReps: 10, weightKg: 30 },
      { slug: 'barbell-skull-crusher', targetSets: 4, targetReps: 10, weightKg: 30 },
      { slug: 'cable-rope-hammer-curl', targetSets: 3, targetReps: 12, weightKg: 25 },
    ],
  },
  {
    name: 'Arnold Split: Legs & Core',
    notes: 'High-intensity quad, hamstring, and core finisher session.',
    folderName: 'Arnold Split',
    tags: ['arnold', 'hypertrophy', 'advanced'],
    exercises: [
      { slug: 'barbell-back-squat', targetSets: 4, targetReps: 8, weightKg: 85 },
      { slug: 'barbell-stiff-leg-deadlift', targetSets: 3, targetReps: 8, weightKg: 80 },
      { slug: 'machine-leg-press', targetSets: 3, targetReps: 12, weightKg: 140 },
      { slug: 'machine-lying-leg-curl', targetSets: 3, targetReps: 12, weightKg: 45 },
      { slug: 'machine-standing-calf-raise', targetSets: 4, targetReps: 15, weightKg: 65 },
      { slug: 'hanging-toes-to-bar', targetSets: 3, targetReps: 12 },
    ],
  },

  // ── Dumbbell Only (Home / Travel) ──────────────────────────────
  {
    name: 'Dumbbell Only: Upper Body',
    notes: 'Versatile upper-body dumbbell program ideal for home gyms or hotel workouts.',
    folderName: 'Dumbbell Only',
    tags: ['dumbbell', 'home', 'beginner'],
    exercises: [
      { slug: 'dumbbell-flat-bench-press', targetSets: 4, targetReps: 10, weightKg: 22 },
      { slug: 'dumbbell-one-arm-row', targetSets: 4, targetReps: 10, weightKg: 24 },
      { slug: 'dumbbell-shoulder-press', targetSets: 3, targetReps: 10, weightKg: 16 },
      { slug: 'dumbbell-lateral-raise', targetSets: 3, targetReps: 15, weightKg: 8 },
      { slug: 'dumbbell-curl', targetSets: 3, targetReps: 10, weightKg: 12 },
      { slug: 'dumbbell-overhead-tricep-ext', targetSets: 3, targetReps: 12, weightKg: 18 },
    ],
  },
  {
    name: 'Dumbbell Only: Lower Body',
    notes: 'High-efficiency lower body session using only a pair of dumbbells.',
    folderName: 'Dumbbell Only',
    tags: ['dumbbell', 'home', 'beginner'],
    exercises: [
      { slug: 'dumbbell-goblet-squat', targetSets: 4, targetReps: 12, weightKg: 26 },
      { slug: 'dumbbell-romanian-deadlift', targetSets: 3, targetReps: 10, weightKg: 22 },
      { slug: 'dumbbell-bulgarian-split-squat', targetSets: 3, targetReps: 10, weightKg: 14 },
      { slug: 'dumbbell-single-leg-calf-raise', targetSets: 4, targetReps: 15, weightKg: 12 },
      { slug: 'crunch', targetSets: 3, targetReps: 20 },
    ],
  },

  // ── Calisthenics & Bodyweight ──────────────────────────────────
  {
    name: 'Calisthenics: Push & Core',
    notes: 'Zero-equipment push and core mastery focusing on dips, push-up variations, and holds.',
    folderName: 'Calisthenics',
    tags: ['bodyweight', 'calisthenics', 'no_equipment'],
    exercises: [
      { slug: 'dip-chest', targetSets: 4, targetReps: 10 },
      { slug: 'push-up', targetSets: 4, targetReps: 15 },
      { slug: 'diamond-push-up', targetSets: 3, targetReps: 12 },
      { slug: 'push-up-pike', targetSets: 3, targetReps: 10 },
      { slug: 'plank', targetSets: 3, targetReps: 60 },
      { slug: 'hanging-leg-raise', targetSets: 3, targetReps: 12 },
    ],
  },
  {
    name: 'Calisthenics: Pull & Legs',
    notes: 'Bodyweight pull strength and unilateral leg development without barbells.',
    folderName: 'Calisthenics',
    tags: ['bodyweight', 'calisthenics', 'no_equipment'],
    exercises: [
      { slug: 'pull-up', targetSets: 4, targetReps: 8 },
      { slug: 'chin-up', targetSets: 3, targetReps: 8 },
      { slug: 'inverted-row', targetSets: 3, targetReps: 12 },
      { slug: 'bodyweight-squat', targetSets: 4, targetReps: 20 },
      { slug: 'bodyweight-lunge', targetSets: 3, targetReps: 15 },
      { slug: 'bodyweight-calf-raise', targetSets: 4, targetReps: 25 },
    ],
  },
];
