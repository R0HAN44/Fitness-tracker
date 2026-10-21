/**
 * Workout tab — start screen for new workouts.
 * Users can start an empty workout or pick from routines.
 * Full logging flow built in Phase 2.
 */

import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../src/ui/typography/Text';
import { createStyles } from '../../src/ui/theme/createStyles';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { spacing, radii, layout } from '../../src/ui/theme/tokens';

export default function WorkoutScreen() {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="displaySm">Workout</Text>
        <Text variant="body" color="textMuted" style={styles.subtitle}>
          Start tracking your sets
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.startButton,
            pressed && styles.startButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Start empty workout"
        >
          <Ionicons name="play" size={24} color={theme.onAccent} />
          <Text
            variant="headingSm"
            style={{ color: theme.onAccent, marginLeft: spacing.sm }}
          >
            Start Empty Workout
          </Text>
        </Pressable>

        <View style={styles.divider} />

        <Text variant="headingSm" style={styles.sectionTitle}>
          Routines
        </Text>
        <View style={styles.emptyState}>
          <Ionicons name="clipboard-outline" size={32} color={theme.textMuted} />
          <Text variant="bodySm" color="textMuted" center style={styles.emptyText}>
            Create routines to quickly start workouts with your favorite exercises pre-loaded.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = createStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    padding: spacing.base,
    paddingTop: spacing.xl,
  },
  subtitle: {
    marginBottom: spacing.xl,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.accent,
    paddingVertical: spacing.base,
    borderRadius: radii.lg,
    minHeight: layout.minTouchTarget,
  },
  startButtonPressed: {
    opacity: 0.85,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.base,
  },
  emptyState: {
    backgroundColor: theme.surface,
    borderRadius: radii.lg,
    padding: spacing['2xl'],
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    marginTop: spacing.xs,
  },
}));
