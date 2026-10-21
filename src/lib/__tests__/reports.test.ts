import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  classifyStrengthTier,
  calculateOverallStrengthRanking,
  calculatePercentageChange,
  getMonthName,
  generateYearInReviewShareText,
  STRENGTH_RATIO_STANDARDS,
  type StrengthStandardLift,
  type YearInReviewData,
} from '../../domain/reports';

describe('Reports & Strength Standards Domain', () => {
  describe('classifyStrengthTier', () => {
    const benchStandards = STRENGTH_RATIO_STANDARDS.benchPress; // { beginner: 0.5, novice: 0.8, intermediate: 1.15, advanced: 1.5, elite: 1.9 }

    it('classifies beginner tier when ratio is below novice', () => {
      const result = classifyStrengthTier(0.65, benchStandards);
      assert.strictEqual(result.currentTier, 'beginner');
      assert.strictEqual(result.nextTier, 'novice');
      assert.strictEqual(result.progressPercent, 50); // halfway between 0.5 and 0.8
    });

    it('classifies novice tier when ratio is between novice and intermediate', () => {
      const result = classifyStrengthTier(0.975, benchStandards);
      assert.strictEqual(result.currentTier, 'novice');
      assert.strictEqual(result.nextTier, 'intermediate');
      assert.strictEqual(result.progressPercent, 50); // halfway between 0.8 and 1.15
    });

    it('classifies intermediate tier when ratio is between intermediate and advanced', () => {
      const result = classifyStrengthTier(1.325, benchStandards);
      assert.strictEqual(result.currentTier, 'intermediate');
      assert.strictEqual(result.nextTier, 'advanced');
      assert.strictEqual(result.progressPercent, 50);
    });

    it('classifies advanced tier when ratio is between advanced and elite', () => {
      const result = classifyStrengthTier(1.7, benchStandards);
      assert.strictEqual(result.currentTier, 'advanced');
      assert.strictEqual(result.nextTier, 'elite');
      assert.strictEqual(result.progressPercent, 50);
    });

    it('classifies elite tier when ratio meets or exceeds elite threshold', () => {
      const result = classifyStrengthTier(2.1, benchStandards);
      assert.strictEqual(result.currentTier, 'elite');
      assert.strictEqual(result.nextTier, null);
      assert.strictEqual(result.progressPercent, 100);
    });
  });

  describe('calculateOverallStrengthRanking', () => {
    it('aggregates Big 3 total and assigns overall tier correctly', () => {
      const mockLifts: StrengthStandardLift[] = [
        {
          key: 'benchPress',
          name: 'Barbell Bench Press',
          bestWeightKg: 100,
          best1rmKg: 100,
          bodyweightRatio: 1.25,
          currentTier: 'intermediate',
          nextTier: 'advanced',
          progressToNextTierPercent: 29,
          tierThresholdsKg: { beginner: 40, novice: 64, intermediate: 92, advanced: 120, elite: 152 },
        },
        {
          key: 'squat',
          name: 'Barbell Back Squat',
          bestWeightKg: 140,
          best1rmKg: 140,
          bodyweightRatio: 1.75,
          currentTier: 'intermediate',
          nextTier: 'advanced',
          progressToNextTierPercent: 50,
          tierThresholdsKg: { beginner: 60, novice: 92, intermediate: 120, advanced: 160, elite: 192 },
        },
        {
          key: 'deadlift',
          name: 'Barbell Deadlift',
          bestWeightKg: 180,
          best1rmKg: 180,
          bodyweightRatio: 2.25,
          currentTier: 'intermediate',
          nextTier: 'advanced',
          progressToNextTierPercent: 73,
          tierThresholdsKg: { beginner: 80, novice: 112, intermediate: 148, advanced: 192, elite: 232 },
        },
        {
          key: 'overheadPress',
          name: 'Standing Overhead Press',
          bestWeightKg: 60,
          best1rmKg: 60,
          bodyweightRatio: 0.75,
          currentTier: 'intermediate',
          nextTier: 'advanced',
          progressToNextTierPercent: 0,
          tierThresholdsKg: { beginner: 28, novice: 44, intermediate: 60, advanced: 80, elite: 96 },
        },
      ];

      const report = calculateOverallStrengthRanking(mockLifts, 80, false);

      assert.strictEqual(report.userBodyweightKg, 80);
      assert.strictEqual(report.isDefaultBodyweight, false);
      assert.strictEqual(report.overallTier, 'intermediate');
      assert.strictEqual(report.overallScorePercent, 60); // 3 out of 5 = 60%
      assert.strictEqual(report.bigThreeTotalKg, 420); // 100 + 140 + 180 = 420kg
    });

    it('handles empty lifts list gracefully', () => {
      const report = calculateOverallStrengthRanking([], 75, true);
      assert.strictEqual(report.overallTier, 'beginner');
      assert.strictEqual(report.bigThreeTotalKg, 0);
      assert.strictEqual(report.isDefaultBodyweight, true);
    });
  });

  describe('calculatePercentageChange', () => {
    it('returns 100% when previous is 0 and current is positive', () => {
      assert.strictEqual(calculatePercentageChange(500, 0), 100);
    });

    it('returns 0% when both previous and current are 0', () => {
      assert.strictEqual(calculatePercentageChange(0, 0), 0);
    });

    it('calculates positive percent increase correctly', () => {
      assert.strictEqual(calculatePercentageChange(125, 100), 25);
    });

    it('calculates negative percent decrease correctly', () => {
      assert.strictEqual(calculatePercentageChange(75, 100), -25);
    });
  });

  describe('getMonthName', () => {
    it('resolves valid month names', () => {
      assert.strictEqual(getMonthName(1), 'January');
      assert.strictEqual(getMonthName(10), 'October');
      assert.strictEqual(getMonthName(12), 'December');
    });

    it('handles out of bounds numbers with fallback', () => {
      assert.strictEqual(getMonthName(13), 'Month 13');
    });
  });

  describe('generateYearInReviewShareText', () => {
    it('formats a comprehensive, engaging share text string', () => {
      const mockData: YearInReviewData = {
        year: 2026,
        totalWorkouts: 142,
        totalDurationSeconds: 432000, // 120 hours
        totalVolumeKg: 850000,
        totalVolumeTonnes: 850,
        totalSets: 1420,
        totalReps: 12500,
        totalPrsCount: 28,
        mostActiveMonth: {
          month: 3,
          monthName: 'March',
          workoutCount: 18,
        },
        favoriteDayOfWeek: {
          dayIndex: 1,
          dayName: 'Monday',
          count: 32,
        },
        topExercises: [
          {
            exerciseId: 'bench',
            exerciseName: 'Barbell Bench Press',
            volumeKg: 120000,
            setsCount: 220,
          },
        ],
        bigLifts: [],
        avgWorkoutDurationMinutes: 51,
        avgWorkoutVolumeKg: 5986,
        shareableSummary: '',
      };

      const text = generateYearInReviewShareText(mockData);
      assert.ok(text.includes('My 2026 Year in Review on Ironlog'));
      assert.ok(text.includes('142 Workouts Completed'));
      assert.ok(text.includes('850 Tonnes Lifted'));
      assert.ok(text.includes('120 Hours Trained'));
      assert.ok(text.includes('28 Personal Records Broken'));
      assert.ok(text.includes('March (18 workouts)'));
      assert.ok(text.includes('Favorite Training Day: Monday'));
      assert.ok(text.includes('Barbell Bench Press'));
      assert.ok(text.includes('#Ironlog'));
    });
  });
});
