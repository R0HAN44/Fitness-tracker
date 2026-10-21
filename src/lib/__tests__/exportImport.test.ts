/**
 * Unit tests for Data Portability:
 * - Versioned JSON backup validation
 * - Shared routine JSON validation
 * - CSV generation and escaping
 * - Hevy and Strong CSV format detection & parsing
 * - Deduplication hash generation
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateBackupJSON,
  validateSharedRoutineJSON,
  generateWorkoutsCSV,
  parseCSVLines,
  detectCsvFormat,
  parseExternalWorkoutsCSV,
  IRONLOG_BACKUP_SCHEMA_VERSION,
} from '../../domain/exportImport';

describe('Data Portability: Backup JSON Validation', () => {
  it('accepts a valid Ironlog backup JSON structure', () => {
    const validJson = JSON.stringify({
      schemaVersion: 1,
      app: 'ironlog',
      exportedAt: '2026-10-21T12:00:00Z',
      metadata: {
        workoutsCount: 1,
        routinesCount: 1,
        measurementsCount: 1,
        appVersion: '1.0.0',
      },
      workouts: [
        {
          id: 'w-1',
          title: 'Chest Day',
          startedAt: '2026-10-21T10:00:00Z',
          finishedAt: '2026-10-21T11:00:00Z',
          durationSeconds: 3600,
          notes: null,
          totalVolumeKg: 5000,
          status: 'completed',
          routineId: null,
          importSource: null,
          importHash: null,
          exercises: [],
        },
      ],
      routines: [],
      measurements: [],
      customExercises: [],
    });

    const result = validateBackupJSON(validJson);
    assert.equal(result.valid, true);
    assert.equal(result.data?.metadata.workoutsCount, 1);
  });

  it('rejects backup from non-ironlog app or invalid schema', () => {
    const foreignJson = JSON.stringify({ app: 'other_app', schemaVersion: 1 });
    const res1 = validateBackupJSON(foreignJson);
    assert.equal(res1.valid, false);

    const futureJson = JSON.stringify({ app: 'ironlog', schemaVersion: 999, workouts: [], routines: [] });
    const res2 = validateBackupJSON(futureJson);
    assert.equal(res2.valid, false);
    assert.ok(res2.error?.includes('newer than this app version'));
  });
});

describe('Data Portability: Shared Routine JSON Validation', () => {
  it('validates a shared routine JSON', () => {
    const routineJson = JSON.stringify({
      schemaVersion: 1,
      type: 'ironlog_routine',
      title: 'Heavy Push',
      notes: 'Chest focus',
      exercises: [
        {
          exerciseName: 'Barbell Bench Press',
          sortOrder: 0,
          sets: [
            { setIndex: 0, setType: 'normal', targetWeightKg: 100, targetReps: 5 },
          ],
        },
      ],
    });

    const res = validateSharedRoutineJSON(routineJson);
    assert.equal(res.valid, true);
    assert.equal(res.data?.title, 'Heavy Push');
    assert.equal(res.data?.exercises.length, 1);
  });

  it('rejects malformed routine JSON', () => {
    const invalidJson = JSON.stringify({ type: 'other', title: 'Test' });
    const res = validateSharedRoutineJSON(invalidJson);
    assert.equal(res.valid, false);
  });
});

describe('Data Portability: CSV Generation & Escaping', () => {
  it('escapes quotes and commas in CSV export', () => {
    const sample = [
      {
        startedAt: '2026-10-21T10:00:00Z',
        title: 'Push, "Heavy"',
        durationSeconds: 3600,
        workoutNotes: 'Felt great, PR set',
        exerciseName: 'Barbell Bench Press',
        setOrder: 1,
        setType: 'normal',
        weightKg: 100,
        reps: 5,
        distanceMeters: null,
        setDurationSeconds: null,
        rpe: 8.5,
        setNotes: 'Smooth reps',
      },
    ];

    const csv = generateWorkoutsCSV(sample);
    assert.ok(csv.includes('"Push, ""Heavy"""'));
    assert.ok(csv.includes('Barbell Bench Press'));

    const parsed = parseCSVLines(csv);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[1][1], 'Push, "Heavy"');
  });
});

describe('Data Portability: Hevy & Strong CSV Detection & Parsing', () => {
  it('detects and parses Hevy CSV format with lbs unit conversion', () => {
    const hevyCsv = `Date,Workout Name,Exercise Name,Set Order,Weight,Weight Unit,Reps,RPE,Distance,Duration,Notes,Set Type
2026-10-10 18:00:00,Upper Body,Bench Press,1,135,lbs,10,7,,,Warm up,warmup
2026-10-10 18:00:00,Upper Body,Bench Press,2,225,lbs,5,9,,,Top set,normal
2026-10-10 18:00:00,Upper Body,Incline Dumbbell Press,1,70,lbs,8,8,,,,normal`;

    const parsedLines = parseCSVLines(hevyCsv);
    const format = detectCsvFormat(parsedLines[0]);
    assert.equal(format, 'hevy');

    const result = parseExternalWorkoutsCSV(hevyCsv);
    assert.equal(result.format, 'hevy');
    assert.equal(result.workouts.length, 1);

    const workout = result.workouts[0];
    assert.equal(workout.title, 'Upper Body');
    assert.equal(workout.exercises.length, 2);

    // Bench press warmup set
    const bp = workout.exercises[0];
    assert.equal(bp.exerciseName, 'Bench Press');
    assert.equal(bp.sets[0].setType, 'warmup');
    // 135 lbs = ~61.2 kg
    assert.equal(bp.sets[0].weightKg, 61.2);
    assert.equal(bp.sets[0].reps, 10);

    // 225 lbs = ~102.1 kg
    assert.equal(bp.sets[1].weightKg, 102.1);
    assert.equal(bp.sets[1].setType, 'normal');

    // Deduplication hash
    assert.ok(workout.importHash.startsWith('csv_'));
  });

  it('detects and parses Strong CSV format', () => {
    const strongCsv = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
2026-10-12 09:30:00,Leg Day,55m,Barbell Back Squat,1,100,5,,,,Squat session,8
2026-10-12 09:30:00,Leg Day,55m,Barbell Back Squat,2,110,5,,,,Squat session,9`;

    const result = parseExternalWorkoutsCSV(strongCsv);
    assert.equal(result.format, 'strong');
    assert.equal(result.workouts.length, 1);

    const workout = result.workouts[0];
    assert.equal(workout.title, 'Leg Day');
    assert.equal(workout.exercises[0].exerciseName, 'Barbell Back Squat');
    assert.equal(workout.exercises[0].sets.length, 2);
    assert.equal(workout.exercises[0].sets[0].weightKg, 100);
  });
});
