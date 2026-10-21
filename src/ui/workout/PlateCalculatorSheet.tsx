/**
 * PlateCalculatorSheet — interactive barbell plate calculator bottom sheet.
 *
 * Shows barbell sleeve visualization and exact plates needed per side.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Sheet } from '../components/Sheet';
import { Text } from '../typography/Text';
import { NumberStepper } from '../components/NumberStepper';
import { SegmentedControl } from '../components/SegmentedControl';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radii } from '../theme/tokens';
import {
  calculatePlates,
  DEFAULT_PLATES_KG,
  DEFAULT_PLATES_LB,
  DEFAULT_BARBELL_KG,
  DEFAULT_BARBELL_LB,
} from '../../lib/plateCalculator';
import { toDisplayWeight, toDatabaseWeight, type WeightUnit } from '../../lib/units';
import { useSettingsStore } from '../../state/settingsStore';

export interface PlateCalculatorSheetProps {
  visible: boolean;
  onClose: () => void;
  initialWeightKg?: number;
  weightUnit?: WeightUnit;
}

export function PlateCalculatorSheet({
  visible,
  onClose,
  initialWeightKg = 60,
  weightUnit,
}: PlateCalculatorSheetProps) {
  const { theme } = useTheme();
  const storeWeightUnit = useSettingsStore((s) => s.weightUnit);
  const storeBarbellKg = useSettingsStore((s) => s.barbellWeightKg);
  const storePlatesKg = useSettingsStore((s) => s.availablePlatesKg);

  const activeUnit = weightUnit ?? storeWeightUnit ?? 'kg';
  const [unit, setUnit] = useState<WeightUnit>(activeUnit);

  const initialDisplay = toDisplayWeight(initialWeightKg, unit, 0.5);
  const [targetWeight, setTargetWeight] = useState(initialDisplay);

  React.useEffect(() => {
    if (visible) {
      setUnit(activeUnit);
      setTargetWeight(toDisplayWeight(initialWeightKg, activeUnit, 0.5));
    }
  }, [visible, initialWeightKg, activeUnit]);

  const isKg = unit === 'kg';
  const barbellWeight = isKg
    ? storeBarbellKg || DEFAULT_BARBELL_KG
    : Math.round((storeBarbellKg || DEFAULT_BARBELL_KG) * 2.20462262 * 2) / 2;

  const availablePlates = isKg
    ? (storePlatesKg && storePlatesKg.length > 0 ? storePlatesKg : DEFAULT_PLATES_KG)
    : (storePlatesKg && storePlatesKg.length > 0
        ? storePlatesKg.map((p) => Math.round(p * 2.20462262 * 2) / 2)
        : DEFAULT_PLATES_LB);

  const result = calculatePlates(targetWeight, {
    barbellWeight,
    availablePlates,
  });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Plate Calculator"
      subtitle={`Barbell: ${barbellWeight} ${unit}`}
    >
      <View style={styles.container}>
        {/* Unit switch */}
        <View style={styles.unitRow}>
          <SegmentedControl
            options={[
              { label: 'kg', value: 'kg' },
              { label: 'lb', value: 'lb' },
            ]}
            value={unit}
            onChange={(u) => {
              const converted = u === 'lb' ? targetWeight * 2.20462 : targetWeight / 2.20462;
              setUnit(u);
              setTargetWeight(Math.round(converted * 2) / 2);
            }}
            size="sm"
          />
        </View>

        {/* Target weight stepper */}
        <View style={styles.stepperContainer}>
          <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
            TARGET WEIGHT
          </Text>
          <NumberStepper
            value={targetWeight}
            onChange={setTargetWeight}
            step={isKg ? 2.5 : 5}
            min={barbellWeight}
            unit={unit}
            size="lg"
          />
        </View>

        {/* Sleeve visualization */}
        <View style={[styles.visualContainer, { backgroundColor: theme.surface }]}>
          <Text variant="caption" color="textMuted" style={styles.visualTitle}>
            EACH SIDE ({result.weightPerSide} {unit})
          </Text>

          <View style={styles.sleeveRow}>
            {/* Barbell collar */}
            <View style={[styles.collar, { backgroundColor: theme.border }]} />

            {/* Sleeve bar */}
            <View style={[styles.sleeveBar, { backgroundColor: theme.border }]}>
              {/* Stacked plates */}
              {result.plateSequence.length === 0 ? (
                <Text variant="caption" color="textMuted" style={styles.emptyBarText}>
                  Empty Barbell
                </Text>
              ) : (
                result.plateSequence.map((plate, idx) => {
                  const plateHeight = getPlateHeight(plate, isKg);
                  const plateColor = getPlateColor(plate, isKg, theme.accent);

                  return (
                    <View
                      key={`${plate}-${idx}`}
                      style={[
                        styles.plateVisual,
                        {
                          height: plateHeight,
                          backgroundColor: plateColor,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Text
                        variant="caption"
                        style={styles.plateText}
                      >
                        {plate}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {/* Breakdown summary */}
          <View style={styles.breakdownRow}>
            {result.platesPerSide.map((p) => (
              <View
                key={p.weight}
                style={[
                  styles.plateChip,
                  { backgroundColor: theme.elevated, borderColor: theme.border },
                ]}
              >
                <Text variant="caption" color="accent" style={{ fontWeight: '700' }}>
                  {p.count}x
                </Text>
                <Text variant="caption" color="text" style={{ marginLeft: 4 }}>
                  {p.weight} {unit}
                </Text>
              </View>
            ))}
          </View>

          {!result.isExact && (
            <Text variant="caption" color="danger" center style={styles.inexactWarning}>
              Off by {result.remainingWeight} {unit} with available plates.
            </Text>
          )}
        </View>
      </View>
    </Sheet>
  );
}

function getPlateHeight(weight: number, isKg: boolean): number {
  const maxWeight = isKg ? 25 : 45;
  const ratio = Math.max(0.4, Math.min(1, weight / maxWeight));
  return 36 + ratio * 44;
}

function getPlateColor(weight: number, isKg: boolean, accent: string): string {
  // Olympic standard color hints (subtle)
  if (isKg) {
    if (weight === 25) return '#EF4444'; // Red
    if (weight === 20) return '#3B82F6'; // Blue
    if (weight === 15) return '#F59E0B'; // Yellow
    if (weight === 10) return '#10B981'; // Green
    if (weight === 5) return '#6B7280';  // White/Grey
  } else {
    if (weight === 45) return '#3B82F6';
    if (weight === 35) return '#F59E0B';
    if (weight === 25) return '#10B981';
  }
  return accent;
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.lg,
  },
  unitRow: {
    marginBottom: spacing.base,
  },
  stepperContainer: {
    marginBottom: spacing.base,
  },
  sectionLabel: {
    marginBottom: spacing.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  visualContainer: {
    borderRadius: radii.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  visualTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  sleeveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 100,
    marginVertical: spacing.sm,
  },
  collar: {
    width: 14,
    height: 70,
    borderRadius: radii.sm,
  },
  sleeveBar: {
    flex: 1,
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    borderRadius: 2,
  },
  plateVisual: {
    width: 22,
    marginRight: 4,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '800',
    transform: [{ rotate: '-90deg' }],
  },
  emptyBarText: {
    marginLeft: spacing.base,
  },
  breakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  plateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  inexactWarning: {
    marginTop: spacing.sm,
  },
});
