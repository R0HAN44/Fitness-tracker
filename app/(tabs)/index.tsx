/**
 * Home / Dashboard tab — complete fitness dashboard.
 * Features:
 *   - Weekly workout goal progress & streak counter
 *   - Quick "Start Workout" / "Resume Workout" action
 *   - Lifetime summary cards (workouts, volume, sets, duration)
 *   - Consistency heatmap (past 16 weeks)
 *   - Volume over time chart with 3M, 1Y, and All-Time ranges
 *   - Muscle group distribution (last 90 days)
 *   - Recent workout session previews with 1-tap navigation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../src/ui/typography/Text';
import { Button } from '../../src/ui/components/Button';
import { SegmentedControl } from '../../src/ui/components/SegmentedControl';
import { LineChart } from '../../src/ui/charts/LineChart';
import { ConsistencyHeatmapView } from '../../src/ui/charts/ConsistencyHeatmapView';
import { MuscleDistributionView } from '../../src/ui/charts/MuscleDistributionView';
import { useWorkoutStore } from '../../src/state/workoutStore';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { spacing, radii, layout, typography } from '../../src/ui/theme/tokens';
import { formatDuration, formatWeight } from '../../src/domain/units';
import { lightImpact } from '../../src/lib/haptics';
import {
  getLifetimeStats,
  getConsistencyHeatmap,
  getVolumeOverTime,
  getMuscleDistribution,
  getRecentDashboardWorkouts,
  type LifetimeStats,
} from '../../src/db/queries/stats';
import type { ConsistencyHeatmapData, MuscleDistributionItem, TimeRange, VolumeTimePoint } from '../../src/domain/stats';
import type { CompletedWorkoutSummary } from '../../src/db/queries/workouts';

export default function HomeScreen() {
  const { theme } = useTheme();
  const { activeWorkout, startWorkout } = useWorkoutStore();

  const [stats, setStats] = useState<LifetimeStats | null>(null);
  const [heatmapData, setHeatmapData] = useState<ConsistencyHeatmapData | null>(null);
  const [volRange, setVolRange] = useState<TimeRange>('3m');
  const [volumePoints, setVolumePoints] = useState<VolumeTimePoint[]>([]);
  const [distribution, setDistribution] = useState<MuscleDistributionItem[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<CompletedWorkoutSummary[]>([]);

  const reloadDashboard = useCallback(() => {
    try {
      const life = getLifetimeStats();
      setStats(life);
      const heat = getConsistencyHeatmap(16);
      setHeatmapData(heat);
      const vol = getVolumeOverTime(volRange);
      setVolumePoints(vol);
      const dist = getMuscleDistribution(90);
      setDistribution(dist);
      const rec = getRecentDashboardWorkouts(3);
      setRecentWorkouts(rec);
    } catch (e) {
      console.error('Error loading dashboard stats:', e);
    }
  }, [volRange]);

  useFocusEffect(
    useCallback(() => {
      reloadDashboard();
    }, [reloadDashboard]),
  );

  const handleStartWorkout = () => {
    lightImpact();
    if (!activeWorkout) {
      startWorkout();
    }
    router.push('/(tabs)/workout');
  };

  const handleOpenWorkout = (workoutId: string) => {
    lightImpact();
    router.push({ pathname: '/workout/[id]', params: { id: workoutId } } as any);
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Greeting */}
        <View style={styles.header}>
          <View>
            <Text variant="caption" color="textMuted" style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {getGreeting()}
            </Text>
            <Text variant="displaySm" style={{ fontWeight: '800' }}>
              Ironlog
            </Text>
          </View>

          {/* Active Workout or Start Button */}
          <Button
            title={activeWorkout ? 'Resume Workout' : 'Start Workout'}
            variant="primary"
            size="sm"
            icon={<Ionicons name={activeWorkout ? 'pulse' : 'play'} size={16} color={theme.onAccent} />}
            onPress={handleStartWorkout}
          />
        </View>

        {/* Weekly Goal & Streak Card */}
        {stats && (
          <View style={[styles.goalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.goalTop}>
              <View>
                <Text variant="caption" color="textMuted">WEEKLY GOAL</Text>
                <Text variant="headingSm" style={{ fontWeight: '800', marginTop: 2 }}>
                  {stats.streaks.workoutsThisWeek} of {stats.weeklyGoal} workouts
                </Text>
              </View>

              {/* Streak Badge */}
              <View style={[styles.streakBadge, { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}>
                <Ionicons name="flame" size={16} color={theme.accent} />
                <Text variant="caption" color="accent" style={{ fontWeight: '800' }}>
                  {stats.streaks.currentWeekStreak} WEEK STREAK
                </Text>
              </View>
            </View>

            {/* Goal Progress Bar */}
            <View style={[styles.goalTrack, { backgroundColor: theme.elevated }]}>
              <View
                style={[
                  styles.goalFill,
                  {
                    backgroundColor: theme.accent,
                    width: `${Math.min(100, Math.max(5, stats.streaks.weeklyGoalProgress * 100))}%`,
                  },
                ]}
              />
            </View>

            <View style={styles.goalFooter}>
              <Text variant="caption" color="textMuted">
                {stats.streaks.currentDayStreak > 0
                  ? `⚡ ${stats.streaks.currentDayStreak} day training streak`
                  : 'Start training today to build a streak'}
              </Text>
              <Text variant="caption" color="textMuted">
                Best: {stats.streaks.longestWeekStreak} weeks
              </Text>
            </View>
          </View>
        )}

        {/* Lifetime Stats 4-Grid */}
        {stats && (
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="trophy-outline" size={18} color={theme.accent} />
              <Text variant="headingSm" style={{ fontWeight: '800', marginTop: 4 }} tabular>
                {stats.totalWorkouts}
              </Text>
              <Text variant="caption" color="textMuted">Workouts</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="barbell-outline" size={18} color={theme.accent} />
              <Text variant="headingSm" style={{ fontWeight: '800', marginTop: 4 }} tabular>
                {formatWeight(stats.totalVolumeKg, 'kg')}
              </Text>
              <Text variant="caption" color="textMuted">Total Volume</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="time-outline" size={18} color={theme.accent} />
              <Text variant="headingSm" style={{ fontWeight: '800', marginTop: 4 }} tabular>
                {Math.round((stats.totalDurationSeconds / 3600) * 10) / 10}h
              </Text>
              <Text variant="caption" color="textMuted">Time Trained</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="layers-outline" size={18} color={theme.accent} />
              <Text variant="headingSm" style={{ fontWeight: '800', marginTop: 4 }} tabular>
                {stats.totalSets}
              </Text>
              <Text variant="caption" color="textMuted">Total Sets</Text>
            </View>
          </View>
        )}

        {/* Reports & Insights Banner */}
        <Pressable
          onPress={() => {
            lightImpact();
            router.push('/reports' as any);
          }}
          style={({ pressed }) => [
            styles.reportsBanner,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <View style={[styles.reportsIconWrap, { backgroundColor: theme.accent + '22' }]}>
            <Ionicons name="sparkles" size={20} color={theme.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="body" style={{ fontWeight: '700' }}>
              Training Reports & Strength Standards
            </Text>
            <Text variant="caption" color="textMuted">
              Monthly summary, Year in Review, and SBD rankings
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>

        {/* Consistency Heatmap */}
        {heatmapData && <ConsistencyHeatmapView data={heatmapData} />}

        {/* Volume Progression Chart */}
        <View style={[styles.chartSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.chartSectionHeader}>
            <View>
              <Text variant="headingSm" style={{ fontWeight: '700' }}>
                Volume Over Time
              </Text>
              <Text variant="caption" color="textMuted">
                Total training load progression
              </Text>
            </View>
          </View>

          {/* Range Selector */}
          <SegmentedControl
            options={[
              { label: '3 Months', value: '3m' },
              { label: '1 Year', value: '1y' },
              { label: 'All Time', value: 'all' },
            ]}
            value={volRange}
            onChange={(r) => {
              lightImpact();
              setVolRange(r as TimeRange);
            }}
            size="sm"
          />

          <LineChart
            data={volumePoints.map((p) => ({ label: p.label, value: p.volumeKg }))}
            height={190}
            unit="kg"
            emptyMessage="Complete workouts to see your volume curve."
          />
        </View>

        {/* Muscle Distribution */}
        <MuscleDistributionView distribution={distribution} />

        {/* Recent Workouts */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text variant="headingSm" style={{ fontWeight: '700' }}>
              Recent Workouts
            </Text>
            <Pressable onPress={() => router.push('/(tabs)/history')} hitSlop={6}>
              <Text variant="caption" color="accent" style={{ fontWeight: '700' }}>
                View All
              </Text>
            </Pressable>
          </View>

          {recentWorkouts.length === 0 ? (
            <View style={[styles.emptyRecent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="barbell-outline" size={32} color={theme.textMuted} />
              <Text variant="bodySm" color="textMuted" style={{ marginTop: 6 }}>
                No completed workouts yet.
              </Text>
            </View>
          ) : (
            recentWorkouts.map((w) => (
              <Pressable
                key={w.id}
                onPress={() => handleOpenWorkout(w.id)}
                style={({ pressed }) => [
                  styles.recentCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '700' }}>
                    {w.title ?? 'Workout'}
                  </Text>
                  <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                    {formatDate(w.startedAt)} · {formatDuration(w.durationSeconds ?? 0)} · {formatWeight(w.totalVolumeKg ?? 0, 'kg')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing['5xl'],
    gap: spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  goalCard: {
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  goalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  goalTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  goalFill: {
    height: '100%',
    borderRadius: 5,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  reportsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  reportsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartSection: {
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  chartSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentSection: {
    gap: spacing.xs,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  emptyRecent: {
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
});
