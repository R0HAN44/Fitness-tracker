/**
 * Local Strength Standards & Ranking Screen.
 *
 * Evaluates primary compound lifts against validated empirical strength standards
 * (ExRx / Symmetric Strength) normalized to the user's logged bodyweight.
 * 100% offline, private, and calculated in real-time.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../src/ui/typography/Text';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { spacing, radii, layout, typography } from '../../src/ui/theme/tokens';
import { formatWeight } from '../../src/domain/units';
import { lightImpact } from '../../src/lib/haptics';
import { getLocalStrengthRanking } from '../../src/db/queries/reports';
import {
  STRENGTH_TIER_LABELS,
  STRENGTH_TIER_ORDER,
  type StrengthRankingReport,
  type StrengthTier,
} from '../../src/domain/reports';

export default function StrengthRankingScreen() {
  const { theme } = useTheme();

  const [ranking, setRanking] = useState<StrengthRankingReport | null>(null);

  const loadData = useCallback(() => {
    try {
      const data = getLocalStrengthRanking();
      setRanking(data);
    } catch (e) {
      console.error('Error loading strength ranking:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const getTierColor = (tier: StrengthTier) => {
    switch (tier) {
      case 'elite':
        return theme.prGold;
      case 'advanced':
        return theme.accent;
      case 'intermediate':
        return theme.success;
      case 'novice':
        return theme.setDrop;
      default:
        return theme.textMuted;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            lightImpact();
            router.back();
          }}
          hitSlop={8}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text variant="headingLg" style={{ fontWeight: '800' }}>
          Strength Standards
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {ranking && (
          <>
            {/* Overall Tier Hero Card */}
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: getTierColor(ranking.overallTier),
                },
              ]}
            >
              <View style={styles.heroTop}>
                <View
                  style={[
                    styles.tierPill,
                    {
                      backgroundColor: getTierColor(ranking.overallTier) + '22',
                      borderColor: getTierColor(ranking.overallTier),
                    },
                  ]}
                >
                  <Ionicons name="shield-checkmark" size={14} color={getTierColor(ranking.overallTier)} />
                  <Text
                    variant="caption"
                    style={{
                      color: getTierColor(ranking.overallTier),
                      fontWeight: '800',
                      textTransform: 'uppercase',
                    }}
                  >
                    {STRENGTH_TIER_LABELS[ranking.overallTier]} LIFTER
                  </Text>
                </View>

                <Text variant="caption" color="textMuted">
                  Local Classification
                </Text>
              </View>

              <Text variant="displaySm" style={{ fontWeight: '900', marginTop: spacing.xs }}>
                {STRENGTH_TIER_LABELS[ranking.overallTier]} Rank
              </Text>

              <Text variant="bodySm" color="textMuted" style={{ lineHeight: 18 }}>
                Strength standards calculated across your primary barbell compound lifts relative to
                bodyweight.
              </Text>

              {/* Tier Step Indicators */}
              <View style={styles.stepIndicatorRow}>
                {STRENGTH_TIER_ORDER.map((tier) => {
                  const isCurrent = ranking.overallTier === tier;
                  const isPassed =
                    STRENGTH_TIER_ORDER.indexOf(tier) <=
                    STRENGTH_TIER_ORDER.indexOf(ranking.overallTier);

                  return (
                    <View key={tier} style={styles.stepItem}>
                      <View
                        style={[
                          styles.stepBar,
                          {
                            backgroundColor: isPassed
                              ? getTierColor(ranking.overallTier)
                              : theme.elevated,
                          },
                        ]}
                      />
                      <Text
                        variant="caption"
                        style={{
                          fontSize: 9,
                          fontWeight: isCurrent ? '800' : '500',
                          color: isCurrent ? theme.text : theme.textMuted,
                          marginTop: 4,
                        }}
                      >
                        {STRENGTH_TIER_LABELS[tier].substring(0, 3)}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* Big 3 Total & BW Row */}
              <View style={styles.summaryRow}>
                <View>
                  <Text variant="caption" color="textMuted">BIG 3 TOTAL (SBD)</Text>
                  <Text variant="headingSm" color="accent" style={{ fontWeight: '800' }}>
                    {formatWeight(ranking.bigThreeTotalKg, 'kg')}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="caption" color="textMuted">BODYWEIGHT</Text>
                  <Text variant="headingSm" color="text" style={{ fontWeight: '800' }}>
                    {ranking.userBodyweightKg} kg{' '}
                    {ranking.isDefaultBodyweight && (
                      <Text variant="caption" color="textMuted" style={{ fontSize: 10 }}>
                        (default)
                      </Text>
                    )}
                  </Text>
                </View>
              </View>
            </View>

            {/* Bodyweight Hint Card */}
            {ranking.isDefaultBodyweight && (
              <Pressable
                onPress={() => {
                  lightImpact();
                  router.push('/measurements' as any);
                }}
                style={[
                  styles.hintCard,
                  { backgroundColor: theme.elevated, borderColor: theme.border },
                ]}
              >
                <Ionicons name="information-circle-outline" size={20} color={theme.accent} />
                <View style={{ flex: 1 }}>
                  <Text variant="caption" color="text" style={{ fontWeight: '600' }}>
                    Tip: Log your bodyweight
                  </Text>
                  <Text variant="caption" color="textMuted">
                    Standards are calibrated to 75 kg. Log your weight in Body Measurements for
                    exact multipliers.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </Pressable>
            )}

            {/* Lifts Breakdown List */}
            <View style={styles.liftsSection}>
              <Text variant="headingSm" style={{ fontWeight: '700' }}>
                Primary Lifts Breakdown
              </Text>

              {ranking.lifts.map((lift) => {
                const tierColor = getTierColor(lift.currentTier);

                return (
                  <View
                    key={lift.key}
                    style={[
                      styles.liftCard,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}
                  >
                    <View style={styles.liftHeader}>
                      <View style={{ flex: 1 }}>
                        <Text variant="body" style={{ fontWeight: '700' }}>
                          {lift.name}
                        </Text>
                        <Text variant="caption" color="textMuted">
                          Best 1RM: {formatWeight(lift.best1rmKg, 'kg')} ·{' '}
                          <Text variant="caption" color="text" style={{ fontWeight: '700' }}>
                            {lift.bodyweightRatio}x BW
                          </Text>
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.tierBadge,
                          {
                            backgroundColor: tierColor + '22',
                            borderColor: tierColor,
                          },
                        ]}
                      >
                        <Text
                          variant="caption"
                          style={{
                            color: tierColor,
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            fontSize: 10,
                          }}
                        >
                          {STRENGTH_TIER_LABELS[lift.currentTier]}
                        </Text>
                      </View>
                    </View>

                    {/* Progress to next tier */}
                    {lift.nextTier && (
                      <View style={styles.progressContainer}>
                        <View style={styles.progressLabelRow}>
                          <Text variant="caption" color="textMuted">
                            Progress to {STRENGTH_TIER_LABELS[lift.nextTier]} (
                            {lift.tierThresholdsKg[lift.nextTier]} kg)
                          </Text>
                          <Text variant="caption" style={{ color: tierColor, fontWeight: '700' }}>
                            {lift.progressToNextTierPercent}%
                          </Text>
                        </View>
                        <View style={[styles.progressTrack, { backgroundColor: theme.elevated }]}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                backgroundColor: tierColor,
                                width: `${lift.progressToNextTierPercent}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    )}

                    {/* Standards Table */}
                    <View style={[styles.standardsTable, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
                      {STRENGTH_TIER_ORDER.map((t) => {
                        const isCurrent = lift.currentTier === t;
                        return (
                          <View key={t} style={styles.tableCol}>
                            <Text
                              variant="caption"
                              style={{
                                fontSize: 9,
                                fontWeight: isCurrent ? '800' : '500',
                                color: isCurrent ? theme.text : theme.textMuted,
                              }}
                            >
                              {STRENGTH_TIER_LABELS[t].substring(0, 3)}
                            </Text>
                            <Text
                              variant="caption"
                              style={{
                                fontSize: 10,
                                fontWeight: isCurrent ? '800' : '600',
                                color: isCurrent ? tierColor : theme.textMuted,
                              }}
                            >
                              {lift.tierThresholdsKg[t]}kg
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.base,
    gap: spacing.base,
    paddingBottom: spacing['4xl'],
  },
  heroCard: {
    padding: spacing.base,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    gap: spacing.sm,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.xs,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepBar: {
    height: 4,
    width: '100%',
    borderRadius: radii.full,
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  liftsSection: {
    gap: spacing.md,
  },
  liftCard: {
    padding: spacing.base,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
  },
  liftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  progressContainer: {
    gap: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTrack: {
    height: 6,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  standardsTable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  tableCol: {
    alignItems: 'center',
    gap: 2,
  },
});
