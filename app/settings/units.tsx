/**
 * Units settings screen — switch between kg/lb and cm/in.
 * Updates the app immediately and persists to SQLite singleton settings.
 */

import React from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../src/ui/typography/Text';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { spacing, radii } from '../../src/ui/theme/tokens';
import { useSettingsStore } from '../../src/state/settingsStore';
import { lightImpact } from '../../src/lib/haptics';

export default function UnitsSettingsScreen() {
  const { theme } = useTheme();
  const weightUnit = useSettingsStore((s) => s.weightUnit);
  const lengthUnit = useSettingsStore((s) => s.lengthUnit);
  const setWeightUnit = useSettingsStore((s) => s.setWeightUnit);
  const setLengthUnit = useSettingsStore((s) => s.setLengthUnit);

  const handleSelectWeight = (unit: 'kg' | 'lb') => {
    lightImpact();
    setWeightUnit(unit);
  };

  const handleSelectLength = (unit: 'cm' | 'in') => {
    lightImpact();
    setLengthUnit(unit);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Units of Measurement',
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
        {/* Weight Unit */}
        <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
          WEIGHT
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Pressable
            onPress={() => handleSelectWeight('kg')}
            style={[
              styles.optionRow,
              { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
            ]}
          >
            <View style={styles.optionTextCol}>
              <Text variant="body" style={{ fontWeight: '600' }}>
                Kilograms (kg)
              </Text>
              <Text variant="caption" color="textMuted">
                Metric system · 1 kg = 2.205 lb
              </Text>
            </View>
            <View
              style={[
                styles.radioCircle,
                {
                  borderColor: weightUnit === 'kg' ? theme.accent : theme.border,
                  backgroundColor: weightUnit === 'kg' ? theme.accent : 'transparent',
                },
              ]}
            >
              {weightUnit === 'kg' && <Ionicons name="checkmark" size={14} color={theme.onAccent} />}
            </View>
          </Pressable>

          <Pressable
            onPress={() => handleSelectWeight('lb')}
            style={styles.optionRow}
          >
            <View style={styles.optionTextCol}>
              <Text variant="body" style={{ fontWeight: '600' }}>
                Pounds (lb)
              </Text>
              <Text variant="caption" color="textMuted">
                Imperial system · 1 lb = 0.454 kg
              </Text>
            </View>
            <View
              style={[
                styles.radioCircle,
                {
                  borderColor: weightUnit === 'lb' ? theme.accent : theme.border,
                  backgroundColor: weightUnit === 'lb' ? theme.accent : 'transparent',
                },
              ]}
            >
              {weightUnit === 'lb' && <Ionicons name="checkmark" size={14} color={theme.onAccent} />}
            </View>
          </Pressable>
        </View>

        {/* Length Unit */}
        <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
          BODY MEASUREMENTS
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Pressable
            onPress={() => handleSelectLength('cm')}
            style={[
              styles.optionRow,
              { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
            ]}
          >
            <View style={styles.optionTextCol}>
              <Text variant="body" style={{ fontWeight: '600' }}>
                Centimeters (cm)
              </Text>
              <Text variant="caption" color="textMuted">
                Metric system · 1 in = 2.54 cm
              </Text>
            </View>
            <View
              style={[
                styles.radioCircle,
                {
                  borderColor: lengthUnit === 'cm' ? theme.accent : theme.border,
                  backgroundColor: lengthUnit === 'cm' ? theme.accent : 'transparent',
                },
              ]}
            >
              {lengthUnit === 'cm' && <Ionicons name="checkmark" size={14} color={theme.onAccent} />}
            </View>
          </Pressable>

          <Pressable
            onPress={() => handleSelectLength('in')}
            style={styles.optionRow}
          >
            <View style={styles.optionTextCol}>
              <Text variant="body" style={{ fontWeight: '600' }}>
                Inches (in)
              </Text>
              <Text variant="caption" color="textMuted">
                Imperial system · 1 in = 2.54 cm
              </Text>
            </View>
            <View
              style={[
                styles.radioCircle,
                {
                  borderColor: lengthUnit === 'in' ? theme.accent : theme.border,
                  backgroundColor: lengthUnit === 'in' ? theme.accent : 'transparent',
                },
              ]}
            >
              {lengthUnit === 'in' && <Ionicons name="checkmark" size={14} color={theme.onAccent} />}
            </View>
          </Pressable>
        </View>

        {/* Explanatory callout */}
        <View
          style={[
            styles.infoBox,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.infoTitleRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color={theme.accent} />
            <Text variant="bodySm" style={{ fontWeight: '700', color: theme.accent }}>
              Lossless Unit Precision
            </Text>
          </View>
          <Text variant="caption" color="textMuted" style={{ lineHeight: 18, marginTop: 4 }}>
            Ironlog stores all weights natively in kilograms (kg) and all body measurements in centimeters (cm) in your local SQLite database. Switching units converts all display values and input steppers dynamically without altering your raw data or causing precision drift.
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
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
  },
  optionTextCol: {
    flex: 1,
    paddingRight: spacing.base,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
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
