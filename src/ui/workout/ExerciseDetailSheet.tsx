/**
 * ExerciseDetailSheet — comprehensive exercise details sheet with 3 tabs:
 *   1. About: muscle groups, equipment, exercise type, default rest timer, notes, actions
 *   2. History: past workout sessions with sets, 1RM, PR indicators, and session comparison
 *   3. Records: personal records board for this specific exercise
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert, Dimensions } from 'react-native';
import { Text } from '../typography/Text';
import { Sheet } from '../components/Sheet';
import { Button } from '../components/Button';
import { NumberStepper } from '../components/NumberStepper';
import { SegmentedControl } from '../components/SegmentedControl';
import { SessionComparisonSheet } from './SessionComparisonSheet';
import { LineChart } from '../charts/LineChart';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radii } from '../theme/tokens';
import { muscleGroupLabels, type MuscleGroup } from '../../constants/muscles';
import { equipmentLabels, type EquipmentType } from '../../constants/equipment';
import { formatDuration, formatWeight } from '../../domain/units';
import { filterExerciseProgression, type TimeRange } from '../../domain/stats';
import { lightImpact } from '../../lib/haptics';
import { Ionicons } from '@expo/vector-icons';
import type { ExerciseRow } from '../../db/queries/exercises';
import { useSettingsStore } from '../../state/settingsStore';
import {
  determineMovementType,
  getExerciseInstructions,
  getExerciseCommonMistakes,
} from '../../data/exerciseContent';
import {
  getExerciseHistory,
  getExercisePRs,
  getPastSessionComparisonForExercise,
  type ExerciseHistorySession,
  type ExercisePRItem,
} from '../../db/queries/workouts';

export interface ExerciseDetailSheetProps {
  exercise: ExerciseRow | null;
  visible: boolean;
  onClose: () => void;
  onEdit?: (exercise: ExerciseRow) => void;
  onArchiveToggle?: (exercise: ExerciseRow) => void;
  onRestSecondsChange?: (exerciseId: string, seconds: number) => void;
}

type TabType = 'about' | 'history' | 'records' | 'charts';
type ChartMetric = '1rm' | 'max_weight' | 'volume';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export function ExerciseDetailSheet({
  exercise,
  visible,
  onClose,
  onEdit,
  onArchiveToggle,
  onRestSecondsChange,
}: ExerciseDetailSheetProps) {
  const { theme } = useTheme();
  const weightUnit = useSettingsStore((s) => s.weightUnit);
  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [restSeconds, setRestSeconds] = useState(exercise?.defaultRestSeconds ?? 90);

  // History & Records state
  const [historyList, setHistoryList] = useState<ExerciseHistorySession[]>([]);
  const [prList, setPrList] = useState<ExercisePRItem[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<any>(null);

  // Charts state
  const [chartRange, setChartRange] = useState<TimeRange>('all');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('1rm');

  useEffect(() => {
    if (!visible || !exercise) return;
    setRestSeconds(exercise.defaultRestSeconds ?? 90);
    try {
      const history = getExerciseHistory(exercise.id);
      setHistoryList(history);
      const prs = getExercisePRs(exercise.id);
      setPrList(prs);
      const comp = getPastSessionComparisonForExercise(exercise.id);
      setComparisonData(comp);
    } catch (e) {
      console.error('Error loading exercise history/PRs:', e);
    }
  }, [visible, exercise]);

  if (!exercise) return null;

  const isArchived = exercise.deletedAt != null;
  const movementType =
    exercise.movementType ??
    determineMovementType(exercise.slug, exercise.name, exercise.primaryMuscle, exercise.exerciseType);

  const instructionsList: string[] = exercise.instructions
    ? (() => {
        try {
          return JSON.parse(exercise.instructions);
        } catch {
          return [];
        }
      })()
    : getExerciseInstructions(
        exercise.slug,
        exercise.name,
        exercise.primaryMuscle,
        exercise.equipment,
        exercise.exerciseType,
      );

  const mistakesList: string[] = exercise.commonMistakes
    ? (() => {
        try {
          return JSON.parse(exercise.commonMistakes);
        } catch {
          return [];
        }
      })()
    : getExerciseCommonMistakes(
        exercise.slug,
        exercise.name,
        exercise.primaryMuscle,
        exercise.equipment,
      );

  const secondaryMuscles: string[] = exercise.secondaryMuscles
    ? (() => {
        try {
          return JSON.parse(exercise.secondaryMuscles);
        } catch {
          return [];
        }
      })()
    : [];

  const handleRestChange = (newSecs: number) => {
    setRestSeconds(newSecs);
    if (onRestSecondsChange) {
      onRestSecondsChange(exercise.id, newSecs);
    }
  };

  const handleArchiveConfirm = () => {
    const actionText = isArchived ? 'Restore' : 'Archive';
    Alert.alert(
      `${actionText} Exercise?`,
      isArchived
        ? `Restore ${exercise.name} to the active exercise library?`
        : `Archiving ${exercise.name} hides it from active pickers while preserving past workout logs.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText,
          style: isArchived ? 'default' : 'destructive',
          onPress: () => {
            lightImpact();
            if (onArchiveToggle) {
              onArchiveToggle(exercise);
            }
            onClose();
          },
        },
      ],
    );
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      <Sheet
        visible={visible}
        onClose={onClose}
        title={exercise.name}
        subtitle={exercise.isCustom ? 'Custom Exercise' : 'Built-in Exercise'}
        containerStyle={{ height: Math.min(680, SCREEN_HEIGHT * 0.85) }}
      >
        <View style={styles.tabContainer}>
          <SegmentedControl
            options={[
              { label: 'About', value: 'about' },
              { label: 'History', value: 'history' },
              { label: 'Records', value: 'records' },
              { label: 'Charts', value: 'charts' },
            ]}
            value={activeTab}
            onChange={(val) => {
              lightImpact();
              setActiveTab(val as TabType);
            }}
          />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* ───────────────── ABOUT TAB ───────────────── */}
          {activeTab === 'about' && (
            <>
              {/* Badges */}
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
                  <Ionicons name="body-outline" size={14} color={theme.accent} />
                  <Text variant="caption" color="text" style={styles.badgeText}>
                    {muscleGroupLabels[exercise.primaryMuscle as MuscleGroup] ?? exercise.primaryMuscle}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
                  <Ionicons name="barbell-outline" size={14} color={theme.accent} />
                  <Text variant="caption" color="text" style={styles.badgeText}>
                    {equipmentLabels[exercise.equipment as EquipmentType] ?? exercise.equipment}
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: movementType === 'compound' ? theme.accent + '22' : theme.elevated,
                      borderColor: movementType === 'compound' ? theme.accent : theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={movementType === 'compound' ? 'layers-outline' : 'disc-outline'}
                    size={14}
                    color={movementType === 'compound' ? theme.accent : theme.textMuted}
                  />
                  <Text
                    variant="caption"
                    color={movementType === 'compound' ? 'accent' : 'text'}
                    style={[styles.badgeText, { fontWeight: '700' }]}
                  >
                    {movementType === 'compound' ? 'Compound' : 'Isolation'}
                  </Text>
                </View>
                {isArchived && (
                  <View style={[styles.badge, { backgroundColor: theme.danger + '22', borderColor: theme.danger }]}>
                    <Text variant="caption" style={{ color: theme.danger, fontWeight: '700' }}>
                      ARCHIVED
                    </Text>
                  </View>
                )}
              </View>

              {/* Info Grid */}
              <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text variant="headingSm" style={styles.sectionHeader}>
                  About Exercise
                </Text>

                <View style={styles.infoRow}>
                  <Text variant="bodySm" color="textMuted">Exercise Type</Text>
                  <Text variant="bodySm" color="text" style={{ textTransform: 'capitalize' }}>
                    {exercise.exerciseType.replace(/_/g, ' ')}
                  </Text>
                </View>

                {secondaryMuscles.length > 0 && (
                  <View style={styles.infoRow}>
                    <Text variant="bodySm" color="textMuted">Secondary Muscles</Text>
                    <Text variant="bodySm" color="text">
                      {secondaryMuscles
                        .map((m) => muscleGroupLabels[m as MuscleGroup] ?? m)
                        .join(', ')}
                    </Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text variant="bodySm" color="textMuted">Default Rest Timer</Text>
                  <Text variant="bodySm" color="accent" tabular>
                    {formatDuration(restSeconds)}
                  </Text>
                </View>

                {/* Rest stepper */}
                <View style={styles.stepperContainer}>
                  <NumberStepper
                    value={restSeconds}
                    onChange={handleRestChange}
                    step={15}
                    min={0}
                    max={600}
                    unit="s"
                  />
                </View>
              </View>

              {/* Step-by-Step Instructions */}
              {instructionsList.length > 0 && (
                <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="list-outline" size={18} color={theme.accent} />
                    <Text variant="headingSm" style={styles.sectionHeader}>
                      Instructions
                    </Text>
                  </View>
                  <View style={styles.stepsList}>
                    {instructionsList.map((step, idx) => (
                      <View key={idx} style={styles.stepRow}>
                        <View style={[styles.stepNumberBadge, { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}>
                          <Text variant="caption" color="accent" style={{ fontWeight: '700' }}>
                            {idx + 1}
                          </Text>
                        </View>
                        <Text variant="bodySm" color="text" style={{ flex: 1, lineHeight: 20 }}>
                          {step}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Common Mistakes & Form Cues */}
              {mistakesList.length > 0 && (
                <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="warning-outline" size={18} color={theme.setWarmup} />
                    <Text variant="headingSm" style={styles.sectionHeader}>
                      Common Mistakes & Cues
                    </Text>
                  </View>
                  <View style={styles.stepsList}>
                    {mistakesList.map((mistake, idx) => (
                      <View key={idx} style={styles.stepRow}>
                        <View style={[styles.stepNumberBadge, { backgroundColor: theme.setWarmup + '22', borderColor: theme.setWarmup }]}>
                          <Ionicons name="alert" size={12} color={theme.setWarmup} />
                        </View>
                        <Text variant="bodySm" color="text" style={{ flex: 1, lineHeight: 20 }}>
                          {mistake}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Notes */}
              {exercise.notes ? (
                <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text variant="headingSm" style={styles.sectionHeader}>
                    Additional Notes
                  </Text>
                  <Text variant="bodySm" color="text" style={{ lineHeight: 20 }}>
                    {exercise.notes}
                  </Text>
                </View>
              ) : null}

              {/* Custom exercise actions */}
              {exercise.isCustom && (
                <View style={styles.actionsContainer}>
                  {onEdit && (
                    <Button
                      title="Edit Exercise"
                      variant="secondary"
                      size="md"
                      icon={<Ionicons name="create-outline" size={18} color={theme.text} />}
                      onPress={() => {
                        onClose();
                        onEdit(exercise);
                      }}
                      fullWidth
                    />
                  )}

                  <Button
                    title={isArchived ? 'Restore Exercise' : 'Archive Exercise'}
                    variant={isArchived ? 'secondary' : 'danger'}
                    size="md"
                    icon={
                      <Ionicons
                        name={isArchived ? 'refresh-outline' : 'archive-outline'}
                        size={18}
                        color={isArchived ? theme.text : theme.danger}
                      />
                    }
                    onPress={handleArchiveConfirm}
                    fullWidth
                  />
                </View>
              )}
            </>
          )}

          {/* ───────────────── HISTORY TAB ───────────────── */}
          {activeTab === 'history' && (
            <>
              {comparisonData && (
                <Button
                  title="Compare Last 2 Sessions"
                  variant="secondary"
                  size="sm"
                  icon={<Ionicons name="git-compare-outline" size={16} color={theme.accent} />}
                  onPress={() => setShowComparison(true)}
                  fullWidth
                />
              )}

              {historyList.length === 0 ? (
                <View style={[styles.emptyContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Ionicons name="time-outline" size={36} color={theme.textMuted} />
                  <Text variant="headingSm" style={{ marginTop: 8 }}>No History Yet</Text>
                  <Text variant="bodySm" color="textMuted" center style={{ marginTop: 4 }}>
                    Perform this exercise in a completed workout to see your session logs here.
                  </Text>
                </View>
              ) : (
                historyList.map((session) => (
                  <View
                    key={session.workoutId}
                    style={[styles.historyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  >
                    <View style={styles.historyCardHeader}>
                      <View>
                        <Text variant="body" style={{ fontWeight: '700' }}>
                          {session.workoutTitle}
                        </Text>
                        <Text variant="caption" color="textMuted">
                          {formatDate(session.workoutDate)}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text variant="caption" color="accent" tabular style={{ fontWeight: '700' }}>
                          {formatWeight(session.totalVolumeKg, weightUnit)}
                        </Text>
                        <Text variant="caption" color="textMuted">
                          {session.sets.length} {session.sets.length === 1 ? 'set' : 'sets'}
                        </Text>
                      </View>
                    </View>

                    {/* Sets list */}
                    <View style={styles.setsList}>
                      {session.sets.map((s) => (
                        <View key={s.id} style={styles.historySetContainer}>
                          <View style={styles.historySetRow}>
                            <View style={styles.historySetLeft}>
                              <Text variant="caption" color="textMuted" style={styles.setNumber} tabular>
                                {s.setIndex}
                              </Text>
                              {s.setType !== 'normal' && (
                                <View
                                  style={[
                                    styles.setTypeMini,
                                    {
                                      backgroundColor:
                                        s.setType === 'warmup' ? theme.setWarmup + '22' :
                                        s.setType === 'drop' ? theme.setDrop + '22' : theme.setFailure + '22',
                                    },
                                  ]}
                                >
                                  <Text
                                    style={{
                                      fontSize: 9,
                                      fontWeight: '800',
                                      color:
                                        s.setType === 'warmup' ? theme.setWarmup :
                                        s.setType === 'drop' ? theme.setDrop : theme.setFailure,
                                    }}
                                  >
                                    {s.setType[0].toUpperCase()}
                                  </Text>
                                </View>
                              )}

                              <Text variant="bodySm" style={styles.setWeightReps} tabular numberOfLines={1}>
                                {s.weightKg != null ? `${formatWeight(s.weightKg, weightUnit)} × ` : ''}{s.reps ?? 0} reps
                                {s.rpe ? ` @ RPE ${s.rpe}` : ''}
                              </Text>
                            </View>

                            {s.estimated1rm > 0 && (
                              <Text variant="caption" color="textMuted" tabular style={styles.e1rmText}>
                                e1RM: {formatWeight(s.estimated1rm, weightUnit)}
                              </Text>
                            )}
                          </View>

                          {/* PR Badges row: wraps cleanly underneath, never squishing main metrics */}
                          {s.prBadges.length > 0 && (
                            <View style={styles.prBadgesRow}>
                              {s.prBadges.map((badge, bIdx) => (
                                <View key={bIdx} style={[styles.prBadge, { backgroundColor: theme.prGold + '22' }]}>
                                  <Text style={{ color: theme.prGold, fontSize: 10, fontWeight: '700' }}>
                                    🏆 {badge}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </>
          )}

          {/* ───────────────── RECORDS TAB ───────────────── */}
          {activeTab === 'records' && (
            <>
              {prList.length === 0 ? (
                <View style={[styles.emptyContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Ionicons name="trophy-outline" size={36} color={theme.textMuted} />
                  <Text variant="headingSm" style={{ marginTop: 8 }}>No Records Yet</Text>
                  <Text variant="bodySm" color="textMuted" center style={{ marginTop: 4 }}>
                    Log completed sets for this exercise to automatically track personal records.
                  </Text>
                </View>
              ) : (
                <View style={styles.prGrid}>
                  {prList.map((pr) => {
                    const label =
                      pr.recordType === 'max_weight' ? 'Max Weight' :
                      pr.recordType === 'best_1rm' ? 'Best Estimated 1RM' :
                      pr.recordType === 'best_set_volume' ? 'Best Set Volume' : 'Max Reps at Weight';

                    const valueDisplay =
                      pr.recordType === 'best_set_volume'
                        ? formatWeight(pr.value, weightUnit)
                        : pr.recordType === 'max_reps_at_weight'
                        ? `${pr.value} reps @ ${formatWeight(pr.weightKg, weightUnit)}`
                        : formatWeight(pr.value, weightUnit);

                    return (
                      <View
                        key={pr.id}
                        style={[styles.prCard, { backgroundColor: theme.surface, borderColor: theme.prGold }]}
                      >
                        <View style={styles.prCardHeader}>
                          <Text variant="caption" style={{ color: theme.prGold, fontWeight: '800' }}>
                            🏆 {label.toUpperCase()}
                          </Text>
                          <Text variant="caption" color="textMuted">
                            {formatDate(pr.achievedAt)}
                          </Text>
                        </View>
                        <Text variant="headingLg" style={{ color: theme.text, fontWeight: '900', marginTop: 4 }} tabular>
                          {valueDisplay}
                        </Text>
                        {pr.reps && pr.recordType !== 'max_reps_at_weight' ? (
                          <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                            Done for {pr.reps} {pr.reps === 1 ? 'rep' : 'reps'}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* ───────────────── CHARTS TAB ───────────────── */}
          {activeTab === 'charts' && (() => {
            const progressionData = filterExerciseProgression(
              historyList.map((h) => ({
                workoutDate: h.workoutDate,
                sets: h.sets.map((s) => ({
                  weightKg: s.weightKg,
                  reps: s.reps,
                  setType: s.setType,
                  isCompleted: s.isCompleted,
                })),
              })),
              chartRange,
            );

            const chartPoints = progressionData.map((pt) => ({
              label: pt.label,
              value:
                chartMetric === '1rm'
                  ? pt.best1rmKg
                  : chartMetric === 'max_weight'
                  ? pt.maxWeightKg
                  : pt.volumeKg,
            }));

            return (
              <View style={{ gap: spacing.base }}>
                {/* Metric Selector */}
                <SegmentedControl
                  options={[
                    { label: 'Est. 1RM', value: '1rm' },
                    { label: 'Max Wt', value: 'max_weight' },
                    { label: 'Volume', value: 'volume' },
                  ]}
                  value={chartMetric}
                  onChange={(m) => {
                    lightImpact();
                    setChartMetric(m as ChartMetric);
                  }}
                  size="sm"
                />

                {/* Range Selector */}
                <SegmentedControl
                  options={[
                    { label: '3 Months', value: '3m' },
                    { label: '1 Year', value: '1y' },
                    { label: 'All Time', value: 'all' },
                  ]}
                  value={chartRange}
                  onChange={(r) => {
                    lightImpact();
                    setChartRange(r as TimeRange);
                  }}
                  size="sm"
                />

                {/* Progression Chart Card */}
                <View style={[styles.prCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text variant="headingSm" style={{ fontWeight: '700', marginBottom: spacing.xs }}>
                    {chartMetric === '1rm' ? 'Estimated 1RM Progression' : chartMetric === 'max_weight' ? 'Max Weight Progression' : 'Volume per Session'}
                  </Text>
                  <LineChart
                    data={chartPoints}
                    height={200}
                    unit="kg"
                    emptyMessage="Log 2 or more workout sessions to see progression charts."
                  />
                </View>
              </View>
            );
          })()}
        </ScrollView>
      </Sheet>

      {/* Comparison Modal */}
      <SessionComparisonSheet
        visible={showComparison}
        onClose={() => setShowComparison(false)}
        exerciseName={exercise.name}
        comparison={comparisonData}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['5xl'],
    gap: spacing.base,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  badgeText: {
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  section: {
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  sectionHeader: {
    marginBottom: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  stepperContainer: {
    marginTop: spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepsList: {
    gap: spacing.sm,
    marginTop: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  actionsContainer: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  emptyContainer: {
    padding: spacing['2xl'],
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCard: {
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#33333333',
    paddingBottom: spacing.xs,
  },
  setsList: {
    gap: spacing.sm,
  },
  historySetContainer: {
    paddingVertical: 3,
  },
  historySetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historySetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  setNumber: {
    fontWeight: '700',
    width: 18,
  },
  setWeightReps: {
    fontWeight: '600',
    flex: 1,
  },
  e1rmText: {
    flexShrink: 0,
    marginLeft: 8,
  },
  prBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    paddingLeft: 26,
  },
  setTypeMini: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  prBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  prGrid: {
    gap: spacing.sm,
  },
  prCard: {
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  prCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
