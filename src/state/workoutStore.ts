/**
 * Active workout Zustand store.
 *
 * Coordinates in-memory state with SQLite persistence.
 * Every action (add/remove exercise, set edit, set completion, rest timer)
 * writes directly to SQLite immediately.
 * Rest timer survives app kills and restores exact remaining countdown on restart.
 */

import { create } from 'zustand';
import {
  getActiveWorkout,
  startWorkout as dbStartWorkout,
  addExerciseToActiveWorkout,
  removeExerciseFromWorkout,
  reorderWorkoutExercises,
  replaceWorkoutExercise,
  updateWorkoutExerciseNotes,
  createOrAssignSupersetGroup,
  ungroupWorkoutExercise,
  addSetToExercise,
  updateWorkoutSet,
  toggleSetCompleted as dbToggleSetCompleted,
  deleteWorkoutSet,
  updateWorkoutRestTimer,
  updateWorkoutMeta,
  finishWorkout as dbFinishWorkout,
  discardWorkout as dbDiscardWorkout,
  type ActiveWorkout,
  type FullWorkoutSet,
} from '../db/queries/workouts';
import type { NewPRResult } from '../domain/prDetection';
import {
  mediumImpact,
  heavyImpact,
  notificationWarning,
  notificationSuccess,
} from '../lib/haptics';
import {
  enableWorkoutKeepAwake,
  disableWorkoutKeepAwake,
} from '../lib/keepAwake';
import {
  scheduleRestTimerNotification,
  cancelScheduledRestTimerNotification,
} from '../lib/notifications';

interface WorkoutStoreState {
  activeWorkout: ActiveWorkout | null;
  isLoading: boolean;

  // Rest Timer State
  restRemainingSeconds: number;
  restTotalSeconds: number;
  isRestTimerRunning: boolean;

  // PR Celebration State
  recentPRs: NewPRResult[];

  // Actions
  loadActiveWorkout: () => void;
  startWorkout: (options?: { title?: string; routineId?: string }) => void;
  addExercise: (exerciseId: string) => void;
  removeExercise: (workoutExerciseId: string) => void;
  replaceExercise: (workoutExerciseId: string, newExerciseId: string) => void;
  updateExerciseNotes: (workoutExerciseId: string, notes: string | null) => void;
  reorderExercises: (orderedWorkoutExerciseIds: string[]) => void;
  groupExercisesIntoSuperset: (workoutExerciseIds: string[]) => void;
  ungroupExercise: (workoutExerciseId: string) => void;
  addSet: (workoutExerciseId: string) => void;
  updateSet: (setId: string, updates: Partial<FullWorkoutSet>) => void;
  toggleSetCompleted: (setId: string) => void;
  deleteSet: (setId: string) => void;
  adjustRestTimer: (deltaSeconds: number) => void;
  skipRestTimer: () => void;
  clearRecentPRs: () => void;
  updateMeta: (updates: { title?: string; notes?: string }) => void;
  finishWorkout: (summary?: { title?: string; notes?: string }) => void;
  discardWorkout: () => void;
}

let restIntervalId: ReturnType<typeof setInterval> | null = null;

