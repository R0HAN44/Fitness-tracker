/**
 * Profile / Stats tab — comprehensive profile with:
 *   - Weekly workout goal progress & streak counter
 *   - Lifetime training totals (workouts, volume, sets, time trained)
 *   - Quick-access to Body Measurements hub
 *   - Quick-access to Personal Records board
 *   - App settings & Appearance controls
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
import { getLifetimeStats, type LifetimeStats } from '../../src/db/queries/stats';
import { getMeasurementSummaries, type MeasurementSummary } from '../../src/db/queries/measurements';

export default function ProfileScreen() {
  const { theme } = useTheme();

  const [stats, setStats] = useState<LifetimeStats | null>(null);
  const [bodyweightSummary, setBodyweightSummary] = useState<MeasurementSummary | null>(null);

  const loadData = useCallback(() => {
    try {
      const life = getLifetimeStats();
      setStats(life);

      const summaries = getMeasurementSummaries();
      const bw = summaries.find((s: MeasurementSummary) => s.name.toLowerCase() === 'bodyweight') ?? summaries[0] ?? null;
      setBodyweightSummary(bw);
    } catch (e) {
      console.error('Error loading profile data:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="displaySm" style={{ fontWeight: '800' }}>
            Profile
          </Text>
          <Text variant="body" color="textMuted">
            Lifetime stats, body tracking, and settings
          </Text>
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
                  {stats.streaks.currentWeekStreak} WK STREAK
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
                  : 'Log a workout to build your streak'}
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

        {/* Body Tracking Quick Card */}
        <Pressable
          style={({ pressed }) => [
            styles.measureCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={() => {
            lightImpact();
            router.push('/measurements' as any);
          }}
          accessibilityRole="button"
          accessibilityLabel="Body Measurements"
        >
          <View style={[styles.menuIconWrap, { backgroundColor: theme.elevated }]}>
            <Ionicons name="body-outline" size={22} color={theme.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="headingSm" style={{ fontWeight: '700' }}>
              Body Measurements
            </Text>
            <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
              {bodyweightSummary?.latestEntry
                ? `Current: ${bodyweightSummary.latestEntry.value} ${bodyweightSummary.unit} · ${bodyweightSummary.totalEntriesCount} logs`
                : 'Track bodyweight, body fat %, and tape measurements'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>

        {/* Menu Items */}
        <View style={styles.menuGroup}>
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={() => {
              lightImpact();
              router.push('/reports' as any);
            }}
            accessibilityRole="button"
            accessibilityLabel="Reports & Insights"
          >
            <View style={[styles.menuIconWrap, { backgroundColor: theme.elevated }]}>
              <Ionicons name="stats-chart-outline" size={20} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body" style={{ fontWeight: '600' }}>Reports & Insights</Text>
              <Text variant="caption" color="textMuted">Monthly reports, annual wrapped & strength rank</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={() => {
              lightImpact();
              router.push('/records' as any);
            }}
            accessibilityRole="button"
            accessibilityLabel="Personal Records"
          >
            <View style={[styles.menuIconWrap, { backgroundColor: theme.elevated }]}>
              <Ionicons name="trophy-outline" size={20} color={theme.prGold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body" style={{ fontWeight: '600' }}>Personal Records</Text>
              <Text variant="caption" color="textMuted">PR board and exercise milestones</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={() => {
              lightImpact();
              router.push('/settings' as any);
            }}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <View style={[styles.menuIconWrap, { backgroundColor: theme.elevated }]}>
              <Ionicons name="settings-outline" size={20} color={theme.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body" style={{ fontWeight: '600' }}>Settings</Text>
              <Text variant="caption" color="textMuted">Preferences, units, and sound</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={() => {
              lightImpact();
              router.push('/settings/appearance' as any);
            }}
            accessibilityRole="button"
            accessibilityLabel="Appearance"
          >
            <View style={[styles.menuIconWrap, { backgroundColor: theme.elevated }]}>
              <Ionicons name="color-palette-outline" size={20} color={theme.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body" style={{ fontWeight: '600' }}>Appearance</Text>
              <Text variant="caption" color="textMuted">Dark mode and accent palettes</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </Pressable>
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
  measureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  menuGroup: {
    gap: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: layout.minTouchTarget,
    gap: spacing.md,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
