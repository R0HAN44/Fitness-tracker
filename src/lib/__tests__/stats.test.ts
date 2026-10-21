import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateStreaks,
  generateConsistencyHeatmap,
  aggregateVolumeOverTime,
  aggregateMuscleDistribution,
  filterExerciseProgression,
} from '../../domain/stats';

describe('Stats, Streaks & Heatmap Domain', () => {
  it('calculates streaks correctly for consecutive training weeks', () => {
    // 3 consecutive weeks with workouts
    const ref = new Date('2026-03-15T12:00:00Z'); // Sunday
    const dates = [
      '2026-03-01T10:00:00Z',
      '2026-03-04T10:00:00Z',
      '2026-03-08T10:00:00Z',
      '2026-03-12T10:00:00Z',
      '2026-03-14T10:00:00Z',
    ];

    const result = calculateStreaks(dates, 3, ref);
    assert.strictEqual(result.workoutsThisWeek, 2); // Mar 12 and Mar 14
    assert.ok(result.currentWeekStreak >= 3);
    assert.ok(result.longestWeekStreak >= 3);
  });

  it('generates consistent heatmap columns and intensity levels', () => {
    const ref = new Date('2026-03-15T12:00:00Z');
    const dates = [
      '2026-03-15T10:00:00Z',
      '2026-03-14T10:00:00Z',
      '2026-03-14T18:00:00Z', // 2 workouts on this day -> intensity 2
      '2026-03-10T10:00:00Z',
    ];

    const heatmap = generateConsistencyHeatmap(dates, 8, ref);
    assert.strictEqual(heatmap.columns.length, 8);
    for (const col of heatmap.columns) {
      assert.strictEqual(col.length, 7); // Mon to Sun
    }
    assert.strictEqual(heatmap.totalWorkouts, 4);
    assert.strictEqual(heatmap.activeDaysCount, 3);

    const mar14 = heatmap.days.find((d) => d.date === '2026-03-14');
    assert.strictEqual(mar14?.count, 2);
    assert.strictEqual(mar14?.intensity, 2);
  });

  it('aggregates volume over time correctly across ranges', () => {
    const ref = new Date('2026-03-15T12:00:00Z');
    const workouts = [
      { startedAt: '2026-01-10T10:00:00Z', totalVolumeKg: 5000 },
      { startedAt: '2026-02-15T10:00:00Z', totalVolumeKg: 6000 },
      { startedAt: '2026-03-12T10:00:00Z', totalVolumeKg: 7000 },
    ];

    const vol3m = aggregateVolumeOverTime(workouts, '3m', ref);
    assert.strictEqual(vol3m.length, 3);
    assert.strictEqual(vol3m[0].volumeKg, 5000);
    assert.strictEqual(vol3m[2].volumeKg, 7000);

    const vol1y = aggregateVolumeOverTime(workouts, '1y', ref);
    // Grouped by month
    assert.strictEqual(vol1y.length, 3);
  });

  it('aggregates muscle distribution percentages accurately', () => {
    const sets = [
      { primaryMuscle: 'chest', setsCount: 10 },
      { primaryMuscle: 'back', setsCount: 10 },
      { primaryMuscle: 'legs', setsCount: 20 },
    ];
    const labels: Record<string, string> = { chest: 'Chest', back: 'Back', legs: 'Legs' };

    const dist = aggregateMuscleDistribution(sets, labels);
    assert.strictEqual(dist.length, 3);
    assert.strictEqual(dist[0].muscle, 'legs'); // highest
    assert.strictEqual(dist[0].percentage, 50); // 20/40 = 50%
    assert.strictEqual(dist[1].percentage, 25);
    assert.strictEqual(dist[2].percentage, 25);
  });

  it('computes per-exercise progression points filtering out warmups', () => {
    const sessions = [
      {
        workoutDate: '2026-01-01T10:00:00Z',
        sets: [
          { weightKg: 50, reps: 10, setType: 'warmup' },
          { weightKg: 100, reps: 5, setType: 'normal' },
        ],
      },
      {
        workoutDate: '2026-01-10T10:00:00Z',
        sets: [
          { weightKg: 105, reps: 5, setType: 'normal' },
        ],
      },
    ];

    const progression = filterExerciseProgression(sessions, 'all');
    assert.strictEqual(progression.length, 2);
    assert.strictEqual(progression[0].maxWeightKg, 100);
    assert.strictEqual(progression[1].maxWeightKg, 105);
  });
});