export const useWorkoutStore = create<WorkoutStoreState>((set, get) => ({
  activeWorkout: null,
  isLoading: true,
  restRemainingSeconds: 0,
  restTotalSeconds: 0,
  isRestTimerRunning: false,
  recentPRs: [],

  loadActiveWorkout: () => {
    try {
      const active = getActiveWorkout();
      if (!active) {
        set({ activeWorkout: null, isLoading: false, isRestTimerRunning: false });
        return;
      }

      // Activate keep awake when workout is restored
      enableWorkoutKeepAwake();

      // Check for rest timer restoration
      let remaining = 0;
      let total = 0;
      let running = false;

      if (active.restStartedAt && active.restDurationSeconds) {
        const startedMs = new Date(active.restStartedAt).getTime();
        const elapsedSecs = Math.floor((Date.now() - startedMs) / 1000);
        remaining = Math.max(0, active.restDurationSeconds - elapsedSecs);
        total = active.restDurationSeconds;

        if (remaining > 0) {
          running = true;
          scheduleRestTimerNotification(remaining);
          startRestInterval(remaining, total, set, get);
        } else {
          // Timer finished while app was closed
          updateWorkoutRestTimer(active.id, null, null);
        }
      }

      set({
        activeWorkout: active,
        isLoading: false,
        restRemainingSeconds: remaining,
        restTotalSeconds: total,
        isRestTimerRunning: running,
      });
    } catch (e) {
      console.error('Error loading active workout:', e);
      set({ isLoading: false });
    }
  },

  startWorkout: (options) => {
    try {
      const active = dbStartWorkout(options);
      enableWorkoutKeepAwake();
      set({ activeWorkout: active });
    } catch (e) {
      console.error('Error starting workout:', e);
    }
  },

  addExercise: (exerciseId) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    try {
      addExerciseToActiveWorkout(activeWorkout.id, exerciseId);
      // Reload full updated workout structure from SQLite
      const updated = getActiveWorkout();
      set({ activeWorkout: updated });
    } catch (e) {
      console.error('Error adding exercise:', e);
    }
  },

  removeExercise: (workoutExerciseId) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    try {
      removeExerciseFromWorkout(workoutExerciseId);
      const updated = getActiveWorkout();
      set({ activeWorkout: updated });
    } catch (e) {
      console.error('Error removing exercise:', e);
    }
  },

  replaceExercise: (workoutExerciseId, newExerciseId) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    try {
      replaceWorkoutExercise(workoutExerciseId, newExerciseId);
      const updated = getActiveWorkout();
      set({ activeWorkout: updated });
    } catch (e) {
      console.error('Error replacing exercise:', e);
    }
  },

  updateExerciseNotes: (workoutExerciseId, notes) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    try {
      updateWorkoutExerciseNotes(workoutExerciseId, notes);
      const updated = getActiveWorkout();
      set({ activeWorkout: updated });
    } catch (e) {
      console.error('Error updating exercise notes:', e);
    }
  },

  reorderExercises: (orderedIds) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    try {
      reorderWorkoutExercises(activeWorkout.id, orderedIds);
      const updated = getActiveWorkout();
      set({ activeWorkout: updated });
    } catch (e) {
      console.error('Error reordering exercises:', e);
    }
  },

  groupExercisesIntoSuperset: (workoutExerciseIds) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    try {
      createOrAssignSupersetGroup(activeWorkout.id, workoutExerciseIds);
      const updated = getActiveWorkout();
      set({ activeWorkout: updated });
    } catch (e) {
      console.error('Error grouping superset:', e);
    }
  },

  ungroupExercise: (workoutExerciseId) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    try {
      ungroupWorkoutExercise(workoutExerciseId);
      const updated = getActiveWorkout();
      set({ activeWorkout: updated });
    } catch (e) {
      console.error('Error ungrouping exercise:', e);
    }
  },

  addSet: (workoutExerciseId) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    try {
      addSetToExercise(workoutExerciseId, true);
      const updated = getActiveWorkout();
      set({ activeWorkout: updated });
    } catch (e) {
      console.error('Error adding set:', e);
    }
  },

  updateSet: (setId, updates) => {
    try {
      updateWorkoutSet(setId, updates);

      // Optimistically update in-memory active workout
      const { activeWorkout } = get();
      if (!activeWorkout) return;

      const updatedExercises = activeWorkout.exercises.map((we) => ({
        ...we,
        sets: we.sets.map((s) => (s.id === setId ? { ...s, ...updates } : s)),
      }));

      set({
        activeWorkout: { ...activeWorkout, exercises: updatedExercises },
      });
    } catch (e) {
      console.error('Error updating set:', e);
    }
  },

  toggleSetCompleted: (setId) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    // Find current set to know target completion state
    let targetCompleted = true;
    for (const we of activeWorkout.exercises) {
      const found = we.sets.find((s) => s.id === setId);
      if (found) {
        targetCompleted = !found.isCompleted;
        break;
      }
    }

    try {
      const result = dbToggleSetCompleted(activeWorkout.id, setId, targetCompleted);

      // Reload updated workout state from SQLite
      const updatedWorkout = getActiveWorkout();

      if (targetCompleted) {
        mediumImpact();

        // If PRs were broken, trigger heavy impact haptic & celebration
        if (result.newPRs.length > 0) {
          heavyImpact();
          set({ recentPRs: result.newPRs });
        }

        // Start rest timer
        if (result.restTimer) {
          const { durationSeconds } = result.restTimer;
          set({
            restRemainingSeconds: durationSeconds,
            restTotalSeconds: durationSeconds,
            isRestTimerRunning: true,
          });
          scheduleRestTimerNotification(durationSeconds);
          startRestInterval(durationSeconds, durationSeconds, set, get);
        }
      } else {
        cancelScheduledRestTimerNotification();
      }

      set({ activeWorkout: updatedWorkout });
    } catch (e) {
      console.error('Error toggling set completion:', e);
    }
  },

  deleteSet: (setId) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    try {
      deleteWorkoutSet(setId);
      const updated = getActiveWorkout();
      set({ activeWorkout: updated });
    } catch (e) {
      console.error('Error deleting set:', e);
    }
  },

  adjustRestTimer: (deltaSeconds) => {
    const { restRemainingSeconds, restTotalSeconds, activeWorkout } = get();
    const nextRemaining = Math.max(0, restRemainingSeconds + deltaSeconds);
    const nextTotal = Math.max(nextRemaining, restTotalSeconds + deltaSeconds);

    if (activeWorkout) {
      // Recalculate restStartedAt to match adjusted remaining
      const newStartedAt = new Date(Date.now() - (nextTotal - nextRemaining) * 1000).toISOString();
      updateWorkoutRestTimer(activeWorkout.id, newStartedAt, nextTotal);
    }

    if (nextRemaining > 0) {
      scheduleRestTimerNotification(nextRemaining);
    } else {
      cancelScheduledRestTimerNotification();
    }

    set({
      restRemainingSeconds: nextRemaining,
      restTotalSeconds: nextTotal,
    });
  },

  skipRestTimer: () => {
    if (restIntervalId) {
      clearInterval(restIntervalId);
      restIntervalId = null;
    }

    cancelScheduledRestTimerNotification();

    const { activeWorkout } = get();
    if (activeWorkout) {
      updateWorkoutRestTimer(activeWorkout.id, null, null);
    }

    set({
      restRemainingSeconds: 0,
      isRestTimerRunning: false,
    });
  },

  clearRecentPRs: () => {
    set({ recentPRs: [] });
  },

  updateMeta: (updates) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    try {
      updateWorkoutMeta(activeWorkout.id, updates);
      set({
        activeWorkout: {
          ...activeWorkout,
          title: updates.title ?? activeWorkout.title,
          notes: updates.notes ?? activeWorkout.notes,
        },
      });
    } catch (e) {
      console.error('Error updating workout meta:', e);
    }
  },

  finishWorkout: (summary) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    try {
      if (restIntervalId) {
        clearInterval(restIntervalId);
        restIntervalId = null;
      }

      cancelScheduledRestTimerNotification();
      disableWorkoutKeepAwake();

      dbFinishWorkout(activeWorkout.id, summary);
      notificationSuccess();

      set({
        activeWorkout: null,
        isRestTimerRunning: false,
        restRemainingSeconds: 0,
        recentPRs: [],
      });
    } catch (e) {
      console.error('Error finishing workout:', e);
    }
  },

  discardWorkout: () => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    try {
      if (restIntervalId) {
        clearInterval(restIntervalId);
        restIntervalId = null;
      }

      cancelScheduledRestTimerNotification();
      disableWorkoutKeepAwake();

      dbDiscardWorkout(activeWorkout.id);

      set({
        activeWorkout: null,
        isRestTimerRunning: false,
        restRemainingSeconds: 0,
        recentPRs: [],
      });
    } catch (e) {
      console.error('Error discarding workout:', e);
    }
  },
}));

function startRestInterval(
  initialRemaining: number,
  total: number,
  set: (state: Partial<WorkoutStoreState>) => void,
  get: () => WorkoutStoreState,
) {
  if (restIntervalId) {
    clearInterval(restIntervalId);
  }

  restIntervalId = setInterval(() => {
    const current = get().restRemainingSeconds;
    if (current <= 1) {
      if (restIntervalId) {
        clearInterval(restIntervalId);
        restIntervalId = null;
      }

      notificationWarning();

      const { activeWorkout } = get();
      if (activeWorkout) {
        updateWorkoutRestTimer(activeWorkout.id, null, null);
      }

      set({
        restRemainingSeconds: 0,
        isRestTimerRunning: false,
      });
    } else {
      set({ restRemainingSeconds: current - 1 });
    }
  }, 1000);
}
