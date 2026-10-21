/**
 * Stats, consistency heatmap, streaks, and progress aggregation domain logic.
 */

import { calculateSetVolume, calculateEstimated1RM } from './calc';

export type TimeRange = '3m' | '1y' | 'all';

export interface StreakResult {
  currentWeekStreak: number;
  longestWeekStreak: number;
  currentDayStreak: number;
  workoutsThisWeek: number;
  weeklyGoalProgress: number;
}

/**
 * Calculate weekly streaks and daily streaks from workout timestamps.
 * A week starts on Monday.
 */
export function calculateStreaks(
  workoutDates: string[],
  weeklyGoal: number = 4,
  referenceDate: Date = new Date(),
): StreakResult {
  if (workoutDates.length === 0) {
    return {
      currentWeekStreak: 0,
      longestWeekStreak: 0,
      currentDayStreak: 0,
      workoutsThisWeek: 0,
      weeklyGoalProgress: 0,
    };
  }

  // Normalize dates to YYYY-MM-DD
  const uniqueDates = Array.from(
    new Set(workoutDates.map((d) => d.slice(0, 10))),
  ).sort();

  // Helper to get ISO week key (e.g. "2026-W03")
  const getWeekKey = (d: Date): string => {
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    const weekNr = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    return `${target.getFullYear()}-W${String(weekNr).padStart(2, '0')}`;
  };

  // Group workouts by ISO week
  const weekCounts: Record<string, number> = {};
  for (const dateStr of uniqueDates) {
    const d = new Date(dateStr + 'T12:00:00Z');
    const key = getWeekKey(d);
    weekCounts[key] = (weekCounts[key] ?? 0) + 1;
  }

  const currentWeekKey = getWeekKey(referenceDate);
  const workoutsThisWeek = weekCounts[currentWeekKey] ?? 0;
  const weeklyGoalProgress = Math.min(1, Math.round((workoutsThisWeek / Math.max(1, weeklyGoal)) * 100) / 100);

  // Calculate current week streak going backward
  let currentWeekStreak = 0;
  let checkDate = new Date(referenceDate.getTime());
  // If no workouts this week yet, check if last week had workouts
  const thisWeekKey = getWeekKey(checkDate);
  const hasWorkoutThisWeek = (weekCounts[thisWeekKey] ?? 0) > 0;

  if (hasWorkoutThisWeek) {
    currentWeekStreak++;
    checkDate.setDate(checkDate.getDate() - 7);
  } else {
    // Check if previous week had workouts
    checkDate.setDate(checkDate.getDate() - 7);
  }

  while (true) {
    const key = getWeekKey(checkDate);
    if ((weekCounts[key] ?? 0) > 0) {
      currentWeekStreak++;
      checkDate.setDate(checkDate.getDate() - 7);
    } else {
      break;
    }
  }

  // Calculate longest week streak across all history
  const sortedWeeks = Object.keys(weekCounts).sort();
  let longestWeekStreak = 0;
  let runningWeekStreak = 0;
  let prevWeekDate: Date | null = null;

  for (const wKey of sortedWeeks) {
    const [yStr, wStr] = wKey.split('-W');
    const y = parseInt(yStr, 10);
    const w = parseInt(wStr, 10);
    // Simple rough continuity check
    if (prevWeekDate) {
      const curDate = new Date(y, 0, 1 + (w - 1) * 7);
      const diffDays = Math.round((curDate.getTime() - prevWeekDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 9) {
        runningWeekStreak++;
      } else {
        runningWeekStreak = 1;
      }
      prevWeekDate = curDate;
    } else {
      runningWeekStreak = 1;
      prevWeekDate = new Date(y, 0, 1 + (w - 1) * 7);
    }
    if (runningWeekStreak > longestWeekStreak) {
      longestWeekStreak = runningWeekStreak;
    }
  }

  if (currentWeekStreak > longestWeekStreak) {
    longestWeekStreak = currentWeekStreak;
  }

  // Calculate current consecutive days streak (training days)
  let currentDayStreak = 0;
  const refDateStr = referenceDate.toISOString().slice(0, 10);
  const yesterday = new Date(referenceDate.getTime() - 86400000).toISOString().slice(0, 10);

  const dateSet = new Set(uniqueDates);
  let scanDay = dateSet.has(refDateStr) ? new Date(referenceDate.getTime()) : dateSet.has(yesterday) ? new Date(referenceDate.getTime() - 86400000) : null;

  if (scanDay) {
    while (true) {
      const s = scanDay.toISOString().slice(0, 10);
      if (dateSet.has(s)) {
        currentDayStreak++;
        scanDay = new Date(scanDay.getTime() - 86400000);
      } else {
        break;
      }
    }
  }

  return {
    currentWeekStreak,
    longestWeekStreak,
    currentDayStreak,
    workoutsThisWeek,
    weeklyGoalProgress,
  };
}

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
  dayOfWeek: number; // 0=Mon ... 6=Sun
  intensity: 0 | 1 | 2 | 3;
}

