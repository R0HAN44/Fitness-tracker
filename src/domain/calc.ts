/**
 * Fitness calculation domain logic — 1RM estimation, volume, and effective load.
 *
 * Implements standard Epley and Brzycki 1RM formulas, effective load calculation
 * per exercise type, and set/workout volume calculation.
 */

export type OneRMFormula = 'epley' | 'brzycki';

export interface SetVolumeData {
  weightKg?: number | null;
  reps?: number | null;
  setType?: string;
  isCompleted?: boolean;
}

/**
 * Estimate 1RM using Epley's formula:
 * 1RM = weight * (1 + reps / 30)
 *
 * For reps = 1, returns exactly weight.
 * For reps <= 0 or weight <= 0, returns 0.
 */
export function calculate1RMEpley(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Estimate 1RM using Brzycki's formula:
 * 1RM = weight * (36 / (37 - reps))
 *
 * For reps = 1, returns exactly weight.
 * Brzycki is standard for reps <= 10. For reps >= 37 (where 37 - reps <= 0),
 * falls back to Epley to avoid division by zero or negative values.
 */
export function calculate1RMBrzycki(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  if (reps >= 37) {
    return calculate1RMEpley(weight, reps);
  }
  return weight * (36 / (37 - reps));
}

/**
 * Calculate estimated 1RM using the specified formula (defaults to Epley).
 */
export function calculateEstimated1RM(
  weight: number,
  reps: number,
  formula: OneRMFormula = 'epley',
): number {
  return formula === 'brzycki'
    ? calculate1RMBrzycki(weight, reps)
    : calculate1RMEpley(weight, reps);
}

/**
 * Calculate the effective load lifted based on exercise type and bodyweight.
 * Returns null if the load cannot be computed (e.g. assisted bodyweight with no bodyweight logged),
 * indicating that the set MUST be excluded from volume calculations.
 *
 * - weight_reps: weight
 * - bodyweight_reps: bodyweight (null if no bodyweight entry)
 * - weighted_bodyweight: bodyweight + additional weight (null if no bodyweight entry)
 * - assisted_bodyweight: max(0, bodyweight - assistance). If no bodyweight entry, returns null (EXCLUDED from volume, NOT counted as zero)
 * - weight_duration: weight
 * - duration / distance_duration: 0 for volume calculation
 */
export function calculateEffectiveLoad(
  inputWeightKg: number | null | undefined,
  exerciseType: string = 'weight_reps',
  bodyweightKg: number | null | undefined = null,
): number | null {
  const weight = inputWeightKg ?? 0;

  switch (exerciseType) {
    case 'weight_reps':
    case 'weight_duration':
      return Math.max(0, weight);

    case 'bodyweight_reps':
      if (bodyweightKg == null || bodyweightKg <= 0) return null;
      return bodyweightKg;

    case 'weighted_bodyweight':
      if (bodyweightKg == null || bodyweightKg <= 0) return null;
      return bodyweightKg + weight;

    case 'assisted_bodyweight':
      // Assisted bodyweight: assistance is a positive number.
      // If no bodyweight recorded, it MUST be excluded from volume, not counted as 0.
      if (bodyweightKg == null || bodyweightKg <= 0) {
        return null;
      }
      return Math.max(0, bodyweightKg - weight);

    case 'duration':
    case 'distance_duration':
    default:
      return 0;
  }
}

/**
 * Check if a set is excluded from volume calculations:
 * - Warmup sets are always excluded.
 * - Sets with incalculable load (e.g. assisted bodyweight without bodyweight entry) are excluded.
 */
export function isSetExcludedFromVolume(
  set: SetVolumeData,
  exerciseType: string = 'weight_reps',
  bodyweightKg: number | null = null,
): boolean {
  if (set.setType === 'warmup') return true;
  const load = calculateEffectiveLoad(set.weightKg, exerciseType, bodyweightKg);
  return load === null;
}

/**
 * Calculate volume for a single set: effective load * reps.
 * Warm-up sets and sets excluded from volume return 0.
 */
export function calculateSetVolume(
  set: SetVolumeData,
  exerciseType: string = 'weight_reps',
  bodyweightKg: number | null = null,
): number {
  if (set.setType === 'warmup') return 0;

  const reps = set.reps ?? 0;
  if (reps <= 0) return 0;

  const load = calculateEffectiveLoad(set.weightKg, exerciseType, bodyweightKg);
  if (load == null) return 0;

  return load * reps;
}

/**
 * Calculate total volume for a list of sets.
 * Only completed sets are included by default.
 * Warm-up sets and unmeasured assisted-bodyweight sets are excluded.
 */
export function calculateWorkoutVolume(
  sets: SetVolumeData[],
  exerciseType: string = 'weight_reps',
  bodyweightKg: number | null = null,
  options: { onlyCompleted?: boolean } = { onlyCompleted: true },
): number {
  return sets.reduce((total, set) => {
    if (options.onlyCompleted && !set.isCompleted) {
      return total;
    }
    return total + calculateSetVolume(set, exerciseType, bodyweightKg);
  }, 0);
}
