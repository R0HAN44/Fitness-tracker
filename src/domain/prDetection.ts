/**
 * Personal Record (PR) domain logic — real-time detection & history recalculation.
 *
 * PR Types:
 *   - max_weight: Heaviest weight lifted for >= 1 rep
 *   - best_1rm: Highest estimated 1RM (Epley formula)
 *   - best_set_volume: Highest single-set volume (load * reps)
 *   - max_reps_at_weight: Most reps completed at a specific weight
 *
 * Warm-up sets are strictly excluded from PR detection.
 */

import { calculate1RMEpley, calculateEffectiveLoad } from './calc';

export type PRType = 'max_weight' | 'best_1rm' | 'best_set_volume' | 'max_reps_at_weight';

export interface ExistingPR {
  id?: string;
  exerciseId: string;
  recordType: PRType;
  value: number;
  weightKg?: number | null;
  workoutSetId?: string;
  isCurrent?: boolean;
  achievedAt?: string;
}

export interface CandidateSet {
  id: string;
  exerciseId: string;
  weightKg: number | null | undefined;
  reps: number | null | undefined;
  setType: string;
  isCompleted: boolean;
  exerciseType?: string;
  bodyweightKg?: number | null;
  completedAt?: string;
}

export interface NewPRResult {
  recordType: PRType;
  value: number;
  previousValue: number | null;
  weightKg: number | null;
  workoutSetId: string;
  exerciseId: string;
  label: string;
}

/**
 * Check if a completed set sets any new PRs compared to current active PRs.
 */
export function detectNewPRs(
  set: CandidateSet,
  currentPRs: ExistingPR[],
): NewPRResult[] {
  // Warmups, incomplete sets, and 0-rep sets never qualify for PRs
  if (set.setType === 'warmup' || !set.isCompleted) {
    return [];
  }

  const reps = set.reps ?? 0;
  if (reps <= 0) return [];

  const effectiveLoad = calculateEffectiveLoad(
    set.weightKg,
    set.exerciseType ?? 'weight_reps',
    set.bodyweightKg,
  );

  // If load cannot be computed (e.g. unmeasured assisted bodyweight) or is 0, no PRs
  if (effectiveLoad == null || effectiveLoad <= 0) {
    return [];
  }

  const newPRs: NewPRResult[] = [];

  // 1. Max Weight
  const curMaxWeight = currentPRs.find(
    (pr) => pr.recordType === 'max_weight' && (pr.isCurrent ?? true),
  );
  const prevWeight = curMaxWeight ? curMaxWeight.value : null;

  if (prevWeight == null || effectiveLoad > prevWeight) {
    newPRs.push({
      recordType: 'max_weight',
      value: effectiveLoad,
      previousValue: prevWeight,
      weightKg: set.weightKg ?? effectiveLoad,
      workoutSetId: set.id,
      exerciseId: set.exerciseId,
      label: 'Max Weight',
    });
  }

  // 2. Best Estimated 1RM
  const estimated1RM = Math.round(calculate1RMEpley(effectiveLoad, reps) * 100) / 100;
  const cur1RM = currentPRs.find(
    (pr) => pr.recordType === 'best_1rm' && (pr.isCurrent ?? true),
  );
  const prev1RM = cur1RM ? cur1RM.value : null;

  if (prev1RM == null || estimated1RM > prev1RM) {
    newPRs.push({
      recordType: 'best_1rm',
      value: estimated1RM,
      previousValue: prev1RM,
      weightKg: set.weightKg ?? effectiveLoad,
      workoutSetId: set.id,
      exerciseId: set.exerciseId,
      label: 'Estimated 1RM',
    });
  }

  // 3. Best Set Volume (load * reps)
  const setVolume = effectiveLoad * reps;
  if (setVolume > 0) {
    const curVolume = currentPRs.find(
      (pr) => pr.recordType === 'best_set_volume' && (pr.isCurrent ?? true),
    );
    const prevVolume = curVolume ? curVolume.value : null;

    if (prevVolume == null || setVolume > prevVolume) {
      newPRs.push({
        recordType: 'best_set_volume',
        value: Math.round(setVolume * 100) / 100,
        previousValue: prevVolume,
        weightKg: set.weightKg ?? effectiveLoad,
        workoutSetId: set.id,
        exerciseId: set.exerciseId,
        label: 'Best Set Volume',
      });
    }
  }

  // 4. Max Reps at Weight
  const normalizedWeight = Math.round(effectiveLoad * 100) / 100;
  const curRepsAtWeight = currentPRs.find(
    (pr) =>
      pr.recordType === 'max_reps_at_weight' &&
      pr.weightKg != null &&
      Math.abs(pr.weightKg - normalizedWeight) < 0.01 &&
      (pr.isCurrent ?? true),
  );
  const prevReps = curRepsAtWeight ? curRepsAtWeight.value : null;

  if (prevReps == null || reps > prevReps) {
    newPRs.push({
      recordType: 'max_reps_at_weight',
      value: reps,
      previousValue: prevReps,
      weightKg: normalizedWeight,
      workoutSetId: set.id,
      exerciseId: set.exerciseId,
      label: `Max Reps @ ${normalizedWeight}kg`,
    });
  }

  return newPRs;
}

/**
 * Recompute full chronological PR history for an exercise.
 * Used when a past workout or set is edited or deleted.
 *
 * Input sets should be sorted chronologically by completedAt.
 * Returns the append-only PR entries, marking only the latest record of each type as isCurrent: true.
 */
export function recomputeExercisePRHistory(
  chronologicalSets: CandidateSet[],
): ExistingPR[] {
  const prHistory: ExistingPR[] = [];
  const currentRecords = new Map<string, ExistingPR>();

  for (const set of chronologicalSets) {
    if (set.setType === 'warmup' || !set.isCompleted) continue;
    const reps = set.reps ?? 0;
    if (reps <= 0) continue;

    const effectiveLoad = calculateEffectiveLoad(
      set.weightKg,
      set.exerciseType ?? 'weight_reps',
      set.bodyweightKg,
    );

    if (effectiveLoad == null || effectiveLoad <= 0) continue;

    const checkAndAdd = (
      key: string,
      type: PRType,
      val: number,
      weightCtx?: number | null,
    ) => {
      const existing = currentRecords.get(key);
      if (!existing || val > existing.value) {
        if (existing) {
          existing.isCurrent = false;
        }

        const newRecord: ExistingPR = {
          exerciseId: set.exerciseId,
          recordType: type,
          value: val,
          weightKg: weightCtx ?? null,
          workoutSetId: set.id,
          isCurrent: true,
          achievedAt: set.completedAt ?? new Date().toISOString(),
        };

        currentRecords.set(key, newRecord);
        prHistory.push(newRecord);
      }
    };

    // Max weight
    checkAndAdd('max_weight', 'max_weight', effectiveLoad, set.weightKg);

    // Estimated 1RM
    const e1rm = Math.round(calculate1RMEpley(effectiveLoad, reps) * 100) / 100;
    checkAndAdd('best_1rm', 'best_1rm', e1rm, set.weightKg);

    // Max reps at weight
    const normWeight = Math.round(effectiveLoad * 100) / 100;
    checkAndAdd(`max_reps_${normWeight}`, 'max_reps_at_weight', reps, normWeight);

    // Set volume
    const vol = Math.round(effectiveLoad * reps * 100) / 100;
    if (vol > 0) {
      checkAndAdd('best_set_volume', 'best_set_volume', vol, set.weightKg);
    }
  }

  return prHistory;
}
