import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculate1RMEpley,
  calculate1RMBrzycki,
  calculateEstimated1RM,
  calculateEffectiveLoad,
  calculateSetVolume,
  calculateWorkoutVolume,
} from '../calc';

describe('1RM & Volume Calculations', () => {
  describe('Epley 1RM Formula', () => {
    it('returns exact weight for 1 rep', () => {
      assert.strictEqual(calculate1RMEpley(100, 1), 100);
      assert.strictEqual(calculate1RMEpley(142.5, 1), 142.5);
    });

    it('calculates 1RM for standard reps: weight * (1 + reps/30)', () => {
      // 100kg for 10 reps = 100 * (1 + 10/30) = 133.333...
      const result = calculate1RMEpley(100, 10);
      assert.strictEqual(Math.round(result * 100) / 100, 133.33);

      // 80kg for 5 reps = 80 * (1 + 5/30) = 80 * 1.1666... = 93.33
      const result5 = calculate1RMEpley(80, 5);
      assert.strictEqual(Math.round(result5 * 100) / 100, 93.33);
    });

    it('handles zero or negative inputs safely', () => {
      assert.strictEqual(calculate1RMEpley(0, 10), 0);
      assert.strictEqual(calculate1RMEpley(100, 0), 0);
      assert.strictEqual(calculate1RMEpley(-50, 5), 0);
    });
  });

  describe('Brzycki 1RM Formula', () => {
    it('returns exact weight for 1 rep', () => {
      assert.strictEqual(calculate1RMBrzycki(100, 1), 100);
    });

    it('calculates 1RM for standard reps: weight * (36 / (37 - reps))', () => {
      // 100kg for 10 reps = 100 * (36 / 27) = 133.33
      const result = calculate1RMBrzycki(100, 10);
      assert.strictEqual(Math.round(result * 100) / 100, 133.33);

      // 100kg for 5 reps = 100 * (36 / 32) = 112.5
      assert.strictEqual(calculate1RMBrzycki(100, 5), 112.5);
    });

    it('falls back to Epley for high reps (>= 37) to avoid division by zero', () => {
      const brzyckiHigh = calculate1RMBrzycki(50, 40);
      const epleyHigh = calculate1RMEpley(50, 40);
      assert.strictEqual(brzyckiHigh, epleyHigh);
    });
  });

  describe('Effective Load per Exercise Type', () => {
    const bodyweight = 80;

    it('computes weight_reps load correctly', () => {
      assert.strictEqual(calculateEffectiveLoad(100, 'weight_reps', bodyweight), 100);
    });

    it('computes bodyweight_reps using bodyweight', () => {
      assert.strictEqual(calculateEffectiveLoad(0, 'bodyweight_reps', bodyweight), 80);
      // When no bodyweight is entered, effective load is null (excluded from volume)
      assert.strictEqual(calculateEffectiveLoad(null, 'bodyweight_reps', null), null);
    });

    it('computes weighted_bodyweight (bodyweight + added weight)', () => {
      assert.strictEqual(calculateEffectiveLoad(20, 'weighted_bodyweight', bodyweight), 100);
      assert.strictEqual(calculateEffectiveLoad(20, 'weighted_bodyweight', null), null);
    });

    it('computes assisted_bodyweight (bodyweight - assistance)', () => {
      assert.strictEqual(calculateEffectiveLoad(25, 'assisted_bodyweight', bodyweight), 55);
      // Assistance greater than bodyweight clamps to 0
      assert.strictEqual(calculateEffectiveLoad(90, 'assisted_bodyweight', bodyweight), 0);
      // Requirement 5(a): assisted-bodyweight sets with no bodyweight entry are excluded (null load, not counted as zero)
      assert.strictEqual(calculateEffectiveLoad(25, 'assisted_bodyweight', null), null);
    });
  });

  describe('Set and Workout Volume', () => {
    it('calculates set volume as effectiveLoad * reps', () => {
      const vol = calculateSetVolume({ weightKg: 100, reps: 5, setType: 'normal' }, 'weight_reps');
      assert.strictEqual(vol, 500);
    });

    it('strictly excludes warm-up sets from volume', () => {
      const warmupVol = calculateSetVolume({ weightKg: 100, reps: 10, setType: 'warmup' });
      assert.strictEqual(warmupVol, 0);
    });

    it('calculates total workout volume for completed non-warmup sets', () => {
      const sets = [
        { weightKg: 60, reps: 10, setType: 'warmup', isCompleted: true }, // warmup excluded
        { weightKg: 100, reps: 5, setType: 'normal', isCompleted: true },  // 500
        { weightKg: 100, reps: 5, setType: 'normal', isCompleted: true },  // 500
        { weightKg: 90, reps: 8, setType: 'drop', isCompleted: true },     // 720
        { weightKg: 100, reps: 5, setType: 'normal', isCompleted: false }, // uncompleted excluded
      ];

      const totalVol = calculateWorkoutVolume(sets);
      assert.strictEqual(totalVol, 1720);
    });
  });
});
