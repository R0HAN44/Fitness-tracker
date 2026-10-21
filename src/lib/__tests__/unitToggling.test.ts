/**
 * Unit Toggling and Database Persistence Test Suite
 * Asserts that toggling the unit settings converts display values dynamically
 * while leaving database stored values strictly in kilograms (kg) and centimeters (cm).
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  toDisplayWeight,
  toDatabaseWeight,
  toDisplayLength,
  toDatabaseLength,
  formatWeight,
  formatLength,
  type WeightUnit,
  type LengthUnit,
} from '../../domain/units';

describe('Unit Toggling & Lossless Persistence', () => {
  it('converts display values when toggling between kg and lb without altering base storage', () => {
    // Database always stores in kg
    const dbStoredWeightKg = 100.0;

    // 1. Metric mode: user views in kg
    let activeUnit: WeightUnit = 'kg';
    let displayWeight = toDisplayWeight(dbStoredWeightKg, activeUnit);
    let formattedText = formatWeight(dbStoredWeightKg, activeUnit);

    assert.strictEqual(displayWeight, 100.0);
    assert.strictEqual(formattedText, '100 kg');
    assert.strictEqual(dbStoredWeightKg, 100.0, 'DB value must remain 100 kg');

    // 2. User toggles setting to Imperial (lb)
    activeUnit = 'lb';
    displayWeight = toDisplayWeight(dbStoredWeightKg, activeUnit, 0.5);
    formattedText = formatWeight(dbStoredWeightKg, activeUnit, { decimals: 1 });

    assert.strictEqual(displayWeight, 220.5, 'Display weight should convert to 220.5 lb');
    assert.strictEqual(formattedText, '220.5 lb');
    assert.strictEqual(dbStoredWeightKg, 100.0, 'DB value MUST NOT be altered when changing display unit');

    // 3. User toggles back to Metric (kg)
    activeUnit = 'kg';
    displayWeight = toDisplayWeight(dbStoredWeightKg, activeUnit);
    formattedText = formatWeight(dbStoredWeightKg, activeUnit);

    assert.strictEqual(displayWeight, 100.0);
    assert.strictEqual(formattedText, '100 kg');
    assert.strictEqual(dbStoredWeightKg, 100.0, 'DB value is pristine and intact');
  });

  it('converts user input in lb to stored kg losslessly', () => {
    // User types "225" lb (standard 2 plates per side in imperial gyms)
    const imperialInput = 225.0;
    const unit: WeightUnit = 'lb';

    // Converting for database storage
    const storedKg = toDatabaseWeight(imperialInput, unit);
    assert.ok(Math.abs(storedKg - 102.058) < 0.01, `Stored kg should be ~102.06 kg, got ${storedKg}`);

    // When queried back in imperial mode, it displays 225 lb
    const backToDisplay = toDisplayWeight(storedKg, 'lb', 0.5);
    assert.strictEqual(backToDisplay, 225.0);

    // When queried in metric mode, it displays 102 kg / 102.1 kg
    const metricDisplay = toDisplayWeight(storedKg, 'kg', 0.5);
    assert.strictEqual(metricDisplay, 102.0);
  });

  it('converts length measurements between cm and in while preserving base cm storage', () => {
    // Database always stores lengths in cm
    const dbStoredLengthCm = 180.0; // 180 cm height / wingspan

    // 1. Metric mode
    let unit: LengthUnit = 'cm';
    let displayLength = toDisplayLength(dbStoredLengthCm, unit);
    let formattedText = formatLength(dbStoredLengthCm, unit);

    assert.strictEqual(displayLength, 180.0);
    assert.strictEqual(formattedText, '180 cm');
    assert.strictEqual(dbStoredLengthCm, 180.0);

    // 2. User toggles setting to Imperial (in)
    unit = 'in';
    displayLength = toDisplayLength(dbStoredLengthCm, unit, 0.1);
    formattedText = formatLength(dbStoredLengthCm, unit, { decimals: 1 });

    assert.strictEqual(displayLength, 70.9, '180 cm should display as ~70.9 inches');
    assert.strictEqual(formattedText, '70.9 in');
    assert.strictEqual(dbStoredLengthCm, 180.0, 'Base cm in database remains untouched');

    // 3. User inputs an imperial measurement (e.g. 32 inches waist)
    const userInches = 32.0;
    const storedBaseCm = toDatabaseLength(userInches, 'in');

    assert.strictEqual(storedBaseCm, 81.28, '32 inches must be stored as 81.28 cm');

    // Querying it back in inches
    const retrievedInches = toDisplayLength(storedBaseCm, 'in', 0.1);
    assert.strictEqual(retrievedInches, 32.0);
  });

  it('simulates workout set logging lifecycle with unit toggling', () => {
    interface WorkoutSetRecord {
      id: string;
      weightKg: number | null;
      reps: number;
    }

    // Database record
    const setRecord: WorkoutSetRecord = {
      id: 'set-1',
      weightKg: 80.0, // 80 kg bench press
      reps: 8,
    };

    let userPreference: WeightUnit = 'kg';

    // UI reads set for display
    let uiDisplay = setRecord.weightKg != null ? toDisplayWeight(setRecord.weightKg, userPreference) : null;
    assert.strictEqual(uiDisplay, 80.0);

    // User switches app unit to lb in Settings
    userPreference = 'lb';
    uiDisplay = setRecord.weightKg != null ? toDisplayWeight(setRecord.weightKg, userPreference, 0.5) : null;
    assert.strictEqual(uiDisplay, 176.5); // 80 kg * 2.20462 = 176.37 -> 176.5
    assert.strictEqual(setRecord.weightKg, 80.0, 'Set record in database has NOT been converted');

    // User edits set while in lb mode: types "185" lb
    const editedValueInLb = 185.0;
    setRecord.weightKg = toDatabaseWeight(editedValueInLb, userPreference);

    // Stored in DB
    assert.ok(Math.abs(setRecord.weightKg - 83.91) < 0.05, `Stored DB weight should be ~83.91 kg, got ${setRecord.weightKg}`);

    // User switches app unit back to kg
    userPreference = 'kg';
    uiDisplay = setRecord.weightKg != null ? toDisplayWeight(setRecord.weightKg, userPreference, 0.5) : null;
    assert.strictEqual(uiDisplay, 84.0, 'Displays 84 kg rounded to 0.5 step');
  });
});
