/**
 * Reports and Strength Standards Queries — SQLite operations for
 * monthly training reports, annual Year-in-Review, and local strength classification.
 */

import { eq, and, isNull, desc, asc, sql } from 'drizzle-orm';
import { getDb } from '../client';
import {
  workouts,
  workoutExercises,
  workoutSets,
  exercises,
  exercisePersonalRecords,
  bodyMeasurements,
  bodyMeasurementEntries,
} from '../schema';
import {
  classifyStrengthTier,
  calculateOverallStrengthRanking,
  calculatePercentageChange,
  getMonthName,
  DAY_NAMES,
  STRENGTH_RATIO_STANDARDS,
  generateYearInReviewShareText,
  type MonthlyReportData,
  type YearInReviewData,
  type StrengthRankingReport,
  type StrengthStandardLift,
} from '../../domain/reports';
import { muscleGroupLabels, type MuscleGroup } from '../../constants/muscles';

// ────────────────────────────────────────────────────────────────────
// Monthly Report Query
// ────────────────────────────────────────────────────────────────────

export function getMonthlyReport(year: number, month: number): MonthlyReportData {
  const db = getDb();
  const monthStr = month.toString().padStart(2, '0');
  const yearStr = year.toString();
  const yearMonthPrefix = `${yearStr}-${monthStr}`;

  // Current month completed workouts
  const currentWorkouts = db
    .select({
      id: workouts.id,
      startedAt: workouts.startedAt,
      durationSeconds: workouts.durationSeconds,
      totalVolumeKg: workouts.totalVolumeKg,
    })
    .from(workouts)
    .where(
      and(
        eq(workouts.status, 'completed'),
        isNull(workouts.deletedAt),
        sql`strftime('%Y-%m', ${workouts.startedAt}) = ${yearMonthPrefix}`,
      ),
    )
    .orderBy(asc(workouts.startedAt))
    .all();

  const workoutCount = currentWorkouts.length;
  let totalVolumeKg = 0;
  let totalDurationSeconds = 0;
  const activeDaysSet = new Set<number>();

  for (const w of currentWorkouts) {
    totalVolumeKg += w.totalVolumeKg ?? 0;
    totalDurationSeconds += w.durationSeconds ?? 0;
    if (w.startedAt) {
      const dayNum = parseInt(w.startedAt.substring(8, 10), 10);
      if (!isNaN(dayNum)) {
        activeDaysSet.add(dayNum);
      }
    }
  }

  const activeDays = Array.from(activeDaysSet).sort((a, b) => a - b);

  // Sets and reps count
  const setsRepsRow = db
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
        sql`strftime('%Y-%m', ${workouts.startedAt}) = ${yearMonthPrefix}`,
      ),
    )
    .get();

  const totalSets = setsRepsRow?.totalSets ?? 0;
  const totalReps = setsRepsRow?.totalReps ?? 0;

  // Top exercises by volume
  const topExercisesRows = db
    .select({
      exerciseId: exercises.id,
      exerciseName: exercises.name,
      volumeKg: sql<number>`sum(coalesce(${workoutSets.weightKg}, 0) * coalesce(${workoutSets.reps}, 0))`,
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
        sql`${workoutSets.setType} != 'warmup'`,
        isNull(workoutSets.deletedAt),
        isNull(workoutExercises.deletedAt),
        isNull(workouts.deletedAt),
        sql`strftime('%Y-%m', ${workouts.startedAt}) = ${yearMonthPrefix}`,
      ),
    )
    .groupBy(exercises.id, exercises.name)
    .orderBy(desc(sql`sum(coalesce(${workoutSets.weightKg}, 0) * coalesce(${workoutSets.reps}, 0))`))
    .limit(5)
    .all();

  const topExercises = topExercisesRows.map((r) => ({
    exerciseId: r.exerciseId,
    exerciseName: r.exerciseName,
    volumeKg: Math.round(r.volumeKg ?? 0),
    setsCount: r.setsCount ?? 0,
  }));

  // Muscle distribution for the month
  const muscleRows = db
    .select({
      primaryMuscle: exercises.primaryMuscle,
      count: sql<number>`count(${workoutSets.id})`,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(
      and(
        eq(workouts.status, 'completed'),
        eq(workoutSets.isCompleted, true),
        isNull(workoutSets.deletedAt),
        isNull(workoutExercises.deletedAt),
        isNull(workouts.deletedAt),
        sql`strftime('%Y-%m', ${workouts.startedAt}) = ${yearMonthPrefix}`,
      ),
    )
    .groupBy(exercises.primaryMuscle)
    .orderBy(desc(sql`count(${workoutSets.id})`))
    .all();

  const totalMuscleSets = muscleRows.reduce((acc, row) => acc + (row.count || 0), 0);
  const muscleDistribution = muscleRows.map((row) => ({
    muscle: row.primaryMuscle,
    label: muscleGroupLabels[row.primaryMuscle as MuscleGroup] ?? row.primaryMuscle,
    count: row.count,
    percentage: totalMuscleSets > 0 ? Math.round((row.count / totalMuscleSets) * 100) : 0,
  }));

  // PRs achieved in the month
  const prRows = db
    .select({
      exerciseName: exercises.name,
      recordType: exercisePersonalRecords.recordType,
      value: exercisePersonalRecords.value,
      weightKg: exercisePersonalRecords.weightKg,
      achievedAt: exercisePersonalRecords.achievedAt,
    })
    .from(exercisePersonalRecords)
    .innerJoin(exercises, eq(exercisePersonalRecords.exerciseId, exercises.id))
    .where(
      and(
        isNull(exercisePersonalRecords.deletedAt),
        sql`strftime('%Y-%m', ${exercisePersonalRecords.achievedAt}) = ${yearMonthPrefix}`,
      ),
    )
    .orderBy(desc(exercisePersonalRecords.achievedAt))
    .all();

  const prsAchieved = prRows.map((pr) => ({
    exerciseName: pr.exerciseName,
    recordType: pr.recordType,
    value: pr.value,
    weightKg: pr.weightKg,
    achievedAt: pr.achievedAt,
  }));

  // Previous month comparison
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevYearMonthPrefix = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;

  const prevWorkouts = db
    .select({
      totalVolumeKg: workouts.totalVolumeKg,
    })
    .from(workouts)
    .where(
      and(
        eq(workouts.status, 'completed'),
        isNull(workouts.deletedAt),
        sql`strftime('%Y-%m', ${workouts.startedAt}) = ${prevYearMonthPrefix}`,
      ),
    )
    .all();

  const prevWorkoutCount = prevWorkouts.length;
  const prevVolumeKg = prevWorkouts.reduce((acc, w) => acc + (w.totalVolumeKg ?? 0), 0);

  return {
    year,
    month,
    monthName: getMonthName(month),
    workoutCount,
    totalVolumeKg: Math.round(totalVolumeKg),
    totalDurationSeconds,
    totalSets,
    totalReps,
    activeDays,
    activeDaysCount: activeDays.length,
    topExercises,
    muscleDistribution,
    prsAchieved,
    comparison: {
      prevWorkoutCount,
      prevVolumeKg: Math.round(prevVolumeKg),
      workoutChangePercent: calculatePercentageChange(workoutCount, prevWorkoutCount),
      volumeChangePercent: calculatePercentageChange(totalVolumeKg, prevVolumeKg),
    },
  };
}

/**
 * Get all available months that have logged workouts.
 */
export function getAvailableReportMonths(): Array<{
  year: number;
  month: number;
  label: string;
  workoutCount: number;
}> {
  const db = getDb();
  const rows = db
    .select({
      yearMonth: sql<string>`strftime('%Y-%m', ${workouts.startedAt})`,
      count: sql<number>`count(${workouts.id})`,
    })
    .from(workouts)
    .where(and(eq(workouts.status, 'completed'), isNull(workouts.deletedAt)))
    .groupBy(sql`strftime('%Y-%m', ${workouts.startedAt})`)
    .orderBy(desc(sql`strftime('%Y-%m', ${workouts.startedAt})`))
    .all();

  if (rows.length === 0) {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    return [
      {
        year: curYear,
        month: curMonth,
        label: `${getMonthName(curMonth)} ${curYear}`,
        workoutCount: 0,
      },
    ];
  }

  return rows.map((r) => {
    const [y, m] = r.yearMonth.split('-');
    const year = parseInt(y, 10);
    const month = parseInt(m, 10);
    return {
      year,
      month,
      label: `${getMonthName(month)} ${year}`,
      workoutCount: r.count,
    };
  });
}

// ────────────────────────────────────────────────────────────────────
// Year-in-Review Query
// ────────────────────────────────────────────────────────────────────

export function getYearInReview(year: number): YearInReviewData {
  const db = getDb();
  const yearStr = year.toString();

  // Completed workouts for the year
  const yearWorkouts = db
    .select({
      id: workouts.id,
      startedAt: workouts.startedAt,
      durationSeconds: workouts.durationSeconds,
      totalVolumeKg: workouts.totalVolumeKg,
    })
    .from(workouts)
    .where(
      and(
        eq(workouts.status, 'completed'),
        isNull(workouts.deletedAt),
        sql`strftime('%Y', ${workouts.startedAt}) = ${yearStr}`,
      ),
    )
    .all();

  const totalWorkouts = yearWorkouts.length;
  let totalVolumeKg = 0;
  let totalDurationSeconds = 0;
  const monthCounts = new Map<number, number>();
  const dayCounts = new Map<number, number>();

  for (const w of yearWorkouts) {
    totalVolumeKg += w.totalVolumeKg ?? 0;
    totalDurationSeconds += w.durationSeconds ?? 0;

    if (w.startedAt) {
      const d = new Date(w.startedAt);
      const m = d.getMonth() + 1;
      const day = d.getDay();
      monthCounts.set(m, (monthCounts.get(m) ?? 0) + 1);
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    }
  }

  // Most active month
  let mostActiveMonth: YearInReviewData['mostActiveMonth'] = null;
  let highestMonthCount = 0;
  for (const [m, count] of monthCounts.entries()) {
    if (count > highestMonthCount) {
      highestMonthCount = count;
      mostActiveMonth = {
        month: m,
        monthName: getMonthName(m),
        workoutCount: count,
      };
    }
  }

  // Favorite day of week
  let favoriteDayOfWeek: YearInReviewData['favoriteDayOfWeek'] = null;
  let highestDayCount = 0;
  for (const [dayIdx, count] of dayCounts.entries()) {
    if (count > highestDayCount) {
      highestDayCount = count;
      favoriteDayOfWeek = {
        dayIndex: dayIdx,
        dayName: DAY_NAMES[dayIdx],
        count,
      };
    }
  }

  // Sets & reps for the year
  const setsRepsRow = db
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
        sql`strftime('%Y', ${workouts.startedAt}) = ${yearStr}`,
      ),
    )
    .get();

  const totalSets = setsRepsRow?.totalSets ?? 0;
  const totalReps = setsRepsRow?.totalReps ?? 0;

  // PRs for the year
  const prsCountRow = db
    .select({
      count: sql<number>`count(${exercisePersonalRecords.id})`,
    })
    .from(exercisePersonalRecords)
    .where(
      and(
        isNull(exercisePersonalRecords.deletedAt),
        sql`strftime('%Y', ${exercisePersonalRecords.achievedAt}) = ${yearStr}`,
      ),
    )
    .get();

  const totalPrsCount = prsCountRow?.count ?? 0;

  // Top 5 exercises by volume
  const topExercisesRows = db
    .select({
      exerciseId: exercises.id,
      exerciseName: exercises.name,
      volumeKg: sql<number>`sum(coalesce(${workoutSets.weightKg}, 0) * coalesce(${workoutSets.reps}, 0))`,
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
        sql`${workoutSets.setType} != 'warmup'`,
        isNull(workoutSets.deletedAt),
        isNull(workoutExercises.deletedAt),
        isNull(workouts.deletedAt),
        sql`strftime('%Y', ${workouts.startedAt}) = ${yearStr}`,
      ),
    )
    .groupBy(exercises.id, exercises.name)
    .orderBy(desc(sql`sum(coalesce(${workoutSets.weightKg}, 0) * coalesce(${workoutSets.reps}, 0))`))
    .limit(5)
    .all();

  const topExercises = topExercisesRows.map((r) => ({
    exerciseId: r.exerciseId,
    exerciseName: r.exerciseName,
    volumeKg: Math.round(r.volumeKg ?? 0),
    setsCount: r.setsCount ?? 0,
  }));

  // Big lifts for the year
  const primaryLifts = [
    { key: 'benchPress', name: 'Barbell Bench Press', slug: 'barbell-flat-bench-press' },
    { key: 'squat', name: 'Barbell Back Squat', slug: 'barbell-back-squat' },
    { key: 'deadlift', name: 'Barbell Deadlift', slug: 'barbell-deadlift' },
    { key: 'overheadPress', name: 'Barbell Overhead Press', slug: 'barbell-overhead-press' },
  ];

  const bigLifts: YearInReviewData['bigLifts'] = [];

  for (const lift of primaryLifts) {
    const ex = db.select({ id: exercises.id }).from(exercises).where(eq(exercises.slug, lift.slug)).get();
    if (!ex) continue;

    const bestSet = db
      .select({
        weightKg: workoutSets.weightKg,
        reps: workoutSets.reps,
        achievedAt: workouts.startedAt,
      })
      .from(workoutSets)
      .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
      .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
      .where(
        and(
          eq(workoutExercises.exerciseId, ex.id),
          eq(workouts.status, 'completed'),
          eq(workoutSets.isCompleted, true),
          sql`${workoutSets.setType} != 'warmup'`,
          isNull(workoutSets.deletedAt),
          isNull(workoutExercises.deletedAt),
          isNull(workouts.deletedAt),
          sql`strftime('%Y', ${workouts.startedAt}) = ${yearStr}`,
        ),
      )
      .orderBy(desc(workoutSets.weightKg))
      .limit(1)
      .get();

    if (bestSet && bestSet.weightKg) {
      const weight = bestSet.weightKg;
      const reps = bestSet.reps ?? 1;
      const best1rm = reps === 1 ? weight : Math.round(weight * (1 + reps / 30) * 10) / 10;

      bigLifts.push({
        liftKey: lift.key,
        liftName: lift.name,
        bestWeightKg: weight,
        best1rmKg: best1rm,
        achievedAt: bestSet.achievedAt,
      });
    }
  }

  const totalVolumeTonnes = Math.round((totalVolumeKg / 1000) * 10) / 10;
  const avgWorkoutDurationMinutes =
    totalWorkouts > 0 ? Math.round(totalDurationSeconds / totalWorkouts / 60) : 0;
  const avgWorkoutVolumeKg = totalWorkouts > 0 ? Math.round(totalVolumeKg / totalWorkouts) : 0;

  const resultData: YearInReviewData = {
    year,
    totalWorkouts,
    totalDurationSeconds,
    totalVolumeKg: Math.round(totalVolumeKg),
    totalVolumeTonnes,
    totalSets,
    totalReps,
    totalPrsCount,
    mostActiveMonth,
    favoriteDayOfWeek,
    topExercises,
    bigLifts,
    avgWorkoutDurationMinutes,
    avgWorkoutVolumeKg,
    shareableSummary: '',
  };

  resultData.shareableSummary = generateYearInReviewShareText(resultData);
  return resultData;
}

