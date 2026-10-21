/**
 * Session comparison domain logic.
 *
 * Compares two workout sessions for the same exercise:
 * - Volume delta and percentage change
 * - Max weight and estimated 1RM delta
 * - Set-by-set comparison with deltas for weight and reps
 */

import { calculateSetVolume, calculateEstimated1RM } from './calc';

export interface ComparisonSet {
  setIndex: number;
  weightKg: number | null;
  reps: number | null;
  setType?: string;
  isCompleted?: boolean;
}

export interface SetComparisonItem {
  setIndex: number;
  current: { weightKg: number; reps: number; volume: number; e1rm: number } | null;
  previous: { weightKg: number; reps: number; volume: number; e1rm: number } | null;
  weightDeltaKg: number | null;
  repsDelta: number | null;
  volumeDeltaKg: number | null;
  e1rmDeltaKg: number | null;
}

export interface SessionComparisonResult {
  currentTotalVolumeKg: number;
  previousTotalVolumeKg: number;
  volumeDeltaKg: number;
  volumePercentChange: number | null;
  currentMaxWeightKg: number;
  previousMaxWeightKg: number;
  maxWeightDeltaKg: number;
  currentBest1rmKg: number;
  previousBest1rmKg: number;
  best1rmDeltaKg: number;
  setComparisons: SetComparisonItem[];
}

export function compareExerciseSessions(
  currentSets: ComparisonSet[],
  previousSets: ComparisonSet[],
  exerciseType: string = 'weight_reps',
  bodyweightKg: number | null = null,
): SessionComparisonResult {
  const completedCurrent = currentSets.filter((s) => s.isCompleted !== false && s.setType !== 'warmup');
  const completedPrevious = previousSets.filter((s) => s.isCompleted !== false && s.setType !== 'warmup');

  let curVolume = 0;
  let curMaxWeight = 0;
  let curBest1rm = 0;

  for (const s of completedCurrent) {
    const w = s.weightKg ?? 0;
    const r = s.reps ?? 0;
    const vol = calculateSetVolume(
      { weightKg: w, reps: r, setType: s.setType ?? 'normal', isCompleted: true },
      exerciseType,
      bodyweightKg,
    );
    const e1rm = calculateEstimated1RM(w, r);
    curVolume += vol;
    if (w > curMaxWeight) curMaxWeight = w;
    if (e1rm > curBest1rm) curBest1rm = e1rm;
  }

  let prevVolume = 0;
  let prevMaxWeight = 0;
  let prevBest1rm = 0;

  for (const s of completedPrevious) {
    const w = s.weightKg ?? 0;
    const r = s.reps ?? 0;
    const vol = calculateSetVolume(
      { weightKg: w, reps: r, setType: s.setType ?? 'normal', isCompleted: true },
      exerciseType,
      bodyweightKg,
    );
    const e1rm = calculateEstimated1RM(w, r);
    prevVolume += vol;
    if (w > prevMaxWeight) prevMaxWeight = w;
    if (e1rm > prevBest1rm) prevBest1rm = e1rm;
  }

  const volumeDelta = Math.round((curVolume - prevVolume) * 100) / 100;
  const volumePercent = prevVolume > 0 ? Math.round(((curVolume - prevVolume) / prevVolume) * 1000) / 10 : null;
  const maxWeightDelta = Math.round((curMaxWeight - prevMaxWeight) * 100) / 100;
  const best1rmDelta = Math.round((curBest1rm - prevBest1rm) * 100) / 100;

  const maxSetCount = Math.max(completedCurrent.length, completedPrevious.length);
  const setComparisons: SetComparisonItem[] = [];

  for (let i = 0; i < maxSetCount; i++) {
    const c = completedCurrent[i];
    const p = completedPrevious[i];

    const curDetail = c
      ? {
          weightKg: c.weightKg ?? 0,
          reps: c.reps ?? 0,
          volume: calculateSetVolume(
            { weightKg: c.weightKg ?? 0, reps: c.reps ?? 0, setType: c.setType ?? 'normal', isCompleted: true },
            exerciseType,
            bodyweightKg,
          ),
          e1rm: calculateEstimated1RM(c.weightKg ?? 0, c.reps ?? 0),
        }
      : null;

    const prevDetail = p
      ? {
          weightKg: p.weightKg ?? 0,
          reps: p.reps ?? 0,
          volume: calculateSetVolume(
            { weightKg: p.weightKg ?? 0, reps: p.reps ?? 0, setType: p.setType ?? 'normal', isCompleted: true },
            exerciseType,
            bodyweightKg,
          ),
          e1rm: calculateEstimated1RM(p.weightKg ?? 0, p.reps ?? 0),
        }
      : null;

    const weightDelta = curDetail && prevDetail ? Math.round((curDetail.weightKg - prevDetail.weightKg) * 100) / 100 : null;
    const repsDelta = curDetail && prevDetail ? curDetail.reps - prevDetail.reps : null;
    const volDelta = curDetail && prevDetail ? Math.round((curDetail.volume - prevDetail.volume) * 100) / 100 : null;
    const e1rmDelta = curDetail && prevDetail ? Math.round((curDetail.e1rm - prevDetail.e1rm) * 100) / 100 : null;

    setComparisons.push({
      setIndex: i + 1,
      current: curDetail,
      previous: prevDetail,
      weightDeltaKg: weightDelta,
      repsDelta,
      volumeDeltaKg: volDelta,
      e1rmDeltaKg: e1rmDelta,
    });
  }

  return {
    currentTotalVolumeKg: Math.round(curVolume * 100) / 100,
    previousTotalVolumeKg: Math.round(prevVolume * 100) / 100,
    volumeDeltaKg: volumeDelta,
    volumePercentChange: volumePercent,
    currentMaxWeightKg: curMaxWeight,
    previousMaxWeightKg: prevMaxWeight,
    maxWeightDeltaKg: maxWeightDelta,
    currentBest1rmKg: curBest1rm,
    previousBest1rmKg: prevBest1rm,
    best1rmDeltaKg: best1rmDelta,
    setComparisons,
  };
}
