import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { STARTER_ROUTINES } from '../../domain/routines';

describe('Routines Domain & Blueprints', () => {
  it('contains all required starter routine blueprints (PPL, Upper/Lower, Full Body, 5x5)', () => {
    const routineNames = STARTER_ROUTINES.map((r) => r.name);
    assert.ok(routineNames.includes('Push (Chest, Shoulders, Triceps)'));
    assert.ok(routineNames.includes('Pull (Back, Biceps, Rear Delts)'));
    assert.ok(routineNames.includes('Legs (Quads, Hamstrings, Calves)'));
    assert.ok(routineNames.includes('Upper Body Power'));
    assert.ok(routineNames.includes('Lower Body Power'));
    assert.ok(routineNames.includes('Full Body Foundations'));
    assert.ok(routineNames.includes('5x5 Strength Workout A'));
    assert.ok(routineNames.includes('5x5 Strength Workout B'));
  });

  it('verifies starter routine blueprints have valid exercise targets', () => {
    for (const routine of STARTER_ROUTINES) {
      assert.ok(routine.name.length > 0);
      assert.ok(routine.folderName.length > 0);
      assert.ok(routine.exercises.length >= 3, `Routine ${routine.name} should have >= 3 exercises`);

      for (const ex of routine.exercises) {
        assert.ok(ex.slug.length > 0);
        assert.ok(ex.targetSets > 0);
        assert.ok(ex.targetReps > 0);
      }
    }
  });

  it('validates routine-to-workout transfer logic', () => {
    // Simulating copying routine template data into live workout structures
    const mockRoutine = {
      id: 'routine-ppl-push',
      name: 'Push Day',
      exercises: [
        {
          exerciseId: 'bench-press-id',
          supersetGroupId: 'routine-sg-1',
          sets: [
            { setType: 'normal', targetWeightKg: 80, targetReps: 8 },
            { setType: 'normal', targetWeightKg: 80, targetReps: 8 },
            { setType: 'normal', targetWeightKg: 80, targetReps: 8 },
          ],
        },
        {
          exerciseId: 'incline-db-id',
          supersetGroupId: 'routine-sg-1',
          sets: [
            { setType: 'normal', targetWeightKg: 30, targetReps: 10 },
            { setType: 'normal', targetWeightKg: 30, targetReps: 10 },
          ],
        },
      ],
    };

    // Transform routine to live workout sets
    const workoutExercises = mockRoutine.exercises.map((re, idx) => ({
      sortOrder: idx + 1,
      exerciseId: re.exerciseId,
      supersetGroupId: re.supersetGroupId ? 'workout-sg-new' : null,
      sets: re.sets.map((s, sIdx) => ({
        setIndex: sIdx + 1,
        setType: s.setType,
        weightKg: s.targetWeightKg,
        reps: s.targetReps,
        isCompleted: false,
      })),
    }));

    assert.strictEqual(workoutExercises.length, 2);
    // Bench press sets
    assert.strictEqual(workoutExercises[0].sets.length, 3);
    assert.strictEqual(workoutExercises[0].sets[0].weightKg, 80);
    assert.strictEqual(workoutExercises[0].sets[0].reps, 8);
    assert.strictEqual(workoutExercises[0].sets[0].isCompleted, false);
    // Both exercises share the mapped superset group
    assert.strictEqual(workoutExercises[0].supersetGroupId, workoutExercises[1].supersetGroupId);
  });

  it('validates workout-to-routine save logic', () => {
    // Simulating saving a finished workout as a routine template
    const finishedWorkout = {
      title: 'Leg Day Blast',
      notes: 'Crushed squats today',
      exercises: [
        {
          exerciseId: 'squat-id',
          notes: 'Belt on for sets 3-4',
          sets: [
            { setIndex: 1, setType: 'warmup', weightKg: 60, reps: 10, isCompleted: true },
            { setIndex: 2, setType: 'normal', weightKg: 100, reps: 8, isCompleted: true },
            { setIndex: 3, setType: 'normal', weightKg: 110, reps: 6, isCompleted: true },
          ],
        },
      ],
    };

    const routineDraft = {
      name: finishedWorkout.title,
      notes: finishedWorkout.notes,
      exercises: finishedWorkout.exercises.map((we) => ({
        exerciseId: we.exerciseId,
        notes: we.notes,
        sets: we.sets.map((s) => ({
          setType: s.setType,
          targetWeightKg: s.weightKg,
          targetReps: s.reps,
        })),
      })),
    };

    assert.strictEqual(routineDraft.name, 'Leg Day Blast');
    assert.strictEqual(routineDraft.exercises[0].sets.length, 3);
    assert.strictEqual(routineDraft.exercises[0].sets[1].targetWeightKg, 100);
    assert.strictEqual(routineDraft.exercises[0].sets[1].targetReps, 8);
    assert.strictEqual(routineDraft.exercises[0].notes, 'Belt on for sets 3-4');
  });
});
