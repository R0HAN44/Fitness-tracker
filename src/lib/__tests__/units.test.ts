import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  kgToLb,
  lbToKg,
  cmToIn,
  inToCm,
  roundToStep,
  toDisplayWeight,
  toDatabaseWeight,
  formatWeight,
  formatDuration,
  parseDuration,
} from '../units';

describe('Unit Conversion Utilities', () => {
  it('converts kg to lb accurately', () => {
    assert.strictEqual(Math.round(kgToLb(100) * 100) / 100, 220.46);
    assert.strictEqual(kgToLb(0), 0);
  });

  it('converts lb to kg accurately', () => {
    assert.strictEqual(Math.round(lbToKg(220.462) * 100) / 100, 100);
    assert.strictEqual(lbToKg(0), 0);
  });

  it('converts round-trip kg -> lb -> kg without loss', () => {
    const original = 82.5;
    const roundTripped = lbToKg(kgToLb(original));
    assert.ok(Math.abs(roundTripped - original) < 1e-10);
  });

  it('converts cm to in and in to cm', () => {
    assert.strictEqual(inToCm(1), 2.54);
    assert.ok(Math.abs(cmToIn(2.54) - 1) < 1e-6);
  });

  it('rounds to specified step', () => {
    assert.strictEqual(roundToStep(102.3, 0.5), 102.5);
    assert.strictEqual(roundToStep(102.1, 0.5), 102.0);
    assert.strictEqual(roundToStep(103.8, 2.5), 105.0);
    assert.strictEqual(roundToStep(101.2, 2.5), 100.0);
  });

  it('formats weight with and without units', () => {
    assert.strictEqual(formatWeight(100, 'kg'), '100 kg');
    assert.strictEqual(formatWeight(100, 'lb', { decimals: 1 }), '220.5 lb');
    assert.strictEqual(formatWeight(null, 'kg'), '- kg');
    assert.strictEqual(formatWeight(undefined, 'kg', { includeUnit: false }), '-');
  });

  it('formats duration into MM:SS and HH:MM:SS', () => {
    assert.strictEqual(formatDuration(0), '0:00');
    assert.strictEqual(formatDuration(45), '0:45');
    assert.strictEqual(formatDuration(90), '1:30');
    assert.strictEqual(formatDuration(3665), '1:01:05');
  });

  it('parses duration strings', () => {
    assert.strictEqual(parseDuration('1:30'), 90);
    assert.strictEqual(parseDuration('90'), 90);
    assert.strictEqual(parseDuration('1:00:00'), 3600);
    assert.strictEqual(parseDuration('invalid'), null);
  });
});
