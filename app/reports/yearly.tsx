/**
 * Year in Review Screen — Annual fitness wrapped.
 *
 * Highlights:
 *   - Total workouts, total tonnage lifted, total training hours
 *   - Peak training month & favorite day of the week
 *   - Strongest lifts of the year (Bench, Squat, Deadlift, OHP)
 *   - Top exercises of the year
 *   - 1-tap sharing to Instagram, WhatsApp, X, or clipboard
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../src/ui/typography/Text';
import { Button } from '../../src/ui/components/Button';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { spacing, radii, layout, typography } from '../../src/ui/theme/tokens';
import { formatWeight } from '../../src/domain/units';
import { lightImpact, notificationSuccess } from '../../src/lib/haptics';
import { getYearInReview, getAvailableReportYears } from '../../src/db/queries/reports';
import type { YearInReviewData } from '../../src/domain/reports';

export default function YearlyReportScreen() {
  const { theme } = useTheme();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([now.getFullYear()]);
  const [data, setData] = useState<YearInReviewData | null>(null);

  useEffect(() => {
    const years = getAvailableReportYears();
    setAvailableYears(years);
    if (years.length > 0) {
      setSelectedYear(years[0]);
    }
  }, []);

  const loadData = useCallback(() => {
    try {
      const yearReport = getYearInReview(selectedYear);
      setData(yearReport);
    } catch (e) {
      console.error('Error loading year in review:', e);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrevYear = () => {
    lightImpact();
    setSelectedYear((y) => y - 1);
  };

  const handleNextYear = () => {
    lightImpact();
    setSelectedYear((y) => y + 1);
  };

  const handleShare = async () => {
    if (!data) return;
    lightImpact();
    try {
      await Share.share({
        message: data.shareableSummary,
        title: `My ${data.year} Year in Review`,
      });
      notificationSuccess();
    } catch (e: any) {
      console.error('Error sharing year in review:', e);
      Alert.alert('Share Error', e.message || 'Could not share review.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
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
          Year in Review
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Year Selector */}
        <View style={[styles.selectorBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Pressable onPress={handlePrevYear} hitSlop={12} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={theme.text} />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text variant="headingSm" style={{ fontWeight: '800' }}>
              {selectedYear}
            </Text>
            <Text variant="caption" color="textMuted">
              Annual Milestones
            </Text>
          </View>
          <Pressable onPress={handleNextYear} hitSlop={12} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={theme.text} />
          </Pressable>
        </View>

        {data && data.totalWorkouts === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="sparkles-outline" size={44} color={theme.textMuted} />
            <Text variant="headingSm" color="text" style={{ marginTop: spacing.xs }}>
              No Workouts in {selectedYear}
            </Text>
            <Text variant="bodySm" color="textMuted" center>
              No completed sessions found for this year.
            </Text>
          </View>
        ) : data ? (
          <>
            {/* Hero Showcase Card */}
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.accent,
                },
              ]}
            >
              <View style={styles.heroTop}>
                <View style={[styles.heroBadge, { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}>
                  <Ionicons name="trophy" size={14} color={theme.accent} />
                  <Text variant="caption" color="accent" style={{ fontWeight: '800' }}>
                    {selectedYear} WRAPPED
                  </Text>
                </View>
                <Text variant="caption" color="textMuted">
                  Ironlog Annual Review
                </Text>
              </View>

              <Text variant="displayLg" color="text" style={{ fontWeight: '900', marginTop: spacing.sm }}>
                {data.totalVolumeTonnes}{' '}
                <Text variant="headingLg" color="accent" style={{ fontWeight: '900' }}>
                  Tonnes Lifted
                </Text>
              </Text>

              <Text variant="body" color="textMuted" style={{ lineHeight: 22 }}>
                You showed up and logged{' '}
                <Text variant="body" color="text" style={{ fontWeight: '700' }}>
                  {data.totalWorkouts} workouts
                </Text>{' '}
                across{' '}
                <Text variant="body" color="text" style={{ fontWeight: '700' }}>
                  {Math.round((data.totalDurationSeconds / 3600) * 10) / 10} hours
                </Text>{' '}
                of training.
              </Text>

              <View style={[styles.heroDivider, { backgroundColor: theme.border }]} />

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatItem}>
                  <Text variant="caption" color="textMuted">SETS</Text>
                  <Text variant="headingSm" style={{ fontWeight: '800' }}>
                    {data.totalSets.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.heroStatItem}>
                  <Text variant="caption" color="textMuted">REPS</Text>
                  <Text variant="headingSm" style={{ fontWeight: '800' }}>
                    {data.totalReps.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.heroStatItem}>
                  <Text variant="caption" color="textMuted">PRS BROKEN</Text>
                  <Text variant="headingSm" color="accent" style={{ fontWeight: '800' }}>
                    {data.totalPrsCount} 🏆
                  </Text>
                </View>
              </View>
            </View>

            {/* Highlights Grid */}
            <View style={styles.highlightsGrid}>
              {data.mostActiveMonth && (
                <View style={[styles.highlightBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={[styles.highlightIcon, { backgroundColor: theme.elevated }]}>
                    <Ionicons name="flame" size={20} color={theme.accent} />
                  </View>
                  <Text variant="caption" color="textMuted">PEAK MONTH</Text>
                  <Text variant="headingSm" style={{ fontWeight: '800' }}>
                    {data.mostActiveMonth.monthName}
                  </Text>
                  <Text variant="caption" color="accent">
                    {data.mostActiveMonth.workoutCount} workouts
                  </Text>
                </View>
              )}

              {data.favoriteDayOfWeek && (
                <View style={[styles.highlightBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={[styles.highlightIcon, { backgroundColor: theme.elevated }]}>
                    <Ionicons name="calendar" size={20} color={theme.prGold} />
                  </View>
                  <Text variant="caption" color="textMuted">FAVORITE DAY</Text>
                  <Text variant="headingSm" style={{ fontWeight: '800' }}>
                    {data.favoriteDayOfWeek.dayName}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {data.favoriteDayOfWeek.count} sessions
                  </Text>
                </View>
              )}
            </View>

            {/* Strongest Lifts of the Year */}
            {data.bigLifts.length > 0 && (
              <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="barbell-outline" size={18} color={theme.accent} />
                  <Text variant="headingSm" style={{ fontWeight: '700' }}>
                    Strongest Lifts of {selectedYear}
                  </Text>
                </View>

                <View style={styles.bigLiftsGrid}>
                  {data.bigLifts.map((lift) => (
                    <View
                      key={lift.liftKey}
                      style={[
                        styles.bigLiftCard,
                        { backgroundColor: theme.elevated, borderColor: theme.border },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text variant="bodySm" style={{ fontWeight: '700' }}>
                          {lift.liftName}
                        </Text>
                        <Text variant="caption" color="textMuted">
                          Best Weight: {formatWeight(lift.bestWeightKg, 'kg')}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text variant="caption" color="textMuted">EST. 1RM</Text>
                        <Text variant="headingSm" color="accent" style={{ fontWeight: '800' }}>
                          {formatWeight(lift.best1rmKg, 'kg')}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Top 5 Exercises */}
            {data.topExercises.length > 0 && (
              <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="podium-outline" size={18} color={theme.accent} />
                  <Text variant="headingSm" style={{ fontWeight: '700' }}>
                    Top Exercises of the Year
                  </Text>
                </View>

                <View style={styles.topExercisesList}>
                  {data.topExercises.map((ex, idx) => (
                    <View key={ex.exerciseId} style={styles.exerciseRow}>
                      <View style={styles.exerciseInfoRow}>
                        <Text variant="bodySm" style={{ fontWeight: '700', flex: 1 }}>
                          #{idx + 1} {ex.exerciseName}
                        </Text>
                        <Text variant="bodySm" color="accent" style={{ fontWeight: '700' }}>
                          {formatWeight(ex.volumeKg, 'kg')}
                        </Text>
                      </View>
                      <Text variant="caption" color="textMuted">
                        {ex.setsCount} sets completed
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Share Button */}
            <Button
              title="Share Year in Review"
              variant="primary"
              size="lg"
              icon={<Ionicons name="share-social-outline" size={20} color={theme.onAccent} />}
              onPress={handleShare}
              fullWidth
            />
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
  heroCard: {
    padding: spacing.base,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    gap: spacing.sm,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  heroDivider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroStatItem: {
    alignItems: 'center',
    gap: 2,
  },
  highlightsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  highlightBox: {
    flex: 1,
    padding: spacing.base,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: 4,
  },
  highlightIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
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
  bigLiftsGrid: {
    gap: spacing.sm,
  },
  bigLiftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  topExercisesList: {
    gap: spacing.md,
  },
  exerciseRow: {
    gap: 2,
  },
  exerciseInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
