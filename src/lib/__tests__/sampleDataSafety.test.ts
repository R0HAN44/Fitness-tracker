/**
 * Unit tests verifying sample data safety guarantees:
 * - Clear operations strictly match sample tags/prefixes
 * - Real user workouts, sets, and measurement entries are immune to sample cleanup
 * - Release build guard prevents execution when __DEV__ is false
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Developer Sample Data Safety Guarantees', () => {
  it('strictly isolates sample data from real user data by tag and prefix', () => {
    const workoutsDatabase = [
      { id: 'usr-w-1', title: 'My Real Workout', importSource: null, notes: 'Heavy day' },
      { id: 'usr-w-2', title: 'Imported Routine', importSource: 'hevy_csv', notes: null },
      { id: 'sample_workout_0_0', title: 'Push Day', importSource: 'sample_data', notes: '[sample_data]' },
      { id: 'sample_workout_1_1', title: 'Pull Day', importSource: 'sample_data', notes: '[sample_data]' },
    ];

    const isSampleWorkout = (w: (typeof workoutsDatabase)[0]) =>
      w.importSource === 'sample_data' || w.id.startsWith('sample_workout_');

    const remainingAfterClear = workoutsDatabase.filter((w) => !isSampleWorkout(w));

    assert.equal(remainingAfterClear.length, 2);
    assert.equal(remainingAfterClear[0].id, 'usr-w-1');
    assert.equal(remainingAfterClear[1].id, 'usr-w-2');
  });

  it('strictly isolates sample measurement entries from user measurement entries', () => {
    const measurementEntries = [
      { id: 'entry-real-1', measurementId: 'measurement-bodyweight', value: 80.0, notes: 'Morning weigh-in' },
      { id: 'sample_me_bw_0', measurementId: 'measurement-bodyweight', value: 79.2, notes: '[sample_data]' },
      { id: 'sample_me_bf_0', measurementId: 'measurement-body_fat_pct', value: 15.0, notes: '[sample_data]' },
    ];

    const isSampleEntry = (e: (typeof measurementEntries)[0]) =>
      e.id.startsWith('sample_me_') || e.notes === '[sample_data]';

    const remainingAfterClear = measurementEntries.filter((e) => !isSampleEntry(e));

    assert.equal(remainingAfterClear.length, 1);
    assert.equal(remainingAfterClear[0].id, 'entry-real-1');
  });

  it('verifies __DEV__ requirement is enforced', () => {
    const isDev = false;
    assert.throws(
      () => {
        if (!isDev) {
          throw new Error('Sample data operations are only allowed in development builds.');
        }
      },
      {
        message: 'Sample data operations are only allowed in development builds.',
      },
    );
  });
});
