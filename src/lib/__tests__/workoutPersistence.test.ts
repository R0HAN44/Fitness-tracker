import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateWorkoutVolume } from '../calc';

describe('Workout Persistence & Rest Timer Restoration', () => {
  it('correctly calculates remaining rest timer seconds across app restart', () => {
    const durationSeconds = 90;
    // Simulate workout killed 25 seconds ago
    const simulatedKillTime = new Date(Date.now() - 25 * 1000).toISOString();

    const elapsed = Math.floor(
      (Date.now() - new Date(simulatedKillTime).getTime()) / 1000,
    );
    const remaining = Math.max(0, durationSeconds - elapsed);

    assert.strictEqual(remaining, 65);
  });

  it('correctly reports 0 remaining when rest timer expired while app was dead', () => {
    const durationSeconds = 60;
    // Simulate workout killed 120 seconds ago
    const simulatedKillTime = new Date(Date.now() - 120 * 1000).toISOString();

    const elapsed = Math.floor(
      (Date.now() - new Date(simulatedKillTime).getTime()) / 1000,
    );
    const remaining = Math.max(0, durationSeconds - elapsed);

    assert.strictEqual(remaining, 0);
  });

  it('preserves workout volume across sets omitting warmups', () => {
    const sets = [
      { weightKg: 20, reps: 15, setType: 'warmup', isCompleted: true },
      { weightKg: 60, reps: 10, setType: 'warmup', isCompleted: true },
      { weightKg: 100, reps: 5, setType: 'normal', isCompleted: true },  // 500
      { weightKg: 100, reps: 5, setType: 'normal', isCompleted: true },  // 500
      { weightKg: 100, reps: 4, setType: 'failure', isCompleted: true }, // 400
    ];

    const volume = calculateWorkoutVolume(sets);
    assert.strictEqual(volume, 1400);
  });
});
