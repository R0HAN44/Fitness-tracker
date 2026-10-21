/**
 * SessionComparisonSheet — bottom sheet showing side-by-side comparison
 * of current vs previous session for an exercise:
 * - Volume delta (+kg / %)
 * - Max weight and estimated 1RM delta
 * - Set-by-set breakdown with +/- indicators
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Sheet } from '../components/Sheet';
import { Text } from '../typography/Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radii } from '../theme/tokens';
import { formatWeight } from '../../domain/units';
import { Ionicons } from '@expo/vector-icons';
import type { SessionComparisonResult } from '../../domain/comparison';

export interface SessionComparisonSheetProps {
  visible: boolean;
  onClose: () => void;
  exerciseName: string;
  comparison: (SessionComparisonResult & {
    currentSessionDate?: string;
    previousSessionDate?: string;
    currentSessionTitle?: string;
    previousSessionTitle?: string;
  }) | null;
}

export function SessionComparisonSheet({
  visible,
  onClose,
  exerciseName,
  comparison,
}: SessionComparisonSheetProps) {
  const { theme } = useTheme();

  if (!comparison) return null;

  const isPositiveVol = comparison.volumeDeltaKg > 0;
  const isZeroVol = comparison.volumeDeltaKg === 0;
  const volColor = isZeroVol ? theme.textMuted : isPositiveVol ? theme.success : theme.danger;

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Session Comparison"
      subtitle={exerciseName}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Session headers */}
        <View style={styles.sessionHeaderRow}>
          <View style={[styles.sessionBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="caption" color="textMuted">PREVIOUS</Text>
            <Text variant="bodySm" style={{ fontWeight: '700' }} numberOfLines={1}>
              {formatDate(comparison.previousSessionDate)}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={theme.textMuted} />
          <View style={[styles.sessionBadge, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
            <Text variant="caption" color="accent">CURRENT</Text>
            <Text variant="bodySm" style={{ fontWeight: '700' }} numberOfLines={1}>
              {formatDate(comparison.currentSessionDate)}
            </Text>
          </View>
        </View>

        {/* Delta Metrics Cards */}
        <View style={styles.metricsGrid}>
          {/* Volume Delta */}
          <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="caption" color="textMuted">VOLUME DELTA</Text>
            <Text variant="headingSm" style={{ color: volColor, fontWeight: '800' }} tabular>
              {isPositiveVol ? '+' : ''}{comparison.volumeDeltaKg} kg
            </Text>
            {comparison.volumePercentChange !== null && (
              <Text variant="caption" style={{ color: volColor }}>
                {comparison.volumePercentChange > 0 ? '+' : ''}{comparison.volumePercentChange}%
              </Text>
            )}
          </View>

          {/* Max Weight Delta */}
          <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="caption" color="textMuted">MAX WEIGHT</Text>
            <Text
              variant="headingSm"
              style={{
                color: comparison.maxWeightDeltaKg > 0 ? theme.success : comparison.maxWeightDeltaKg < 0 ? theme.danger : theme.text,
                fontWeight: '800',
              }}
              tabular
            >
              {comparison.maxWeightDeltaKg > 0 ? '+' : ''}{comparison.maxWeightDeltaKg} kg
            </Text>
            <Text variant="caption" color="textMuted" tabular>
              {comparison.previousMaxWeightKg} → {comparison.currentMaxWeightKg} kg
            </Text>
          </View>

          {/* Best 1RM Delta */}
          <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="caption" color="textMuted">EST. 1RM DELTA</Text>
            <Text
              variant="headingSm"
              style={{
                color: comparison.best1rmDeltaKg > 0 ? theme.success : comparison.best1rmDeltaKg < 0 ? theme.danger : theme.text,
                fontWeight: '800',
              }}
              tabular
            >
              {comparison.best1rmDeltaKg > 0 ? '+' : ''}{comparison.best1rmDeltaKg} kg
            </Text>
            <Text variant="caption" color="textMuted" tabular>
              {comparison.previousBest1rmKg} → {comparison.currentBest1rmKg} kg
            </Text>
          </View>
        </View>

        {/* Set-by-Set Comparison Table */}
        <View style={[styles.tableCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text variant="headingSm" style={{ marginBottom: spacing.sm }}>
            Set-by-Set Breakdown
          </Text>

          {/* Table Header */}
          <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
            <Text variant="caption" color="textMuted" style={{ width: 36 }}>SET</Text>
            <Text variant="caption" color="textMuted" style={{ flex: 1 }}>PREVIOUS</Text>
            <Text variant="caption" color="textMuted" style={{ flex: 1 }}>CURRENT</Text>
            <Text variant="caption" color="textMuted" style={{ width: 70, textAlign: 'right' }}>DELTA</Text>
          </View>

          {comparison.setComparisons.map((row) => {
            const hasDelta = row.weightDeltaKg != null || row.repsDelta != null;
            const isSetImprovement = (row.weightDeltaKg ?? 0) > 0 || ((row.weightDeltaKg ?? 0) === 0 && (row.repsDelta ?? 0) > 0);
            const isSetDecline = (row.weightDeltaKg ?? 0) < 0 || ((row.weightDeltaKg ?? 0) === 0 && (row.repsDelta ?? 0) < 0);

            return (
              <View key={row.setIndex} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                <Text variant="bodySm" style={{ width: 36, fontWeight: '700' }} tabular>
                  {row.setIndex}
                </Text>

                <View style={{ flex: 1 }}>
                  {row.previous ? (
                    <Text variant="bodySm" color="textMuted" tabular>
                      {row.previous.weightKg}kg × {row.previous.reps}
                    </Text>
                  ) : (
                    <Text variant="caption" color="textMuted">—</Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  {row.current ? (
                    <Text variant="bodySm" style={{ fontWeight: '700' }} tabular>
                      {row.current.weightKg}kg × {row.current.reps}
                    </Text>
                  ) : (
                    <Text variant="caption" color="textMuted">—</Text>
                  )}
                </View>

                <View style={{ width: 70, alignItems: 'flex-end' }}>
                  {hasDelta ? (
                    <Text
                      variant="bodySm"
                      style={{
                        fontWeight: '700',
                        color: isSetImprovement ? theme.success : isSetDecline ? theme.danger : theme.textMuted,
                      }}
                      tabular
                    >
                      {row.weightDeltaKg !== 0
                        ? `${(row.weightDeltaKg ?? 0) > 0 ? '+' : ''}${row.weightDeltaKg}kg`
                        : `${(row.repsDelta ?? 0) > 0 ? '+' : ''}${row.repsDelta} reps`}
                    </Text>
                  ) : (
                    <Text variant="caption" color="textMuted">New</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing['4xl'],
    gap: spacing.base,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sessionBadge: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  metricCard: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 2,
  },
  tableCard: {
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
});
