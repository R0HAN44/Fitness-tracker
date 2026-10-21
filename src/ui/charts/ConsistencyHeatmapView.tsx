/**
 * ConsistencyHeatmapView — renders a contribution heatmap grid
 * showing training consistency over past weeks.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from '../typography/Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radii } from '../theme/tokens';
import type { ConsistencyHeatmapData } from '../../domain/stats';

export interface ConsistencyHeatmapViewProps {
  data: ConsistencyHeatmapData;
}

export function ConsistencyHeatmapView({ data }: ConsistencyHeatmapViewProps) {
  const { theme } = useTheme();

  const getCellColor = (intensity: number) => {
    switch (intensity) {
      case 1:
        return theme.accent + '55';
      case 2:
        return theme.accent + '99';
      case 3:
        return theme.accent;
      default:
        return theme.elevated;
    }
  };

  const dayLabels = ['M', '', 'W', '', 'F', '', 'S'];

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Header Summary */}
      <View style={styles.header}>
        <View>
          <Text variant="headingSm" style={{ fontWeight: '700' }}>
            Consistency Heatmap
          </Text>
          <Text variant="caption" color="textMuted">
            {data.totalWorkouts} workouts across {data.activeDaysCount} active days
          </Text>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text variant="caption" color="textMuted" style={{ fontSize: 10 }}>Less</Text>
          <View style={[styles.legendCell, { backgroundColor: theme.elevated }]} />
          <View style={[styles.legendCell, { backgroundColor: theme.accent + '55' }]} />
          <View style={[styles.legendCell, { backgroundColor: theme.accent + '99' }]} />
          <View style={[styles.legendCell, { backgroundColor: theme.accent }]} />
          <Text variant="caption" color="textMuted" style={{ fontSize: 10 }}>More</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Day-of-week labels */}
        <View style={styles.dayLabelsCol}>
          {dayLabels.map((lbl, idx) => (
            <Text key={idx} variant="caption" color="textMuted" style={styles.dayLabelText}>
              {lbl}
            </Text>
          ))}
        </View>

        {/* Weeks Columns */}
        <View style={styles.grid}>
          {/* Month labels row */}
          <View style={styles.monthLabelsRow}>
            {data.monthLabels.map((ml, idx) => (
              <Text
                key={idx}
                variant="caption"
                color="textMuted"
                style={[
                  styles.monthLabelText,
                  { left: ml.columnIndex * 14 },
                ]}
              >
                {ml.monthName}
              </Text>
            ))}
          </View>

          {/* Matrix Columns */}
          <View style={styles.columnsRow}>
            {data.columns.map((col, colIdx) => (
              <View key={colIdx} style={styles.column}>
                {col.map((day, rowIdx) => (
                  <View
                    key={rowIdx}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: getCellColor(day.intensity),
                        borderColor: theme.border,
                      },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  scrollContent: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
  },
  dayLabelsCol: {
    width: 16,
    paddingTop: 18,
    gap: 3,
  },
  dayLabelText: {
    fontSize: 9,
    height: 11,
    textAlign: 'center',
  },
  grid: {
    position: 'relative',
  },
  monthLabelsRow: {
    height: 16,
    position: 'relative',
    marginBottom: 2,
  },
  monthLabelText: {
    position: 'absolute',
    fontSize: 9,
  },
  columnsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  column: {
    gap: 3,
  },
  cell: {
    width: 11,
    height: 11,
    borderRadius: 2,
  },
});
