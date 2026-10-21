/**
 * Muscle group constants used across exercises, stats, and anatomical heatmaps.
 */

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'cardio',
  'other',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** Human-readable labels for muscle groups. */
export const muscleGroupLabels: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  quads: 'Quadriceps',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  abs: 'Abs',
  cardio: 'Cardio',
  other: 'Other',
};
