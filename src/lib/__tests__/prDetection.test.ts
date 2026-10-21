import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  detectNewPRs,
  recomputeExercisePRHistory,
  type ExistingPR,
  type CandidateSet,
} from '../prDetection';

describe('PR Detection', () => {
  const exerciseId = 'bench-press-1';

  it('detects all PR types for a first completed set', () => {
    const set: CandidateSet = {
      id: 'set-1',
      exerciseId,
      weightKg: 100,
      reps: 5,
      setType: 'normal',
      isCompleted: true,
      exerciseType: 'weight_reps',
    };

    const newPRs = detectNewPRs(set, []);
    assert.strictEqual(newPRs.length, 4);

    const types = newPRs.map((pr) => pr.recordType);
    assert.ok(types.includes('max_weight'));
    assert.ok(types.includes('best_1rm'));
    assert.ok(types.includes('best_set_volume'));
    assert.ok(types.includes('max_reps_at_weight'));

    const maxWeight = newPRs.find((pr) => pr.recordType === 'max_weight');
    assert.strictEqual(maxWeight?.value, 100);

    const best1RM = newPRs.find((pr) => pr.recordType === 'best_1rm');
    // 100 * (1 + 5/30) = 116.67
    assert.strictEqual(best1RM?.value, 116.67);

    const bestVol = newPRs.find((pr) => pr.recordType === 'best_set_volume');
    // 100 * 5 = 500
    assert.strictEqual(bestVol?.value, 500);

    const maxReps = newPRs.find((pr) => pr.recordType === 'max_reps_at_weight');
    assert.strictEqual(maxReps?.value, 5);
  });

  it('strictly ignores warmup sets', () => {
    const warmupSet: CandidateSet = {
      id: 'set-warmup',
      exerciseId,
      weightKg: 150,
      reps: 10,
      setType: 'warmup',
      isCompleted: true,
    };

    const newPRs = detectNewPRs(warmupSet, []);
    assert.strictEqual(newPRs.length, 0);
  });

  it('strictly ignores uncompleted sets', () => {
    const uncompletedSet: CandidateSet = {
      id: 'set-uncompleted',
      exerciseId,
      weightKg: 150,
      reps: 10,
      setType: 'normal',
      isCompleted: false,
    };

    const newPRs = detectNewPRs(uncompletedSet, []);
    assert.strictEqual(newPRs.length, 0);
  });

  it('detects a higher weight PR when previous record exists', () => {
    const currentPRs: ExistingPR[] = [
      { exerciseId, recordType: 'max_weight', value: 100, isCurrent: true },
      { exerciseId, recordType: 'best_1rm', value: 120, isCurrent: true },
      { exerciseId, recordType: 'best_set_volume', value: 600, isCurrent: true },
    ];

    const heavierSet: CandidateSet = {
      id: 'set-heavier',
      exerciseId,
      weightKg: 105,
      reps: 1,
      setType: 'normal',
      isCompleted: true,
    };

    const newPRs = detectNewPRs(heavierSet, currentPRs);
    // 105kg > 100kg -> max_weight
    // 105kg 1RM < 120kg -> not best_1rm
    // 105kg volume < 600 -> not best_set_volume
    // 1 rep @ 105kg -> max_reps_at_weight
    const maxWeightPR = newPRs.find((pr) => pr.recordType === 'max_weight');
    assert.ok(maxWeightPR);
    assert.strictEqual(maxWeightPR!.value, 105);
    assert.strictEqual(maxWeightPR!.previousValue, 100);

    const best1RM = newPRs.find((pr) => pr.recordType === 'best_1rm');
    assert.strictEqual(best1RM, undefined);
  });

  it('recomputes complete PR history chronologically', () => {
    const sets: CandidateSet[] = [
      // Day 1: 80kg x 5 reps (vol = 400, 1RM = 93.33)
      { id: 's1', exerciseId, weightKg: 80, reps: 5, setType: 'normal', isCompleted: true, completedAt: '2026-01-01T10:00:00Z' },
      // Day 2: 90kg x 3 reps (vol = 270, 1RM = 99) -> beats max_weight (90) and best_1rm (99)
      { id: 's2', exerciseId, weightKg: 90, reps: 3, setType: 'normal', isCompleted: true, completedAt: '2026-01-05T10:00:00Z' },
      // Day 3: 80kg x 8 reps (vol = 640, 1RM = 101.33) -> beats best_1rm (101.33), best_set_volume (640), max_reps_at_80 (8)
      { id: 's3', exerciseId, weightKg: 80, reps: 8, setType: 'normal', isCompleted: true, completedAt: '2026-01-10T10:00:00Z' },
    ];

    const history = recomputeExercisePRHistory(sets);
    assert.ok(history.length > 0);

    // Current max_weight should be 90
    const currentMaxWeight = history.find((pr) => pr.recordType === 'max_weight' && pr.isCurrent);
    assert.strictEqual(currentMaxWeight?.value, 90);
    assert.strictEqual(currentMaxWeight?.workoutSetId, 's2');

    // Current best_1rm should be 101.33 from set s3
    const currentBest1RM = history.find((pr) => pr.recordType === 'best_1rm' && pr.isCurrent);
    assert.strictEqual(currentBest1RM?.value, 101.33);
    assert.strictEqual(currentBest1RM?.workoutSetId, 's3');

    // Old best_1rm from s1 and s2 should have isCurrent = false
    const old1RMs = history.filter((pr) => pr.recordType === 'best_1rm' && !pr.isCurrent);
    assert.strictEqual(old1RMs.length, 2);
  });

  it('correctly updates current PRs when a past high set is edited or deleted', () => {
    const originalSets: CandidateSet[] = [
      { id: 's1', exerciseId, weightKg: 80, reps: 5, setType: 'normal', isCompleted: true, completedAt: '2026-01-01T10:00:00Z' },
      { id: 's2', exerciseId, weightKg: 100, reps: 5, setType: 'normal', isCompleted: true, completedAt: '2026-01-05T10:00:00Z' }, // 100kg PR
      { id: 's3', exerciseId, weightKg: 85, reps: 5, setType: 'normal', isCompleted: true, completedAt: '2026-01-10T10:00:00Z' },
    ];

    const initialHistory = recomputeExercisePRHistory(originalSets);
    const initialMaxWeight = initialHistory.find((pr) => pr.recordType === 'max_weight' && pr.isCurrent);
    assert.strictEqual(initialMaxWeight?.value, 100);

    // Scenario A: User deletes the 100kg set (s2)
    const setsAfterDeletion = originalSets.filter((s) => s.id !== 's2');
    const historyAfterDeletion = recomputeExercisePRHistory(setsAfterDeletion);
    const maxWeightAfterDeletion = historyAfterDeletion.find((pr) => pr.recordType === 'max_weight' && pr.isCurrent);
    assert.strictEqual(maxWeightAfterDeletion?.value, 85);
    assert.strictEqual(maxWeightAfterDeletion?.workoutSetId, 's3');

    // Scenario B: User edits s2 weight down from 100kg to 70kg
    const setsAfterEdit = originalSets.map((s) => (s.id === 's2' ? { ...s, weightKg: 70 } : s));
    const historyAfterEdit = recomputeExercisePRHistory(setsAfterEdit);
    const maxWeightAfterEdit = historyAfterEdit.find((pr) => pr.recordType === 'max_weight' && pr.isCurrent);
    assert.strictEqual(maxWeightAfterEdit?.value, 85);
    assert.strictEqual(maxWeightAfterEdit?.workoutSetId, 's3');
  });
});
