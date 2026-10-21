/**
 * Reports Hub — centralized access to:
 *   1. Monthly Training Reports (month-over-month growth, active calendar)
 *   2. Year-in-Review (annual fitness wrapped & shareable summary)
 *   3. Local Strength Standards & Ranking (empirical strength tiers for primary lifts)
 */

import React, { useState, useCallback } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../src/ui/typography/Text';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { spacing, radii, layout, typography } from '../../src/ui/theme/tokens';
import { formatWeight } from '../../src/domain/units';
import { lightImpact } from '../../src/lib/haptics';
import {
  getMonthlyReport,
  getYearInReview,
  getLocalStrengthRanking,
} from '../../src/db/queries/reports';
import { STRENGTH_TIER_LABELS } from '../../src/domain/reports';

export default function ReportsIndexScreen() {
  const { theme } = useTheme();

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  const [monthlySnippet, setMonthlySnippet] = useState<{
    monthName: string;
    workouts: number;
    volumeKg: number;
  } | null>(null);

  const [yearlySnippet, setYearlySnippet] = useState<{
    year: number;
    workouts: number;
    tonnes: number;
    prs: number;
  } | null>(null);

  const [rankingSnippet, setRankingSnippet] = useState<{
    tierLabel: string;
    scorePercent: number;
    bwKg: number;
  } | null>(null);

  const loadData = useCallback(() => {
    try {
      const monthData = getMonthlyReport(curYear, curMonth);
      setMonthlySnippet({
        monthName: monthData.monthName,
        workouts: monthData.workoutCount,
        volumeKg: monthData.totalVolumeKg,
      });

      const yearData = getYearInReview(curYear);
      setYearlySnippet({
        year: curYear,
        workouts: yearData.totalWorkouts,
        tonnes: yearData.totalVolumeTonnes,
        prs: yearData.totalPrsCount,
      });

      const rankData = getLocalStrengthRanking();
      setRankingSnippet({
        tierLabel: STRENGTH_TIER_LABELS[rankData.overallTier],
        scorePercent: rankData.overallScorePercent,
        bwKg: rankData.userBodyweightKg,
      });
    } catch (e) {
      console.error('Error loading reports hub data:', e);
    }
  }, [curYear, curMonth]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

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
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="headingLg" style={{ fontWeight: '800' }}>
            Reports & Insights
          </Text>
          <Text variant="caption" color="textMuted">
            Training analytics, annual milestones & strength standards
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 1. Monthly Report Card */}
        <Pressable
          style={({ pressed }) => [
            styles.reportCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
          onPress={() => {
            lightImpact();
            router.push('/reports/monthly' as any);
          }}
          accessibilityRole="button"
          accessibilityLabel="Monthly Training Report"
        >
          <View style={styles.cardTop}>
            <View style={[styles.iconWrap, { backgroundColor: theme.elevated }]}>
              <Ionicons name="calendar" size={22} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="headingSm" style={{ fontWeight: '700' }}>
                Monthly Report
              </Text>
              <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                Month-over-month volume, workout frequency & active days
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </View>

          {monthlySnippet && (
            <View style={[styles.snippetContainer, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
              <View style={styles.snippetStat}>
                <Text variant="caption" color="textMuted">{monthlySnippet.monthName.toUpperCase()}</Text>
                <Text variant="body" color="text" style={{ fontWeight: '800' }}>
                  {monthlySnippet.workouts} Workouts
                </Text>
              </View>
              <View style={styles.snippetDivider} />
              <View style={styles.snippetStat}>
                <Text variant="caption" color="textMuted">VOLUME</Text>
                <Text variant="body" color="accent" style={{ fontWeight: '800' }}>
                  {formatWeight(monthlySnippet.volumeKg, 'kg')}
                </Text>
              </View>
            </View>
          )}
        </Pressable>

        {/* 2. Year in Review Card */}
        <Pressable
          style={({ pressed }) => [
            styles.reportCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
          onPress={() => {
            lightImpact();
            router.push('/reports/yearly' as any);
          }}
          accessibilityRole="button"
          accessibilityLabel="Year in Review"
        >
          <View style={styles.cardTop}>
            <View style={[styles.iconWrap, { backgroundColor: theme.elevated }]}>
              <Ionicons name="sparkles" size={22} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <Text variant="headingSm" style={{ fontWeight: '700' }}>
                  Year in Review
                </Text>
                <View style={[styles.pillBadge, { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}>
                  <Text variant="caption" color="accent" style={{ fontWeight: '800', fontSize: 10 }}>
                    {curYear}
                  </Text>
                </View>
              </View>
              <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                Annual training wrap-up, tonnage lifted & shareable card
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </View>

          {yearlySnippet && (
            <View style={[styles.snippetContainer, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
              <View style={styles.snippetStat}>
                <Text variant="caption" color="textMuted">WORKOUTS</Text>
                <Text variant="body" color="text" style={{ fontWeight: '800' }}>
                  {yearlySnippet.workouts}
                </Text>
              </View>
              <View style={styles.snippetDivider} />
              <View style={styles.snippetStat}>
                <Text variant="caption" color="textMuted">TONNAGE</Text>
                <Text variant="body" color="accent" style={{ fontWeight: '800' }}>
                  {yearlySnippet.tonnes} t
                </Text>
              </View>
              <View style={styles.snippetDivider} />
              <View style={styles.snippetStat}>
                <Text variant="caption" color="textMuted">PRS</Text>
                <Text variant="body" color="text" style={{ fontWeight: '800' }}>
                  {yearlySnippet.prs} 🏆
                </Text>
              </View>
            </View>
          )}
        </Pressable>

        {/* 3. Strength Standards & Local Ranking Card */}
        <Pressable
          style={({ pressed }) => [
            styles.reportCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
          onPress={() => {
            lightImpact();
            router.push('/reports/ranking' as any);
          }}
          accessibilityRole="button"
          accessibilityLabel="Local Strength Standards & Ranking"
        >
          <View style={styles.cardTop}>
            <View style={[styles.iconWrap, { backgroundColor: theme.elevated }]}>
              <Ionicons name="trophy" size={22} color={theme.prGold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="headingSm" style={{ fontWeight: '700' }}>
                Strength Standards
              </Text>
              <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                Local classification & progression for Bench, Squat, Deadlift & OHP
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </View>

          {rankingSnippet && (
            <View style={[styles.snippetContainer, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
              <View style={styles.snippetStat}>
                <Text variant="caption" color="textMuted">OVERALL TIER</Text>
                <Text variant="body" style={{ color: theme.prGold, fontWeight: '800' }}>
                  {rankingSnippet.tierLabel}
                </Text>
              </View>
              <View style={styles.snippetDivider} />
              <View style={styles.snippetStat}>
                <Text variant="caption" color="textMuted">BODYWEIGHT</Text>
                <Text variant="body" color="text" style={{ fontWeight: '800' }}>
                  {rankingSnippet.bwKg} kg
                </Text>
              </View>
              <View style={styles.snippetDivider} />
              <View style={styles.snippetStat}>
                <Text variant="caption" color="textMuted">SCORE</Text>
                <Text variant="body" color="accent" style={{ fontWeight: '800' }}>
                  {rankingSnippet.scorePercent}%
                </Text>
              </View>
            </View>
          )}
        </Pressable>
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
  reportCard: {
    padding: spacing.base,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pillBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  snippetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  snippetStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  snippetDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#33333333',
  },
});