export function getAvailableReportYears(): number[] {
  const db = getDb();
  const rows = db
    .select({
      year: sql<string>`strftime('%Y', ${workouts.startedAt})`,
    })
    .from(workouts)
    .where(and(eq(workouts.status, 'completed'), isNull(workouts.deletedAt)))
    .groupBy(sql`strftime('%Y', ${workouts.startedAt})`)
    .orderBy(desc(sql`strftime('%Y', ${workouts.startedAt})`))
    .all();

  if (rows.length === 0) {
    return [new Date().getFullYear()];
  }

  return rows.map((r) => parseInt(r.year, 10)).filter((y) => !isNaN(y));
}

// ────────────────────────────────────────────────────────────────────
// Local Strength Standards & Ranking Query
// ────────────────────────────────────────────────────────────────────

export function getLocalStrengthRanking(): StrengthRankingReport {
  const db = getDb();

  // Retrieve user's latest recorded bodyweight
  const bwEntry = db
    .select({
      value: bodyMeasurementEntries.value,
      unit: bodyMeasurements.unit,
    })
    .from(bodyMeasurementEntries)
    .innerJoin(bodyMeasurements, eq(bodyMeasurementEntries.measurementId, bodyMeasurements.id))
    .where(
      and(
        isNull(bodyMeasurementEntries.deletedAt),
        isNull(bodyMeasurements.deletedAt),
        sql`lower(${bodyMeasurements.name}) = 'bodyweight'`,
      ),
    )
    .orderBy(desc(bodyMeasurementEntries.measuredAt))
    .limit(1)
    .get();

  let bodyweightKg = 75.0; // fallback standard adult bodyweight
  let isDefaultBodyweight = true;

  if (bwEntry && bwEntry.value > 0) {
    isDefaultBodyweight = false;
    bodyweightKg = bwEntry.unit === 'lbs' ? bwEntry.value * 0.45359237 : bwEntry.value;
  }

  const primaryLifts = [
    { key: 'benchPress', name: 'Barbell Bench Press', slug: 'barbell-flat-bench-press' },
    { key: 'squat', name: 'Barbell Back Squat', slug: 'barbell-back-squat' },
    { key: 'deadlift', name: 'Barbell Deadlift', slug: 'barbell-deadlift' },
    { key: 'overheadPress', name: 'Barbell Overhead Press', slug: 'barbell-overhead-press' },
  ];

  const lifts: StrengthStandardLift[] = [];

  for (const liftDef of primaryLifts) {
    const ex = db.select({ id: exercises.id }).from(exercises).where(eq(exercises.slug, liftDef.slug)).get();
    let bestWeightKg = 0;
    let best1rmKg = 0;

    if (ex) {
      // Look for PR max_weight or best_1rm
      const pr1rm = db
        .select({ value: exercisePersonalRecords.value })
        .from(exercisePersonalRecords)
        .where(
          and(
            eq(exercisePersonalRecords.exerciseId, ex.id),
            eq(exercisePersonalRecords.recordType, 'best_1rm'),
            eq(exercisePersonalRecords.isCurrent, true),
            isNull(exercisePersonalRecords.deletedAt),
          ),
        )
        .get();

      const prMaxWeight = db
        .select({ value: exercisePersonalRecords.value })
        .from(exercisePersonalRecords)
        .where(
          and(
            eq(exercisePersonalRecords.exerciseId, ex.id),
            eq(exercisePersonalRecords.recordType, 'max_weight'),
            eq(exercisePersonalRecords.isCurrent, true),
            isNull(exercisePersonalRecords.deletedAt),
          ),
        )
        .get();

      if (pr1rm?.value) {
        best1rmKg = pr1rm.value;
      }
      if (prMaxWeight?.value) {
        bestWeightKg = prMaxWeight.value;
      }

      // If no PR row was stored yet, check the maximum logged completed non-warmup set directly
      if (bestWeightKg === 0) {
        const topSet = db
          .select({
            weightKg: workoutSets.weightKg,
            reps: workoutSets.reps,
          })
          .from(workoutSets)
          .innerJoin(workoutExercises, eq(workoutSets.workoutExerciseId, workoutExercises.id))
          .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
          .where(
            and(
              eq(workoutExercises.exerciseId, ex.id),
              eq(workouts.status, 'completed'),
              eq(workoutSets.isCompleted, true),
              sql`${workoutSets.setType} != 'warmup'`,
              isNull(workoutSets.deletedAt),
              isNull(workoutExercises.deletedAt),
              isNull(workouts.deletedAt),
            ),
          )
          .orderBy(desc(workoutSets.weightKg))
          .limit(1)
          .get();

        if (topSet?.weightKg) {
          bestWeightKg = topSet.weightKg;
          const reps = topSet.reps ?? 1;
          best1rmKg = reps === 1 ? bestWeightKg : Math.round(bestWeightKg * (1 + reps / 30) * 10) / 10;
        }
      }
    }

    if (best1rmKg === 0 && bestWeightKg > 0) {
      best1rmKg = bestWeightKg;
    }

    const thresholds = STRENGTH_RATIO_STANDARDS[liftDef.key];
    const effectiveLoad = best1rmKg > 0 ? best1rmKg : bestWeightKg;
    const bodyweightRatio = bodyweightKg > 0 ? Math.round((effectiveLoad / bodyweightKg) * 100) / 100 : 0;

    const classification = classifyStrengthTier(bodyweightRatio, thresholds);

    const tierThresholdsKg = {
      beginner: Math.round(thresholds.beginner * bodyweightKg * 10) / 10,
      novice: Math.round(thresholds.novice * bodyweightKg * 10) / 10,
      intermediate: Math.round(thresholds.intermediate * bodyweightKg * 10) / 10,
      advanced: Math.round(thresholds.advanced * bodyweightKg * 10) / 10,
      elite: Math.round(thresholds.elite * bodyweightKg * 10) / 10,
    };

    lifts.push({
      key: liftDef.key,
      name: liftDef.name,
      bestWeightKg: Math.round(bestWeightKg * 10) / 10,
      best1rmKg: Math.round(best1rmKg * 10) / 10,
      bodyweightRatio,
      currentTier: classification.currentTier,
      nextTier: classification.nextTier,
      progressToNextTierPercent: classification.progressPercent,
      tierThresholdsKg,
    });
  }

  return calculateOverallStrengthRanking(lifts, bodyweightKg, isDefaultBodyweight);
}
