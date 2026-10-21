/**
 * History tab — comprehensive workout history browser with:
 *   1. Chronological list of completed workouts
 *   2. Interactive month calendar view with workout activity dots
 *   3. Direct navigation to WorkoutDetailScreen and PR Board
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../src/ui/typography/Text';
import { SegmentedControl } from '../../src/ui/components/SegmentedControl';
import { Button } from '../../src/ui/components/Button';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { spacing, radii, layout, typography } from '../../src/ui/theme/tokens';
import { formatDuration, formatWeight } from '../../src/domain/units';
import { lightImpact } from '../../src/lib/haptics';
import {
  getCompletedWorkouts,
  getCompletedWorkoutDates,
  type CompletedWorkoutSummary,
} from '../../src/db/queries/workouts';
import { useSettingsStore } from '../../src/state/settingsStore';

type ViewMode = 'list' | 'calendar';

const PAGE_SIZE = 20;

export default function HistoryScreen() {
  const { theme } = useTheme();
  const weightUnit = useSettingsStore((s) => s.weightUnit);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [workoutsList, setWorkoutsList] = useState<CompletedWorkoutSummary[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [workoutDatesSet, setWorkoutDatesSet] = useState<Set<string>>(new Set());

  // Calendar navigation state
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });

  const reloadData = useCallback(() => {
    try {
      const initial = getCompletedWorkouts({ limit: PAGE_SIZE, offset: 0 });
      setWorkoutsList(initial);
      setPage(1);
      setHasMore(initial.length === PAGE_SIZE);

      const dates = getCompletedWorkoutDates();
      setWorkoutDatesSet(new Set(dates));
    } catch (e) {
      console.error('Error loading completed workouts:', e);
    }
  }, []);

  const loadMoreWorkouts = useCallback(() => {
    if (!hasMore || viewMode !== 'list') return;
    try {
      const nextPage = getCompletedWorkouts({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      if (nextPage.length > 0) {
        setWorkoutsList((prev) => [...prev, ...nextPage]);
        setPage((p) => p + 1);
        setHasMore(nextPage.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error('Error loading more workouts:', e);
    }
  }, [hasMore, page, viewMode]);

  useFocusEffect(
    useCallback(() => {
      reloadData();
    }, [reloadData]),
  );

  const handleOpenWorkout = (workoutId: string) => {
    lightImpact();
    router.push({ pathname: '/workout/[id]', params: { id: workoutId } } as any);
  };

  const handleOpenRecordsBoard = () => {
    lightImpact();
    router.push('/records' as any);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
  // Normalize Monday as first day (0=Mon ... 6=Sun)
  const mondayOffset = (firstDayOfWeek + 6) % 7;

  const monthName = currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    lightImpact();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    lightImpact();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const calendarDays: Array<{ dayNumber: number | null; dateString: string | null }> = [];
  // Empty leading days
  for (let i = 0; i < mondayOffset; i++) {
    calendarDays.push({ dayNumber: null, dateString: null });
  }
  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ dayNumber: d, dateString: dateStr });
  }

  const workoutsOnSelectedDate = workoutsList.filter(
    (w) => w.startedAt.slice(0, 10) === selectedCalendarDate,
  );

  const renderWorkoutCard = (workout: CompletedWorkoutSummary) => (
    <Pressable
      key={workout.id}
      onPress={() => handleOpenWorkout(workout.id)}
      style={({ pressed }) => [
        styles.workoutCard,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* Top Header */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <Text variant="headingSm" numberOfLines={1} ellipsizeMode="tail" style={{ fontWeight: '700' }}>
            {workout.title ?? 'Workout'}
          </Text>
          <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
            {formatDate(workout.startedAt)} · {formatTime(workout.startedAt)}
          </Text>
        </View>

        {workout.prCount > 0 && (
          <View style={[styles.prBadge, { backgroundColor: theme.prGold + '22', borderColor: theme.prGold, flexShrink: 0 }]}>
            <Text variant="caption" style={{ color: theme.prGold, fontSize: 11, fontWeight: '800' }}>
              🏆 {workout.prCount} PR{workout.prCount === 1 ? '' : 's'}
            </Text>
          </View>
        )}
      </View>

      {/* Exercises Preview */}
      <View style={styles.exercisePreviewList}>
        {workout.exerciseSummaries.map((ex, idx) => (
          <View key={`${ex.exerciseId}-${idx}`} style={styles.exercisePreviewRow}>
            <Text variant="bodySm" style={{ fontWeight: '600', flex: 1 }} numberOfLines={1}>
              {ex.setCount} × {ex.name}
            </Text>
            {ex.bestSetSummary && (
              <Text variant="caption" color="textMuted" tabular>
                {ex.bestSetSummary}
              </Text>
            )}
          </View>
        ))}
      </View>

      {/* Bottom Stats Banner */}
      <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
        <View style={styles.footerStat}>
          <Ionicons name="time-outline" size={14} color={theme.textMuted} />
          <Text variant="caption" color="textMuted" tabular>
            {formatDuration(workout.durationSeconds ?? 0)}
          </Text>
        </View>

        <View style={styles.footerStat}>
          <Ionicons name="barbell-outline" size={14} color={theme.textMuted} />
          <Text variant="caption" color="textMuted" tabular>
            {formatWeight(workout.totalVolumeKg ?? 0, weightUnit)}
          </Text>
        </View>

        <View style={styles.footerStat}>
          <Ionicons name="layers-outline" size={14} color={theme.textMuted} />
          <Text variant="caption" color="textMuted" tabular>
            {workout.exerciseSummaries.reduce((sum, e) => sum + e.setCount, 0)} sets
          </Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Screen Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text variant="displaySm">History</Text>
            <Text variant="bodySm" color="textMuted">
              {workoutsList.length} completed {workoutsList.length === 1 ? 'workout' : 'workouts'}
            </Text>
          </View>

          <Button
            title="PR Board"
            size="sm"
            variant="secondary"
            icon={<Ionicons name="trophy-outline" size={16} color={theme.prGold} />}
            onPress={handleOpenRecordsBoard}
          />
        </View>

        {/* View Mode Toggle */}
        <SegmentedControl
          options={[
            { label: 'List View', value: 'list' },
            { label: 'Calendar', value: 'calendar' },
          ]}
          value={viewMode}
          onChange={(v) => {
            lightImpact();
            setViewMode(v as ViewMode);
          }}
        />
      </View>

      {/* ───────────────── LIST VIEW ───────────────── */}
      {viewMode === 'list' && (
        <FlatList
          data={workoutsList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderWorkoutCard(item)}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          onEndReached={loadMoreWorkouts}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="barbell-outline" size={48} color={theme.textMuted} />
              <Text variant="headingSm" style={{ marginTop: spacing.sm }}>No Workouts Yet</Text>
              <Text variant="bodySm" color="textMuted" center style={{ marginTop: 4 }}>
                Complete your first workout to start tracking your training history and records.
              </Text>
              <Button
                title="Start Workout"
                variant="primary"
                onPress={() => router.push('/(tabs)/workout')}
                style={{ marginTop: spacing.base }}
              />
            </View>
          }
        />
      )}

      {/* ───────────────── CALENDAR VIEW ───────────────── */}
      {viewMode === 'calendar' && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Calendar Card */}
          <View style={[styles.calendarCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Month Header Navigation */}
            <View style={styles.monthHeader}>
              <Pressable onPress={handlePrevMonth} hitSlop={8} style={styles.monthNavBtn}>
                <Ionicons name="chevron-back" size={20} color={theme.text} />
              </Pressable>
              <Text variant="headingSm" style={{ fontWeight: '700' }}>
                {monthName}
              </Text>
              <Pressable onPress={handleNextMonth} hitSlop={8} style={styles.monthNavBtn}>
                <Ionicons name="chevron-forward" size={20} color={theme.text} />
              </Pressable>
            </View>

            {/* Weekday Labels (Mon - Sun) */}
            <View style={styles.weekdayRow}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, dIdx) => (
                <Text key={dIdx} variant="caption" color="textMuted" style={styles.weekdayText}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((item, index) => {
                if (!item.dayNumber || !item.dateString) {
                  return <View key={index} style={styles.calendarDayCell} />;
                }

                const hasWorkout = workoutDatesSet.has(item.dateString);
                const isSelected = item.dateString === selectedCalendarDate;

                return (
                  <Pressable
                    key={index}
                    onPress={() => {
                      lightImpact();
                      setSelectedCalendarDate(item.dateString!);
                    }}
                    style={[
                      styles.calendarDayCell,
                      isSelected ? { backgroundColor: theme.accent, borderRadius: radii.full } : null,
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={{
                        fontWeight: isSelected || hasWorkout ? '800' : '500',
                        color: isSelected ? theme.onAccent : hasWorkout ? theme.text : theme.textMuted,
                      }}
                      tabular
                    >
                      {item.dayNumber}
                    </Text>
                    {hasWorkout && !isSelected && (
                      <View style={[styles.workoutDot, { backgroundColor: theme.accent }]} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Workouts on selected date */}
          <View style={styles.dateHeaderRow}>
            <Text variant="caption" color="textMuted" style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              WORKOUTS ON {formatDate(selectedCalendarDate)}
            </Text>
          </View>

          {workoutsOnSelectedDate.length === 0 ? (
            <View style={[styles.emptyDateCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text variant="bodySm" color="textMuted" center>
                No workout recorded on this date.
              </Text>
            </View>
          ) : (
            workoutsOnSelectedDate.map(renderWorkoutCard)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing['5xl'],
    gap: spacing.base,
  },
  workoutCard: {
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  prBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  exercisePreviewList: {
    gap: 4,
    paddingVertical: 2,
  },
  exercisePreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyState: {
    padding: spacing['3xl'],
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  calendarCard: {
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  monthNavBtn: {
    padding: spacing.xs,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.xs,
  },
  weekdayText: {
    width: 32,
    textAlign: 'center',
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  calendarDayCell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  workoutDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  dateHeaderRow: {
    marginTop: spacing.xs,
  },
  emptyDateCard: {
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
});
