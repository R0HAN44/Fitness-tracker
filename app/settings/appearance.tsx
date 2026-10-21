/**
 * Appearance settings — palette gallery, mode selector, custom accent.
 * Tapping a palette applies it immediately with haptic feedback.
 */

import React from 'react';
import { View, ScrollView, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../src/ui/typography/Text';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { createStyles } from '../../src/ui/theme/createStyles';
import { paletteList, type PaletteId, type Appearance } from '../../src/ui/theme/palettes';
import { spacing, radii } from '../../src/ui/theme/tokens';
import { mediumImpact, lightImpact } from '../../src/lib/haptics';

export default function AppearanceScreen() {
  const styles = useStyles();
  const { theme, state, setPalette, setAppearance, isDark } = useTheme();

  const modes: { label: string; value: Appearance }[] = [
    { label: 'Dark', value: 'dark' },
    { label: 'Light', value: 'light' },
    { label: 'System', value: 'system' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Appearance',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Palette gallery */}
        <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
          PALETTE
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.paletteRow}
        >
          {paletteList.map((palette) => {
            const isSelected = state.paletteId === palette.id;
            const preview = isDark ? palette.dark : palette.light;

            return (
              <Pressable
                key={palette.id}
                style={[
                  styles.paletteCard,
                  {
                    backgroundColor: preview.surface,
                    borderColor: isSelected ? preview.accent : preview.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => {
                  mediumImpact();
                  setPalette(palette.id as PaletteId);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${palette.name} palette`}
                accessibilityState={{ selected: isSelected }}
              >
                {/* Mini preview */}
                <View style={[styles.previewHeader, { backgroundColor: preview.background }]}>
                  <View style={[styles.previewDot, { backgroundColor: preview.accent }]} />
                  <View style={[styles.previewDot, { backgroundColor: preview.textMuted, width: 24 }]} />
                </View>
                <View style={styles.previewBody}>
                  <View style={[styles.previewRow, { backgroundColor: preview.elevated }]}>
                    <View style={[styles.previewSmallDot, { backgroundColor: preview.text }]} />
                    <View style={[styles.previewSmallDot, { backgroundColor: preview.textMuted, width: 20 }]} />
                  </View>
                  <View style={[styles.previewButton, { backgroundColor: preview.accent }]} />
                  <View style={[styles.previewBadge, { backgroundColor: preview.prGold }]} />
                </View>

                {/* Label + check */}
                <View style={styles.paletteFooter}>
                  <Text variant="caption" style={{ color: preview.text }}>
                    {palette.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color={preview.accent} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Mode selector */}
        <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
          MODE
        </Text>
        <View style={styles.modeRow}>
          {modes.map((m) => {
            const isSelected = state.appearance === m.value;
            return (
              <Pressable
                key={m.value}
                style={[
                  styles.modeSegment,
                  isSelected && {
                    backgroundColor: theme.accent,
                  },
                ]}
                onPress={() => {
                  lightImpact();
                  setAppearance(m.value);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  variant="bodySm"
                  style={{
                    color: isSelected ? theme.onAccent : theme.text,
                    fontFamily: 'Inter_600SemiBold',
                  }}
                >
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
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
    paddingBottom: spacing['5xl'],
  },
  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
  },
  paletteRow: {
    gap: spacing.md,
    paddingRight: spacing.base,
  },
  paletteCard: {
    width: 120,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  previewBody: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
    borderRadius: 4,
    gap: spacing.xs,
  },
  previewSmallDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
  },
  previewButton: {
    height: 14,
    borderRadius: 4,
  },
  previewBadge: {
    width: 20,
    height: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  paletteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  modeSegment: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
