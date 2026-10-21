/**
 * MinimizedWorkoutBar — persistent bar visible across tabs when a workout is active.
 *
 * Shows current running duration, latest exercise, and rest timer countdown.
 * Tapping it navigates back to the workout tab.
 */

import React, { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Text } from '../typography/Text';
import { useWorkoutStore } from '../../state/workoutStore';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radii, layout } from '../theme/tokens';
import { formatDuration } from '../../lib/units';
import { lightImpact } from '../../lib/haptics';
import { Ionicons } from '@expo/vector-icons';

export function MinimizedWorkoutBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();

  const {
    activeWorkout,
    isRestTimerRunning,
    restRemainingSeconds,
  } = useWorkoutStore();

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeWorkout) return;
    const startMs = new Date(activeWorkout.startedAt).getTime();

    const interval = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeWorkout?.startedAt]);

  // Don't show if no active workout or if already on the workout tab
  if (!activeWorkout || pathname.includes('/workout')) {
    return null;
  }

  const latestExercise =
    activeWorkout.exercises.length > 0
      ? activeWorkout.exercises[activeWorkout.exercises.length - 1].exercise.name
      : 'Empty Workout';

  const handlePress = () => {
    lightImpact();
    router.navigate('/(tabs)/workout');
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.bar,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <View style={styles.leftInfo}>
        <View style={[styles.pulseDot, { backgroundColor: theme.accent }]} />
        <View>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            WORKOUT IN PROGRESS
          </Text>
          <Text variant="bodySm" color="text" numberOfLines={1} style={{ fontWeight: '600' }}>
            {latestExercise}
          </Text>
        </View>
      </View>

      <View style={styles.rightStats}>
        {isRestTimerRunning ? (
          <View style={[styles.restPill, { backgroundColor: theme.elevated, borderColor: theme.accent }]}>
            <Ionicons name="hourglass-outline" size={12} color={theme.accent} />
            <Text variant="caption" color="accent" tabular style={{ marginLeft: 3 }}>
              {formatDuration(restRemainingSeconds)}
            </Text>
          </View>
        ) : null}

        <Text variant="bodySm" color="accent" tabular style={styles.elapsedText}>
          {formatDuration(elapsed)}
        </Text>

        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      </View>
    </Pressable>
  );
}

const tabBottomOffset = Platform.OS === 'ios' ? layout.tabBarHeight + 34 : layout.tabBarHeight + 8;

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: tabBottomOffset,
    left: 0,
    right: 0,
    height: layout.workoutBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 99,
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    marginRight: spacing.sm,
  },
  rightStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  restPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  elapsedText: {
    fontWeight: '700',
  },
});
