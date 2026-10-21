/**
 * ExerciseDetailSheet — comprehensive exercise details sheet with 3 tabs:
 *   1. About: muscle groups, equipment, exercise type, default rest timer, notes, actions
 *   2. History: past workout sessions with sets, 1RM, PR indicators, and session comparison
 *   3. Records: personal records board for this specific exercise
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Text } from '../typography/Text';
import { Sheet } from '../components/Sheet';
import { Button } from '../components/Button';
import { NumberStepper } from '../components/NumberStepper';
import { SegmentedControl } from '../components/SegmentedControl';
import { SessionComparisonSheet } from './SessionComparisonSheet';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radii } from '../theme/tokens';
import { muscleGroupLabels, type MuscleGroup } from '../../constants/muscles';
import { equipmentLabels, type EquipmentType } from '../../constants/equipment';
import { formatDuration, formatWeight } from '../../domain/units';
import { lightImpact } from '../../lib/haptics';
import { Ionicons } from '@expo/vector-icons';
import type { ExerciseRow } from '../../db/queries/exercises';
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

type TabType = 'about' | 'history' | 'records';

export function ExerciseDetailSheet({
  exercise,
  visible,
  onClose,
  onEdit,
  onArchiveToggle,
  onRestSecondsChange,
}: ExerciseDetailSheetProps) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [restSeconds, setRestSeconds] = useState(exercise?.defaultRestSeconds ?? 90);

  // History & Records state
  const [historyList, setHistoryList] = useState<ExerciseHistorySession[]>([]);
  const [prList, setPrList] = useState<ExercisePRItem[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<any>(null);

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
      >
        <View style={styles.tabContainer}>
          <SegmentedControl
            options={[
              { label: 'About', value: 'about' },
              { label: `History (${historyList.length})`, value: 'history' },
              { label: `Records (${prList.length})`, value: 'records' },
            ]}
            value={activeTab}
            onChange={(val) => {
              lightImpact();
              setActiveTab(val as TabType);
            }}
          />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

              {/* Notes */}
              {exercise.notes ? (
                <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text variant="headingSm" style={styles.sectionHeader}>
                    Instructions & Notes
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
                          {formatWeight(session.totalVolumeKg, 'kg')}
                        </Text>
                        <Text variant="caption" color="textMuted">
                          {session.sets.length} {session.sets.length === 1 ? 'set' : 'sets'}
                        </Text>
                      </View>
                    </View>

                    {/* Sets list */}
                    <View style={styles.setsList}>
                      {session.sets.map((s) => (
                        <View key={s.id} style={styles.historySetRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, width: 60 }}>
                            <Text variant="caption" color="textMuted" style={{ fontWeight: '700' }} tabular>
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
                          </View>

                          <Text variant="bodySm" style={{ flex: 1, fontWeight: '600' }} tabular>
                            {s.weightKg != null ? `${s.weightKg} kg × ` : ''}{s.reps ?? 0} reps
                            {s.rpe ? ` @ RPE ${s.rpe}` : ''}
                          </Text>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            {s.estimated1rm > 0 && (
                              <Text variant="caption" color="textMuted" tabular>
                                e1RM: {s.estimated1rm}kg
                              </Text>
                            )}
                            {s.prBadges.map((badge, bIdx) => (
                              <View key={bIdx} style={[styles.prBadge, { backgroundColor: theme.prGold + '22' }]}>
                                <Text style={{ color: theme.prGold, fontSize: 9, fontWeight: '800' }}>
                                  🏆 {badge}
                                </Text>
                              </View>
                            ))}
                          </View>
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
                      pr.recordType === 'best_set_volume' ? `${pr.value} kg` :
                      pr.recordType === 'max_reps_at_weight' ? `${pr.value} reps @ ${pr.weightKg} kg` :
                      `${pr.value} kg`;

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
    paddingBottom: spacing['4xl'],
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
    gap: spacing.xs,
  },
  historySetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  setTypeMini: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  prBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
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