export interface HeatmapMonthLabel {
  monthName: string;
  columnIndex: number;
}

export interface ConsistencyHeatmapData {
  days: HeatmapDay[];
  columns: HeatmapDay[][]; // 7 rows per column
  monthLabels: HeatmapMonthLabel[];
  totalWorkouts: number;
  activeDaysCount: number;
}

/**
 * Generate GitHub-style contribution heatmap for the last N weeks.
 */
export function generateConsistencyHeatmap(
  workoutDates: string[],
  weeks: number = 16,
  referenceDate: Date = new Date(),
): ConsistencyHeatmapData {
  const countsByDate: Record<string, number> = {};
  for (const d of workoutDates) {
    const key = d.slice(0, 10);
    countsByDate[key] = (countsByDate[key] ?? 0) + 1;
  }

  // End on current week Sunday
  const end = new Date(referenceDate.getTime());
  const dayOfWeek = (end.getDay() + 6) % 7; // 0=Mon, 6=Sun
  end.setDate(end.getDate() + (6 - dayOfWeek));

  // Total days = weeks * 7
  const totalDays = weeks * 7;
  const start = new Date(end.getTime());
  start.setDate(start.getDate() - totalDays + 1);

  const days: HeatmapDay[] = [];
  const cur = new Date(start.getTime());

  let totalWorkouts = 0;
  let activeDaysCount = 0;

  while (cur <= end) {
    const dateStr = cur.toISOString().slice(0, 10);
    const count = countsByDate[dateStr] ?? 0;
    if (count > 0) {
      totalWorkouts += count;
      activeDaysCount++;
    }

    const intensity: 0 | 1 | 2 | 3 = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : 3;
    const dow = (cur.getDay() + 6) % 7;

    days.push({
      date: dateStr,
      count,
      dayOfWeek: dow,
      intensity,
    });

    cur.setDate(cur.getDate() + 1);
  }

  // Organize into columns (each column has 7 days, Mon to Sun)
  const columns: HeatmapDay[][] = [];
  const monthLabels: HeatmapMonthLabel[] = [];
  let lastMonth = -1;

  for (let c = 0; c < weeks; c++) {
    const colDays = days.slice(c * 7, c * 7 + 7);
    columns.push(colDays);

    if (colDays.length > 0) {
      const firstDay = new Date(colDays[0].date + 'T12:00:00Z');
      const m = firstDay.getMonth();
      if (m !== lastMonth) {
        lastMonth = m;
        monthLabels.push({
          monthName: firstDay.toLocaleDateString(undefined, { month: 'short' }),
          columnIndex: c,
        });
      }
    }
  }

  return {
    days,
    columns,
    monthLabels,
    totalWorkouts,
    activeDaysCount,
  };
}

export interface VolumeTimePoint {
  label: string;
  date: string;
  volumeKg: number;
}

/**
 * Aggregate workout volume over 3m, 1y, or all-time range.
 */
