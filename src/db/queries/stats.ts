/**
 * Stats and Analytics Queries — SQLite queries for dashboard, streaks,
 * muscle distribution, volume progression, and lifetime totals.
 */

import { eq, and, isNull, desc, asc, sql } from 'drizzle-orm';
import { getDb } from '../client';
import { workouts, workoutExercises, workoutSets, exercises, settings } from '../schema';
import {
  calculateStreaks,
  generateConsistencyHeatmap,
  aggregateVolumeOverTime,
  aggregateMuscleDistribution,
  type TimeRange,
  type ConsistencyHeatmapData,
  type VolumeTimePoint,
  type MuscleDistributionItem,
  type StreakResult,
} from '../../domain/stats';
import { muscleGroupLabels } from '../../constants/muscles';
import { getCompletedWorkouts, type CompletedWorkoutSummary } from './workouts';

export interface LifetimeStats {
  totalWorkouts: number;
  totalVolumeKg: number;
  totalSets: number;
  totalReps: number;
  totalDurationSeconds: number;
  weeklyGoal: number;
  streaks: StreakResult;
}

/**
 * Get lifetime summary statistics across all completed workouts.
 */
export function getLifetimeStats(): LifetimeStats {
  const db = getDb();

  // Settings
  const settingsRow = db.select({ goal: settings.weeklyWorkoutGoal }).from(settings).where(eq(settings.id, 'default')).get();
  const weeklyGoal = settingsRow?.goal ?? 4;

  // Completed workouts
  const completedWorkouts = db
    .select({
      id: workouts.id,
      startedAt: workouts.startedAt,
      durationSeconds: workouts.durationSeconds,
      totalVolumeKg: workouts.totalVolumeKg,
    })
    .from(workouts)
    .where(and(eq(workouts.status, 'completed'), isNull(workouts.deletedAt)))
    .orderBy(desc(workouts.startedAt))
    .all();

  const totalWorkouts = completedWorkouts.length;
  let totalVolumeKg = 0;
  let totalDurationSeconds = 0;
  const workoutDates: string[] = [];

  for (const w of completedWorkouts) {
    totalVolumeKg += w.totalVolumeKg ?? 0;
    totalDurationSeconds += w.durationSeconds ?? 0;
    if (w.startedAt) {
      workoutDates.push(w.startedAt);
    }
  }

  // Completed sets & reps
  const setsAndReps = db
    .select({
      totalSets: sql<number>`count(${workoutSets.id})`,
      totalReps: sql<number>`sum(${workoutSets.reps})`,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(
      and(
        eq(workouts.status, 'completed'),
        eq(workoutSets.isCompleted, true),
        isNull(workoutSets.deletedAt),
        isNull(workoutExercises.deletedAt),
        isNull(workouts.deletedAt),
      ),
    )
    .get();

  const streaks = calculateStreaks(workoutDates, weeklyGoal);

  return {
    totalWorkouts,
    totalVolumeKg: Math.round(totalVolumeKg),
    totalSets: Number(setsAndReps?.totalSets ?? 0),
    totalReps: Number(setsAndReps?.totalReps ?? 0),
    totalDurationSeconds,
    weeklyGoal,
    streaks,
  };
}

/**
 * Get consistency heatmap data for the past N weeks.
 */
export function getConsistencyHeatmap(weeks: number = 16): ConsistencyHeatmapData {
  const db = getDb();
  const rows = db
    .select({ startedAt: workouts.startedAt })
    .from(workouts)
    .where(and(eq(workouts.status, 'completed'), isNull(workouts.deletedAt)))
    .all();

  const dates = rows.map((r) => r.startedAt).filter(Boolean);
  return generateConsistencyHeatmap(dates, weeks);
}

/**
 * Get volume over time for charts across range.
 */
export function getVolumeOverTime(range: TimeRange = '3m'): VolumeTimePoint[] {
  const db = getDb();
  const rows = db
    .select({
      startedAt: workouts.startedAt,
      totalVolumeKg: workouts.totalVolumeKg,
    })
    .from(workouts)
    .where(and(eq(workouts.status, 'completed'), isNull(workouts.deletedAt)))
    .orderBy(asc(workouts.startedAt))
    .all();

  return aggregateVolumeOverTime(rows, range);
}

/**
 * Get muscle group distribution across completed workouts.
 */
export function getMuscleDistribution(rangeDays: number = 90): MuscleDistributionItem[] {
  const db = getDb();

  const cutoff = new Date(Date.now() - rangeDays * 86400000).toISOString();

  const rows = db
    .select({
      primaryMuscle: exercises.primaryMuscle,
      setsCount: sql<number>`count(${workoutSets.id})`,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(
      and(
        eq(workouts.status, 'completed'),
        eq(workoutSets.isCompleted, true),
        sql`${workouts.startedAt} >= ${cutoff}`,
        isNull(workoutSets.deletedAt),
        isNull(workoutExercises.deletedAt),
        isNull(workouts.deletedAt),
      ),
    )
    .groupBy(exercises.primaryMuscle)
    .all();

  const data = rows.map((r) => ({
    primaryMuscle: r.primaryMuscle,
    setsCount: Number(r.setsCount),
  }));

  return aggregateMuscleDistribution(data, muscleGroupLabels);
}

/**
 * Get recent workouts for the home dashboard.
 */
export function getRecentDashboardWorkouts(limit: number = 3): CompletedWorkoutSummary[] {
  return getCompletedWorkouts({ limit });
}
