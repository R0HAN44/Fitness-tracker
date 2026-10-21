import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compareExerciseSessions, type ComparisonSet } from '../../domain/comparison';

describe('Past-Session Comparison Domain', () => {
  it('correctly compares two sessions with positive progress', () => {
    const prevSets: ComparisonSet[] = [
      { setIndex: 1, weightKg: 100, reps: 5, setType: 'normal', isCompleted: true },
      { setIndex: 2, weightKg: 100, reps: 5, setType: 'normal', isCompleted: true },
      { setIndex: 3, weightKg: 100, reps: 4, setType: 'normal', isCompleted: true },
    ];

    const curSets: ComparisonSet[] = [
      { setIndex: 1, weightKg: 100, reps: 5, setType: 'normal', isCompleted: true },
      { setIndex: 2, weightKg: 102.5, reps: 5, setType: 'normal', isCompleted: true },
      { setIndex: 3, weightKg: 102.5, reps: 5, setType: 'normal', isCompleted: true },
    ];

    const result = compareExerciseSessions(curSets, prevSets);

    assert.strictEqual(result.previousTotalVolumeKg, 1400); // 500 + 500 + 400
    assert.strictEqual(result.currentTotalVolumeKg, 1525); // 500 + 512.5 + 512.5
    assert.strictEqual(result.volumeDeltaKg, 125);
    assert.ok(result.volumePercentChange! > 8);
    assert.strictEqual(result.previousMaxWeightKg, 100);
    assert.strictEqual(result.currentMaxWeightKg, 102.5);
    assert.strictEqual(result.maxWeightDeltaKg, 2.5);

    // Set 2 comparison: 102.5 vs 100 (+2.5kg, 0 reps)
    const set2 = result.setComparisons[1];
    assert.strictEqual(set2.weightDeltaKg, 2.5);
    assert.strictEqual(set2.repsDelta, 0);

    // Set 3 comparison: 102.5x5 vs 100x4 (+2.5kg, +1 rep)
    const set3 = result.setComparisons[2];
    assert.strictEqual(set3.weightDeltaKg, 2.5);
    assert.strictEqual(set3.repsDelta, 1);
  });

  it('excludes warm-up sets from volume and comparison', () => {
    const prevSets: ComparisonSet[] = [
      { setIndex: 1, weightKg: 60, reps: 10, setType: 'warmup', isCompleted: true },
      { setIndex: 2, weightKg: 100, reps: 5, setType: 'normal', isCompleted: true },
    ];

    const curSets: ComparisonSet[] = [
      { setIndex: 1, weightKg: 60, reps: 10, setType: 'warmup', isCompleted: true },
      { setIndex: 2, weightKg: 105, reps: 5, setType: 'normal', isCompleted: true },
    ];

    const result = compareExerciseSessions(curSets, prevSets);
    assert.strictEqual(result.previousTotalVolumeKg, 500);
    assert.strictEqual(result.currentTotalVolumeKg, 525);
    assert.strictEqual(result.setComparisons.length, 1);
  });

  it('handles unequal set counts gracefully', () => {
    const prevSets: ComparisonSet[] = [
      { setIndex: 1, weightKg: 80, reps: 8, setType: 'normal', isCompleted: true },
    ];

    const curSets: ComparisonSet[] = [
      { setIndex: 1, weightKg: 80, reps: 8, setType: 'normal', isCompleted: true },
      { setIndex: 2, weightKg: 80, reps: 8, setType: 'normal', isCompleted: true },
    ];

    const result = compareExerciseSessions(curSets, prevSets);
    assert.strictEqual(result.setComparisons.length, 2);
    assert.strictEqual(result.setComparisons[1].previous, null);
    assert.strictEqual(result.setComparisons[1].current?.reps, 8);
  });
});
