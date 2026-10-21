/**
 * Keep-awake wrapper — keeps device screen on during an active workout session.
 *
 * Automatically activated when starting/resuming a workout, and deactivated
 * when the workout is finished or discarded.
 */

import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const WORKOUT_KEEP_AWAKE_TAG = 'ironlog_active_workout';

export async function enableWorkoutKeepAwake(): Promise<void> {
  try {
    await activateKeepAwakeAsync(WORKOUT_KEEP_AWAKE_TAG);
  } catch (err) {
    // Graceful fallback on unsupported platforms
    console.warn('Failed to activate keep-awake:', err);
  }
}

export function disableWorkoutKeepAwake(): void {
  try {
    deactivateKeepAwake(WORKOUT_KEEP_AWAKE_TAG);
  } catch (err) {
    console.warn('Failed to deactivate keep-awake:', err);
  }
}
