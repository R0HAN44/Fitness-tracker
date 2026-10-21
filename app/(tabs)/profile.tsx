/**
 * Profile / Stats tab — Phase 1 placeholder.
 * Will display stats dashboard, body measurements, and settings link in Phase 4.
 */

import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../src/ui/typography/Text';
import { createStyles } from '../../src/ui/theme/createStyles';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { spacing, radii, layout } from '../../src/ui/theme/tokens';

export default function ProfileScreen() {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="displaySm">Profile</Text>
        <Text variant="body" color="textMuted" style={styles.subtitle}>
          Stats and settings
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text variant="displayLg" color="accent">0</Text>
            <Text variant="caption" color="textMuted">Workouts</Text>
          </View>
          <View style={styles.statCard}>
            <Text variant="displayLg" color="accent">0</Text>
            <Text variant="caption" color="textMuted">This Week</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.menuItem,
            pressed && styles.menuItemPressed,
          ]}
          onPress={() => router.push('/records' as any)}
          accessibilityRole="button"
          accessibilityLabel="Personal Records"
        >
          <View style={styles.menuIconWrap}>
            <Ionicons name="trophy-outline" size={20} color={theme.prGold} />
          </View>
          <Text variant="body" style={styles.menuLabel}>Personal Records</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.menuItem,
            pressed && styles.menuItemPressed,
          ]}
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <View style={styles.menuIconWrap}>
            <Ionicons name="settings-outline" size={20} color={theme.text} />
          </View>
          <Text variant="body" style={styles.menuLabel}>Settings</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.menuItem,
            pressed && styles.menuItemPressed,
          ]}
          onPress={() => router.push('/settings/appearance')}
          accessibilityRole="button"
          accessibilityLabel="Appearance"
        >
          <View style={styles.menuIconWrap}>
            <Ionicons name="color-palette-outline" size={20} color={theme.text} />
          </View>
          <Text variant="body" style={styles.menuLabel}>Appearance</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>
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
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    gap: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: theme.border,
    minHeight: layout.minTouchTarget,
  },
  menuItemPressed: {
    backgroundColor: theme.elevated,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: theme.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuLabel: {
    flex: 1,
  },
}));
