/**
 * Reports and Strength Standards Domain Logic.
 *
 * Implements:
 *   - Monthly Report aggregation & month-over-month comparisons
 *   - Year-in-Review summary metrics & share text generation
 *   - Local Strength Standards & ranking classification based on bodyweight ratios
 */

export type StrengthTier = 'beginner' | 'novice' | 'intermediate' | 'advanced' | 'elite';

export interface StrengthThresholds {
  beginner: number;
  novice: number;
  intermediate: number;
  advanced: number;
  elite: number;
}

/**
 * Empirical strength-to-bodyweight multipliers (ExRx / Symmetric Strength standards).
 */
export const STRENGTH_RATIO_STANDARDS: Record<string, StrengthThresholds> = {
  benchPress: {
    beginner: 0.5,
    novice: 0.8,
    intermediate: 1.15,
    advanced: 1.5,
    elite: 1.9,
  },
  squat: {
    beginner: 0.75,
    novice: 1.15,
    intermediate: 1.5,
    advanced: 2.0,
    elite: 2.4,
  },
  deadlift: {
    beginner: 1.0,
    novice: 1.4,
    intermediate: 1.85,
    advanced: 2.4,
    elite: 2.9,
  },
  overheadPress: {
    beginner: 0.35,
    novice: 0.55,
    intermediate: 0.75,
    advanced: 1.0,
    elite: 1.2,
  },
};

export const STRENGTH_TIER_LABELS: Record<StrengthTier, string> = {
  beginner: 'Beginner',
  novice: 'Novice',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  elite: 'Elite',
};

export const STRENGTH_TIER_ORDER: StrengthTier[] = [
  'beginner',
  'novice',
  'intermediate',
  'advanced',
  'elite',
];

export interface StrengthStandardLift {
  key: string;
  name: string;
  bestWeightKg: number;
  best1rmKg: number;
  bodyweightRatio: number;
  currentTier: StrengthTier;
  nextTier: StrengthTier | null;
  progressToNextTierPercent: number; // 0 to 100
  tierThresholdsKg: Record<StrengthTier, number>;
}

export interface StrengthRankingReport {
  userBodyweightKg: number;
  isDefaultBodyweight: boolean;
  lifts: StrengthStandardLift[];
  overallTier: StrengthTier;
  overallScorePercent: number; // 0 to 100 scale across all tiers
  bigThreeTotalKg: number;
}

/**
 * Classify a strength-to-bodyweight ratio into a StrengthTier.
 */
export function classifyStrengthTier(
  ratio: number,
  thresholds: StrengthThresholds,
): {
  currentTier: StrengthTier;
  nextTier: StrengthTier | null;
  progressPercent: number;
} {
  if (ratio < thresholds.novice) {
    const min = thresholds.beginner;
    const max = thresholds.novice;
    const progress = Math.min(100, Math.max(0, Math.round(((ratio - min) / (max - min)) * 100)));
    return { currentTier: 'beginner', nextTier: 'novice', progressPercent: progress };
  }
  if (ratio < thresholds.intermediate) {
    const min = thresholds.novice;
    const max = thresholds.intermediate;
    const progress = Math.min(100, Math.max(0, Math.round(((ratio - min) / (max - min)) * 100)));
    return { currentTier: 'novice', nextTier: 'intermediate', progressPercent: progress };
  }
  if (ratio < thresholds.advanced) {
    const min = thresholds.intermediate;
    const max = thresholds.advanced;
    const progress = Math.min(100, Math.max(0, Math.round(((ratio - min) / (max - min)) * 100)));
    return { currentTier: 'intermediate', nextTier: 'advanced', progressPercent: progress };
  }
  if (ratio < thresholds.elite) {
    const min = thresholds.advanced;
    const max = thresholds.elite;
    const progress = Math.min(100, Math.max(0, Math.round(((ratio - min) / (max - min)) * 100)));
    return { currentTier: 'advanced', nextTier: 'elite', progressPercent: progress };
  }
  return { currentTier: 'elite', nextTier: null, progressPercent: 100 };
}

/**
 * Calculate the overall strength ranking given the evaluated lifts.
 */
