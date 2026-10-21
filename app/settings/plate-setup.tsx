/**
 * Plate Setup settings screen — barbell weight and available plate denominations.
 * Controls the inventory used by the Plate Calculator sheet across all workouts.
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
import { toDisplayWeight, toDatabaseWeight, formatWeight } from '../../src/domain/units';

const BARBELL_PRESETS_KG = [
  { label: 'Olympic Bar (Men)', kg: 20.0, lb: 45 },
  { label: 'Olympic Bar (Women)', kg: 15.0, lb: 35 },
  { label: 'Technique / EZ Bar', kg: 10.0, lb: 25 },
  { label: 'Short / Studio Bar', kg: 7.5, lb: 15 },
];

const STANDARD_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];

export default function PlateSetupSettingsScreen() {
  const { theme } = useTheme();
  const weightUnit = useSettingsStore((s) => s.weightUnit);
  const barbellWeightKg = useSettingsStore((s) => s.barbellWeightKg);
  const availablePlatesKg = useSettingsStore((s) => s.availablePlatesKg);

  const setBarbellWeightKg = useSettingsStore((s) => s.setBarbellWeightKg);
  const setAvailablePlatesKg = useSettingsStore((s) => s.setAvailablePlatesKg);

  const isKg = weightUnit === 'kg';
  const displayBarWeight = toDisplayWeight(barbellWeightKg, weightUnit, 0.5);

  const handleSelectBarPreset = (kg: number) => {
    lightImpact();
    setBarbellWeightKg(kg);
  };

  const handleTogglePlate = (plateKg: number) => {
    lightImpact();
    const current = [...(availablePlatesKg || [])];
    const idx = current.indexOf(plateKg);
    let next: number[];
    if (idx >= 0) {
      next = current.filter((p) => p !== plateKg);
    } else {
      next = [...current, plateKg].sort((a, b) => b - a);
    }
    setAvailablePlatesKg(next);
  };

  const handleSelectAllPlates = () => {
    lightImpact();
    setAvailablePlatesKg([...STANDARD_PLATES_KG]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Plate Calculator Setup',
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
        {/* Barbell Weight Presets */}
        <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
          BARBELL WEIGHT
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {BARBELL_PRESETS_KG.map((bar, index) => {
            const isSelected = Math.abs(barbellWeightKg - bar.kg) < 0.1;
            const isLast = index === BARBELL_PRESETS_KG.length - 1;

            return (
              <Pressable
                key={bar.kg}
                onPress={() => handleSelectBarPreset(bar.kg)}
                style={[
                  styles.optionRow,
                  !isLast && {
                    borderBottomColor: theme.border,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={styles.optionTextCol}>
                  <Text variant="body" style={{ fontWeight: '600' }}>
                    {bar.label}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {isKg ? `${bar.kg} kg (${bar.lb} lb)` : `${bar.lb} lb (${bar.kg} kg)`}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioCircle,
                    {
                      borderColor: isSelected ? theme.accent : theme.border,
                      backgroundColor: isSelected ? theme.accent : 'transparent',
                    },
                  ]}
                >
                  {isSelected && <Ionicons name="checkmark" size={14} color={theme.onAccent} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Custom Barbell Weight Stepper */}
        <View
          style={[
            styles.stepperCard,
            { backgroundColor: theme.surface, borderColor: theme.border, marginTop: spacing.md },
          ]}
        >
          <View style={styles.stepperHeader}>
            <Text variant="body" style={{ fontWeight: '600' }}>
              Custom Barbell Weight
            </Text>
            <Text variant="headingSm" style={{ color: theme.accent, fontWeight: '800' }} tabular>
              {displayBarWeight} {weightUnit}
            </Text>
          </View>
          <NumberStepper
            value={displayBarWeight}
            onChange={(val) => {
              const kg = toDatabaseWeight(val, weightUnit);
              setBarbellWeightKg(Math.max(1, Math.round(kg * 10) / 10));
            }}
            step={isKg ? 2.5 : 5}
            min={1}
            max={50}
            unit={weightUnit}
            size="md"
          />
        </View>

        {/* Available Plates Checklist */}
        <View style={styles.sectionHeaderRow}>
          <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
            AVAILABLE PLATES IN YOUR GYM
          </Text>
          <Pressable onPress={handleSelectAllPlates} hitSlop={6}>
            <Text variant="caption" style={{ color: theme.accent, fontWeight: '700' }}>
              Select All
            </Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {STANDARD_PLATES_KG.map((plateKg, idx) => {
            const isEnabled = availablePlatesKg?.includes(plateKg) ?? true;
            const isLast = idx === STANDARD_PLATES_KG.length - 1;
            const displayPlate = toDisplayWeight(plateKg, weightUnit, 0.25);

            return (
              <View
                key={plateKg}
                style={[
                  styles.optionRow,
                  !isLast && {
                    borderBottomColor: theme.border,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={styles.optionTextCol}>
                  <Text variant="body" style={{ fontWeight: '700' }}>
                    {displayPlate} {weightUnit}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {isKg
                      ? `${plateKg} kg · ${(plateKg * 2.20462).toFixed(1)} lb`
                      : `${displayPlate} lb · ${plateKg} kg`}
                  </Text>
                </View>
                <Switch
                  value={isEnabled}
                  onValueChange={() => handleTogglePlate(plateKg)}
                  trackColor={{ false: theme.border, true: theme.accent }}
                  thumbColor="#ffffff"
                />
              </View>
            );
          })}
        </View>

        {/* Info callout */}
        <View
          style={[
            styles.infoBox,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.infoTitleRow}>
            <Ionicons name="disc-outline" size={18} color={theme.accent} />
            <Text variant="bodySm" style={{ fontWeight: '700', color: theme.accent }}>
              Greedy Sleeve Calculation
            </Text>
          </View>
          <Text variant="caption" color="textMuted" style={{ lineHeight: 18, marginTop: 4 }}>
            When calculating plates during barbell exercises, Ironlog's sleeve optimizer only utilizes the active plate sizes checked above to calculate exact pair loading per side.
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
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
