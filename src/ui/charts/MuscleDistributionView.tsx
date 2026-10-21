/**
 * MuscleDistributionView — displays muscle group set count distribution
 * with percentage bars.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../typography/Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radii } from '../theme/tokens';
import type { MuscleDistributionItem } from '../../domain/stats';

export interface MuscleDistributionViewProps {
  distribution: MuscleDistributionItem[];
  title?: string;
  subtitle?: string;
}

export function MuscleDistributionView({
  distribution,
  title = 'Muscle Distribution',
  subtitle = 'Last 90 days',
}: MuscleDistributionViewProps) {
  const { theme } = useTheme();

  if (distribution.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text variant="headingSm" style={{ fontWeight: '700' }}>{title}</Text>
        <Text variant="caption" color="textMuted">{subtitle}</Text>
        <View style={styles.emptyContainer}>
          <Text variant="caption" color="textMuted">No completed sets in this time range.</Text>
        </View>
      </View>
    );
  }

  const totalSets = distribution.reduce((sum, d) => sum + d.setsCount, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View>
          <Text variant="headingSm" style={{ fontWeight: '700' }}>{title}</Text>
          <Text variant="caption" color="textMuted">{subtitle}</Text>
        </View>
        <Text variant="caption" color="accent" style={{ fontWeight: '700' }}>
          {totalSets} total sets
        </Text>
      </View>

      <View style={styles.list}>
        {distribution.map((item) => (
          <View key={item.muscle} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text variant="bodySm" style={{ fontWeight: '600' }}>
                {item.label}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text variant="caption" color="textMuted" tabular>
                  {item.setsCount} {item.setsCount === 1 ? 'set' : 'sets'}
                </Text>
                <Text variant="bodySm" color="accent" style={{ fontWeight: '700', width: 44, textAlign: 'right' }} tabular>
                  {item.percentage}%
                </Text>
              </View>
            </View>

            {/* Progress track */}
            <View style={[styles.track, { backgroundColor: theme.elevated }]}>
              <View
                style={[
                  styles.fill,
                  {
                    backgroundColor: theme.accent,
                    width: `${Math.min(100, Math.max(3, item.percentage))}%`,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
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
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    gap: 4,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  emptyContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