export function calculateOverallStrengthRanking(
  lifts: StrengthStandardLift[],
  bodyweightKg: number,
  isDefaultBodyweight: boolean,
): StrengthRankingReport {
  const tierScores: Record<StrengthTier, number> = {
    beginner: 1,
    novice: 2,
    intermediate: 3,
    advanced: 4,
    elite: 5,
  };

  let totalTierPoints = 0;
  let bigThreeTotalKg = 0;

  for (const lift of lifts) {
    totalTierPoints += tierScores[lift.currentTier];
    if (['benchPress', 'squat', 'deadlift'].includes(lift.key)) {
      bigThreeTotalKg += lift.bestWeightKg;
    }
  }

  const avgPoints = lifts.length > 0 ? totalTierPoints / lifts.length : 1;
  let overallTier: StrengthTier = 'beginner';
  if (avgPoints >= 4.5) overallTier = 'elite';
  else if (avgPoints >= 3.5) overallTier = 'advanced';
  else if (avgPoints >= 2.5) overallTier = 'intermediate';
  else if (avgPoints >= 1.5) overallTier = 'novice';

  // Overall percentage 0–100 (where elite is 100%)
  const overallScorePercent = Math.min(100, Math.max(0, Math.round((avgPoints / 5) * 100)));

  return {
    userBodyweightKg: Math.round(bodyweightKg * 10) / 10,
    isDefaultBodyweight,
    lifts,
    overallTier,
    overallScorePercent,
    bigThreeTotalKg: Math.round(bigThreeTotalKg * 10) / 10,
  };
}

// ────────────────────────────────────────────────────────────────────
// Monthly Report Types & Helpers
// ────────────────────────────────────────────────────────────────────

export interface MonthlyReportData {
  year: number;
  month: number; // 1-12
  monthName: string;
  workoutCount: number;
  totalVolumeKg: number;
  totalDurationSeconds: number;
  totalSets: number;
  totalReps: number;
  activeDays: number[]; // e.g. [1, 3, 5, 8]
  activeDaysCount: number;
  topExercises: Array<{
    exerciseId: string;
    exerciseName: string;
    volumeKg: number;
    setsCount: number;
  }>;
  muscleDistribution: Array<{
    muscle: string;
    label: string;
    count: number;
    percentage: number;
  }>;
  prsAchieved: Array<{
    exerciseName: string;
    recordType: string;
    value: number;
    weightKg: number | null;
    achievedAt: string;
  }>;
  comparison: {
    prevWorkoutCount: number;
    prevVolumeKg: number;
    workoutChangePercent: number; // e.g. +20%
    volumeChangePercent: number;
  };
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function getMonthName(monthNumber: number): string {
  return MONTH_NAMES[monthNumber - 1] ?? `Month ${monthNumber}`;
}

export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

// ────────────────────────────────────────────────────────────────────
// Year-in-Review Types & Helpers
// ────────────────────────────────────────────────────────────────────

export interface YearInReviewData {
  year: number;
  totalWorkouts: number;
  totalDurationSeconds: number;
  totalVolumeKg: number;
  totalVolumeTonnes: number;
  totalSets: number;
  totalReps: number;
  totalPrsCount: number;
  mostActiveMonth: {
    month: number;
    monthName: string;
    workoutCount: number;
  } | null;
  favoriteDayOfWeek: {
    dayIndex: number; // 0=Sun, 1=Mon...
    dayName: string;
    count: number;
  } | null;
  topExercises: Array<{
    exerciseId: string;
    exerciseName: string;
    volumeKg: number;
    setsCount: number;
  }>;
  bigLifts: Array<{
    liftKey: string;
    liftName: string;
    best1rmKg: number;
    bestWeightKg: number;
    achievedAt: string;
  }>;
  avgWorkoutDurationMinutes: number;
  avgWorkoutVolumeKg: number;
  shareableSummary: string;
}

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Generate shareable plain text summary for Year-in-Review.
 */
export function generateYearInReviewShareText(data: YearInReviewData): string {
  const hours = Math.round((data.totalDurationSeconds / 3600) * 10) / 10;
  const lines = [
    `🏋️ My ${data.year} Year in Review on Ironlog:`,
    `• ${data.totalWorkouts} Workouts Completed`,
    `• ${data.totalVolumeTonnes} Tonnes Lifted (${Math.round(data.totalVolumeKg).toLocaleString()} kg)`,
    `• ${hours} Hours Trained across ${data.totalSets} Sets & ${data.totalReps} Reps`,
    `• ${data.totalPrsCount} Personal Records Broken 🏆`,
  ];

  if (data.mostActiveMonth) {
    lines.push(`• Most Active Month: ${data.mostActiveMonth.monthName} (${data.mostActiveMonth.workoutCount} workouts)`);
  }
  if (data.favoriteDayOfWeek) {
    lines.push(`• Favorite Training Day: ${data.favoriteDayOfWeek.dayName}`);
  }
  if (data.topExercises.length > 0) {
    lines.push(`• Favorite Exercise: ${data.topExercises[0].exerciseName}`);
  }

  lines.push('', '#Ironlog #Fitness #GymTracking #YearInReview');
  return lines.join('\n');
}
