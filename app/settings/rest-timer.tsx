/**
 * Rest timer settings screen — default duration, sound, vibration.
 * Synchronized with SQLite singleton settings table.
 */

import React from 'react';
import { View, ScrollView, StyleSheet, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../src/ui/typography/Text';
import { NumberStepper } from '../../src/ui/components/NumberStepper';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { spacing, radii } from '../../src/ui/theme/tokens';
import { useSettingsStore } from '../../src/state/settingsStore';
import { lightImpact } from '../../src/lib/haptics';
import { formatDuration } from '../../src/domain/units';

const PRESET_DURATIONS = [30, 60, 90, 120, 180, 240, 300];

export default function RestTimerSettingsScreen() {
  const { theme } = useTheme();
  const defaultRestSeconds = useSettingsStore((s) => s.defaultRestSeconds);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);

  const setDefaultRestSeconds = useSettingsStore((s) => s.setDefaultRestSeconds);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const setHapticsEnabled = useSettingsStore((s) => s.setHapticsEnabled);

  const handleSelectPreset = (sec: number) => {
    lightImpact();
    setDefaultRestSeconds(sec);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Rest Timer Defaults',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={{ paddingRight: spacing.md }}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Default Duration Presets */}
        <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
          DEFAULT REST DURATION
        </Text>
        <View style={styles.presetsGrid}>
          {PRESET_DURATIONS.map((sec) => {
            const isSelected = defaultRestSeconds === sec;
            return (
              <Pressable
                key={sec}
                onPress={() => handleSelectPreset(sec)}
                style={[
                  styles.presetBtn,
                  {
                    backgroundColor: isSelected ? theme.accent : theme.surface,
                    borderColor: isSelected ? theme.accent : theme.border,
                  },
                ]}
              >
                <Text
                  variant="bodySm"
                  style={{
                    color: isSelected ? theme.onAccent : theme.text,
                    fontWeight: isSelected ? '700' : '500',
                  }}
                  tabular
                >
                  {formatDuration(sec)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Stepper adjustment */}
        <View
          style={[
            styles.stepperCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.stepperHeader}>
            <Text variant="body" style={{ fontWeight: '600' }}>
              Custom Duration
            </Text>
            <Text variant="headingSm" style={{ color: theme.accent, fontWeight: '800' }} tabular>
              {formatDuration(defaultRestSeconds)}
            </Text>
          </View>
          <NumberStepper
            value={defaultRestSeconds}
            onChange={(val) => setDefaultRestSeconds(Math.max(5, Math.min(600, Math.round(val))))}
            step={15}
            min={5}
            max={600}
            unit="s"
            size="md"
          />
        </View>

        {/* Notification preferences */}
        <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
          ALERTS ON TIMER COMPLETION
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View
            style={[
              styles.switchRow,
              { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
            ]}
          >
            <View style={styles.switchTextCol}>
              <Text variant="body" style={{ fontWeight: '600' }}>
                Vibration / Haptic
              </Text>
              <Text variant="caption" color="textMuted">
                Vibrate phone when rest time expires
              </Text>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={(val) => {
                lightImpact();
                setHapticsEnabled(val);
              }}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text variant="body" style={{ fontWeight: '600' }}>
                Audio Chime
              </Text>
              <Text variant="caption" color="textMuted">
                Play sound notification when rest time expires
              </Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={(val) => {
                lightImpact();
                setSoundEnabled(val);
              }}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Info callout */}
        <View
          style={[
            styles.infoBox,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.infoTitleRow}>
            <Ionicons name="information-circle-outline" size={18} color={theme.accent} />
            <Text variant="bodySm" style={{ fontWeight: '700', color: theme.accent }}>
              Per-Exercise Overrides
            </Text>
          </View>
          <Text variant="caption" color="textMuted" style={{ lineHeight: 18, marginTop: 4 }}>
            This duration serves as the default for new exercises. You can also customize individual rest durations for any specific exercise inside its Details sheet or Routine Editor.
          </Text>
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
    padding: spacing.base,
    paddingBottom: spacing['4xl'],
  },
  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  presetBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCard: {
    padding: spacing.base,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  stepperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
  },
  switchTextCol: {
    flex: 1,
    paddingRight: spacing.base,
  },
  infoBox: {
    marginTop: spacing.xl,
    padding: spacing.base,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