export function aggregateVolumeOverTime(
  workouts: Array<{ startedAt: string; totalVolumeKg: number | null }>,
  range: TimeRange = '3m',
  referenceDate: Date = new Date(),
): VolumeTimePoint[] {
  let cutoffDate: Date | null = null;
  if (range === '3m') {
    cutoffDate = new Date(referenceDate.getTime() - 90 * 86400000);
  } else if (range === '1y') {
    cutoffDate = new Date(referenceDate.getTime() - 365 * 86400000);
  }

  const filtered = workouts
    .filter((w) => {
      if (!w.startedAt) return false;
      if (cutoffDate && new Date(w.startedAt) < cutoffDate) return false;
      return true;
    })
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  if (filtered.length === 0) return [];

  // If 3m: aggregate by week or single sessions
  if (range === '3m') {
    return filtered.map((w) => {
      const d = new Date(w.startedAt);
      return {
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        date: w.startedAt.slice(0, 10),
        volumeKg: Math.round(w.totalVolumeKg ?? 0),
      };
    });
  }

  // If 1y: group by month
  const monthlyGroups: Record<string, { label: string; date: string; volumeKg: number }> = {};
  for (const w of filtered) {
    const d = new Date(w.startedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString(undefined, { month: 'short' });
    if (!monthlyGroups[key]) {
      monthlyGroups[key] = { label, date: `${key}-01`, volumeKg: 0 };
    }
    monthlyGroups[key].volumeKg += Math.round(w.totalVolumeKg ?? 0);
  }

  return Object.keys(monthlyGroups)
    .sort()
    .map((k) => monthlyGroups[k]);
}

export interface MuscleDistributionItem {
  muscle: string;
  label: string;
  setsCount: number;
  percentage: number;
}

/**
 * Aggregate muscle distribution and compute percentages.
 */
export function aggregateMuscleDistribution(
  setsByMuscle: Array<{ primaryMuscle: string; setsCount: number }>,
  muscleGroupLabels: Record<string, string>,
): MuscleDistributionItem[] {
  const totals: Record<string, number> = {};
  let totalSets = 0;

  for (const item of setsByMuscle) {
    totals[item.primaryMuscle] = (totals[item.primaryMuscle] ?? 0) + item.setsCount;
    totalSets += item.setsCount;
  }

  if (totalSets === 0) return [];

  return Object.entries(totals)
    .map(([muscle, count]) => ({
      muscle,
      label: muscleGroupLabels[muscle] ?? muscle,
      setsCount: count,
      percentage: Math.round((count / totalSets) * 1000) / 10,
    }))
    .sort((a, b) => b.setsCount - a.setsCount);
}

export interface ExerciseProgressionPoint {
  date: string;
  label: string;
  maxWeightKg: number;
  best1rmKg: number;
  volumeKg: number;
}

/**
 * Filter and compute per-exercise progression over a given time range.
 */
export function filterExerciseProgression(
  sessions: Array<{
    workoutDate: string;
    sets: Array<{ weightKg: number | null; reps: number | null; setType: string; isCompleted?: boolean }>;
  }>,
  range: TimeRange = 'all',
  referenceDate: Date = new Date(),
): ExerciseProgressionPoint[] {
  let cutoffDate: Date | null = null;
  if (range === '3m') {
    cutoffDate = new Date(referenceDate.getTime() - 90 * 86400000);
  } else if (range === '1y') {
    cutoffDate = new Date(referenceDate.getTime() - 365 * 86400000);
  }

  const validSessions = sessions
    .filter((s) => {
      if (!s.workoutDate) return false;
      if (cutoffDate && new Date(s.workoutDate) < cutoffDate) return false;
      return true;
    })
    .sort((a, b) => new Date(a.workoutDate).getTime() - new Date(b.workoutDate).getTime());

  return validSessions.map((s) => {
    let maxWeight = 0;
    let best1rm = 0;
    let volume = 0;

    for (const set of s.sets) {
      if (set.setType === 'warmup') continue;
      const w = set.weightKg ?? 0;
      const r = set.reps ?? 0;
      if (w > maxWeight) maxWeight = w;
      const e1rm = calculateEstimated1RM(w, r);
      if (e1rm > best1rm) best1rm = e1rm;
      volume += calculateSetVolume(set, 'weight_reps');
    }

    const d = new Date(s.workoutDate);
    return {
      date: s.workoutDate.slice(0, 10),
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      maxWeightKg: Math.round(maxWeight * 10) / 10,
      best1rmKg: Math.round(best1rm * 10) / 10,
      volumeKg: Math.round(volume),
    };
  });
}
