/**
 * Monthly Training Report Screen.
 *
 * Provides comprehensive monthly breakdown:
 *   - Month-over-month volume & workout count comparison (+/- %)
 *   - Active days calendar map
 *   - Top exercises by volume
 *   - Muscle distribution breakdown
 *   - PRs achieved during the month
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../src/ui/typography/Text';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { spacing, radii, layout, typography } from '../../src/ui/theme/tokens';
import { formatWeight, formatDuration } from '../../src/domain/units';
import { lightImpact } from '../../src/lib/haptics';
import { getMonthlyReport, getAvailableReportMonths } from '../../src/db/queries/reports';
import type { MonthlyReportData } from '../../src/domain/reports';

export default function MonthlyReportScreen() {
  const { theme } = useTheme();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [availableMonths, setAvailableMonths] = useState<Array<{ year: number; month: number; label: string }>>([]);
  const [report, setReport] = useState<MonthlyReportData | null>(null);

  useEffect(() => {
    const list = getAvailableReportMonths();
    setAvailableMonths(list);
    if (list.length > 0) {
      setSelectedYear(list[0].year);
      setSelectedMonth(list[0].month);
    }
  }, []);

  const loadReport = useCallback(() => {
    try {
      const data = getMonthlyReport(selectedYear, selectedMonth);
      setReport(data);
    } catch (e) {
      console.error('Error loading monthly report:', e);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handlePrevMonth = () => {
    lightImpact();
    if (selectedMonth === 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    lightImpact();
    if (selectedMonth === 12) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Calendar helpers
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const firstDayOfWeek = (new Date(selectedYear, selectedMonth - 1, 1).getDay() + 6) % 7; // Mon=0, Sun=6

  const renderComparisonBadge = (changePercent: number) => {
    if (changePercent === 0) {
      return (
        <View style={[styles.changeBadge, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
          <Text variant="caption" color="textMuted" style={{ fontSize: 10, fontWeight: '700' }}>
            0% vs last mo
          </Text>
        </View>
      );
    }

    const isPositive = changePercent > 0;
    return (
      <View
        style={[
          styles.changeBadge,
          {
            backgroundColor: isPositive ? theme.success + '22' : theme.danger + '22',
            borderColor: isPositive ? theme.success : theme.danger,
          },
        ]}
      >
        <Ionicons
          name={isPositive ? 'trending-up' : 'trending-down'}
          size={12}
          color={isPositive ? theme.success : theme.danger}
        />
        <Text
          variant="caption"
          style={{
            fontSize: 10,
            fontWeight: '700',
            color: isPositive ? theme.success : theme.danger,
          }}
        >
          {isPositive ? `+${changePercent}%` : `${changePercent}%`}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            lightImpact();
            router.back();
          }}
          hitSlop={8}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text variant="headingLg" style={{ fontWeight: '800' }}>
          Monthly Report
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Month Stepper Selector */}
        <View style={[styles.selectorBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Pressable onPress={handlePrevMonth} hitSlop={12} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={theme.text} />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text variant="headingSm" style={{ fontWeight: '800' }}>
              {report?.monthName ?? ''} {selectedYear}
            </Text>
            <Text variant="caption" color="textMuted">
              {report?.workoutCount ?? 0} workouts logged
            </Text>
          </View>
          <Pressable onPress={handleNextMonth} hitSlop={12} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={theme.text} />
          </Pressable>
        </View>

        {report && report.workoutCount === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="calendar-outline" size={44} color={theme.textMuted} />
            <Text variant="headingSm" color="text" style={{ marginTop: spacing.xs }}>
              No Workouts in {report.monthName}
            </Text>
            <Text variant="bodySm" color="textMuted" center>
              No training sessions recorded during this month.
            </Text>
          </View>
        ) : report ? (
          <>
            {/* Key Metrics Grid */}
            <View style={styles.metricsGrid}>
              {/* Workouts */}
              <View style={[styles.metricBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.metricHeader}>
                  <Text variant="caption" color="textMuted">WORKOUTS</Text>
                  {renderComparisonBadge(report.comparison.workoutChangePercent)}
                </View>
                <Text variant="displaySm" style={{ fontWeight: '800', marginTop: 2 }}>
                  {report.workoutCount}
                </Text>
                <Text variant="caption" color="textMuted">
                  {report.activeDaysCount} active days
                </Text>
              </View>

              {/* Total Volume */}
              <View style={[styles.metricBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.metricHeader}>
                  <Text variant="caption" color="textMuted">VOLUME</Text>
                  {renderComparisonBadge(report.comparison.volumeChangePercent)}
                </View>
                <Text variant="headingLg" color="accent" style={{ fontWeight: '800', marginTop: 2 }}>
                  {formatWeight(report.totalVolumeKg, 'kg')}
                </Text>
                <Text variant="caption" color="textMuted">
                  {report.totalSets} total sets
                </Text>
              </View>

              {/* Time Trained */}
              <View style={[styles.metricBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text variant="caption" color="textMuted">TIME TRAINED</Text>
                <Text variant="headingLg" style={{ fontWeight: '800', marginTop: 2 }}>
                  {Math.round((report.totalDurationSeconds / 3600) * 10) / 10}h
                </Text>
                <Text variant="caption" color="textMuted">
                  {Math.round(report.totalDurationSeconds / 60)} minutes
                </Text>
              </View>

              {/* Total Reps */}
              <View style={[styles.metricBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text variant="caption" color="textMuted">REPETITIONS</Text>
                <Text variant="headingLg" style={{ fontWeight: '800', marginTop: 2 }}>
                  {report.totalReps.toLocaleString()}
                </Text>
                <Text variant="caption" color="textMuted">
                  Across all exercises
                </Text>
              </View>
            </View>

            {/* Active Days Calendar Map */}
            <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="calendar-outline" size={18} color={theme.accent} />
                <Text variant="headingSm" style={{ fontWeight: '700' }}>
                  Active Days Calendar
                </Text>
              </View>

              <View style={styles.calendarWeekHeader}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                  <Text key={idx} variant="caption" color="textMuted" style={styles.calendarDayHeader}>
                    {day}
                  </Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {/* Empty offset padding cells */}
                {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                  <View key={`empty-${idx}`} style={styles.calendarCell} />
                ))}

                {/* Days of month */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const isActive = report.activeDays.includes(dayNum);
                  return (
                    <View key={`day-${dayNum}`} style={styles.calendarCell}>
                      <View
                        style={[
                          styles.dayBubble,
                          {
                            backgroundColor: isActive ? theme.accent : theme.elevated,
                            borderColor: isActive ? theme.accent : 'transparent',
                          },
                        ]}
                      >
                        <Text
                          variant="caption"
                          style={{
                            color: isActive ? theme.onAccent : theme.textMuted,
                            fontWeight: isActive ? '800' : '500',
                            fontSize: 11,
                          }}
                        >
                          {dayNum}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Top 5 Exercises by Volume */}
            {report.topExercises.length > 0 && (
              <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="barbell-outline" size={18} color={theme.accent} />
                  <Text variant="headingSm" style={{ fontWeight: '700' }}>
                    Top Exercises by Volume
                  </Text>
                </View>

                <View style={styles.topExercisesList}>
                  {report.topExercises.map((ex, idx) => {
                    const maxVol = report.topExercises[0].volumeKg || 1;
                    const pct = Math.min(100, Math.round((ex.volumeKg / maxVol) * 100));

                    return (
                      <View key={ex.exerciseId} style={styles.exerciseRow}>
                        <View style={styles.exerciseInfoRow}>
                          <Text variant="bodySm" style={{ fontWeight: '700', flex: 1 }}>
                            {idx + 1}. {ex.exerciseName}
                          </Text>
                          <Text variant="bodySm" color="accent" style={{ fontWeight: '700' }}>
                            {formatWeight(ex.volumeKg, 'kg')}
                          </Text>
                        </View>

                        {/* Relative Volume Track */}
                        <View style={[styles.volumeTrack, { backgroundColor: theme.elevated }]}>
                          <View
                            style={[
                              styles.volumeFill,
                              { backgroundColor: theme.accent, width: `${pct}%` },
                            ]}
                          />
                        </View>

                        <Text variant="caption" color="textMuted">
                          {ex.setsCount} sets completed
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Muscle Distribution Breakdown */}
            {report.muscleDistribution.length > 0 && (
              <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="body-outline" size={18} color={theme.accent} />
                  <Text variant="headingSm" style={{ fontWeight: '700' }}>
                    Muscle Group Distribution
                  </Text>
                </View>

                <View style={styles.muscleList}>
                  {report.muscleDistribution.map((m) => (
                    <View key={m.muscle} style={styles.muscleRow}>
                      <View style={styles.muscleLabelRow}>
                        <Text variant="bodySm" style={{ fontWeight: '600' }}>
                          {m.label}
                        </Text>
                        <Text variant="caption" color="textMuted">
                          {m.count} sets ({m.percentage}%)
                        </Text>
                      </View>
                      <View style={[styles.volumeTrack, { backgroundColor: theme.elevated }]}>
                        <View
                          style={[
                            styles.volumeFill,
                            { backgroundColor: theme.accent, width: `${m.percentage}%` },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Personal Records Broken */}
            {report.prsAchieved.length > 0 && (
              <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="trophy-outline" size={18} color={theme.prGold} />
                  <Text variant="headingSm" style={{ fontWeight: '700' }}>
                    Personal Records Achieved ({report.prsAchieved.length})
                  </Text>
                </View>

                <View style={styles.prList}>
                  {report.prsAchieved.map((pr, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.prCard,
                        { backgroundColor: theme.elevated, borderColor: theme.border },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text variant="bodySm" style={{ fontWeight: '700' }}>
                          {pr.exerciseName}
                        </Text>
                        <Text variant="caption" color="textMuted" style={{ textTransform: 'capitalize' }}>
                          {pr.recordType.replace(/_/g, ' ')}
                        </Text>
                      </View>
                      <Text variant="headingSm" color="accent" style={{ fontWeight: '800' }}>
                        {formatWeight(pr.value, 'kg')}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.base,
    gap: spacing.base,
    paddingBottom: spacing['4xl'],
  },
  selectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  navBtn: {
    padding: spacing.sm,
  },
  emptyContainer: {
    padding: spacing['2xl'],
    borderRadius: radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricBox: {
    width: '48.5%',
    padding: spacing.base,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.xs,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  sectionCard: {
    padding: spacing.base,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  calendarWeekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  calendarDayHeader: {
    width: 34,
    textAlign: 'center',
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  calendarCell: {
    width: '14.28%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBubble: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topExercisesList: {
    gap: spacing.md,
  },
  exerciseRow: {
    gap: 4,
  },
  exerciseInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  volumeTrack: {
    height: 6,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  volumeFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  muscleList: {
    gap: spacing.sm,
  },
  muscleRow: {
    gap: 4,
  },
  muscleLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prList: {
    gap: spacing.sm,
  },
  prCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
});
