import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculatePlates } from '../plateCalculator';

describe('Plate Calculator', () => {
  it('returns no plates when target weight equals barbell weight', () => {
    const result = calculatePlates(20, { barbellWeight: 20 });
    assert.strictEqual(result.isExact, true);
    assert.strictEqual(result.totalWeight, 20);
    assert.strictEqual(result.platesPerSide.length, 0);
    assert.strictEqual(result.plateSequence.length, 0);
  });

  it('handles target weight below barbell weight', () => {
    const result = calculatePlates(15, { barbellWeight: 20 });
    assert.strictEqual(result.isExact, false);
    assert.strictEqual(result.platesPerSide.length, 0);
    assert.strictEqual(result.totalWeight, 20);
  });

  it('calculates standard 100kg barbell load with 20kg bar', () => {
    // 100kg target - 20kg bar = 80kg total needed => 40kg per side
    // Available: [25, 20, 15, 10, 5, 2.5, 1.25]
    // 40kg = 25kg + 15kg per side
    const result = calculatePlates(100, { barbellWeight: 20 });
    assert.strictEqual(result.isExact, true);
    assert.strictEqual(result.totalWeight, 100);
    assert.strictEqual(result.weightPerSide, 40);
    assert.deepStrictEqual(result.plateSequence, [25, 15]);
  });

  it('calculates 60kg load (20kg plate per side)', () => {
    // 60kg - 20kg bar = 40kg total => 20kg per side
    const result = calculatePlates(60, { barbellWeight: 20 });
    assert.strictEqual(result.isExact, true);
    assert.strictEqual(result.totalWeight, 60);
    assert.deepStrictEqual(result.plateSequence, [20]);
  });

  it('calculates complex plate sequences', () => {
    // 142.5kg target - 20kg bar = 122.5kg => 61.25kg per side
    // 61.25kg = 25 + 25 + 10 + 1.25
    const result = calculatePlates(142.5, { barbellWeight: 20 });
    assert.strictEqual(result.isExact, true);
    assert.strictEqual(result.totalWeight, 142.5);
    assert.deepStrictEqual(result.plateSequence, [25, 25, 10, 1.25]);
  });

  it('calculates in pounds (45lb bar, lb plates)', () => {
    // 225lb target - 45lb bar = 180lb => 90lb per side = 45 + 45
    const result = calculatePlates(225, {
      barbellWeight: 45,
      availablePlates: [45, 35, 25, 10, 5, 2.5],
    });
    assert.strictEqual(result.isExact, true);
    assert.strictEqual(result.totalWeight, 225);
    assert.deepStrictEqual(result.plateSequence, [45, 45]);
  });

  it('reports remaining weight when target cannot be matched exactly', () => {
    // 101kg target - 20kg bar = 81kg => 40.5kg per side
    // With plates [25, 20, 15, 10, 5, 2.5] (smallest is 2.5):
    // 40.5kg -> 25 + 15 = 40kg per side. Total = 100kg. Remaining = 1kg.
    const result = calculatePlates(101, {
      barbellWeight: 20,
      availablePlates: [25, 20, 15, 10, 5, 2.5],
    });
    assert.strictEqual(result.isExact, false);
    assert.strictEqual(result.totalWeight, 100);
    assert.strictEqual(result.remainingWeight, 1);
  });
});
