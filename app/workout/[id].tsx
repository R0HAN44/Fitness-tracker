/**
 * WorkoutDetailScreen — comprehensive past workout view.
 *
 * Implements:
 *   - Detailed summary: duration, volume, sets count, PRs
 *   - Exercise breakdown with superset badges and notes
 *   - Set-by-set listing with PR badges
 *   - Past session comparison per exercise
 *   - Edit completed workout (title, date, notes, and sets with PR recomputation)
 *   - Delete completed workout with PR recomputation
 *   - Shareable workout card image export (react-native-view-shot + expo-sharing)
 *   - Save completed workout as routine
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Text } from '../../src/ui/typography/Text';
import { Button } from '../../src/ui/components/Button';
import { Sheet } from '../../src/ui/components/Sheet';
import { Input } from '../../src/ui/components/Input';
import { SessionComparisonSheet } from '../../src/ui/workout/SessionComparisonSheet';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { spacing, radii, layout, typography } from '../../src/ui/theme/tokens';
import { formatDuration, formatWeight, toDisplayWeight, toDatabaseWeight } from '../../src/domain/units';
import { useSettingsStore } from '../../src/state/settingsStore';
import { lightImpact, mediumImpact, notificationSuccess } from '../../src/lib/haptics';
import {
  getCompletedWorkoutDetail,
  updateCompletedWorkout,
  updateCompletedWorkoutSet,
  addSetToCompletedWorkout,
  deleteSetFromCompletedWorkout,
  deleteCompletedWorkout,
  getPastSessionComparisonForExercise,
  type CompletedWorkoutDetail,
} from '../../src/db/queries/workouts';
import { saveWorkoutAsRoutine } from '../../src/db/queries/routines';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const shareCardRef = useRef<any>(null);
  const weightUnit = useSettingsStore((s) => s.weightUnit);

  const [workout, setWorkout] = useState<CompletedWorkoutDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Workout modal
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState('');

  // Past session comparison modal
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonExerciseName, setComparisonExerciseName] = useState('');
  const [comparisonData, setComparisonData] = useState<any>(null);

  // Sharing state
  const [isSharing, setIsSharing] = useState(false);

  const loadWorkout = useCallback(() => {
    if (!id) return;
    try {
      const data = getCompletedWorkoutDetail(id);
      setWorkout(data);
      if (data) {
        setEditTitle(data.title ?? 'Workout');
        setEditNotes(data.notes ?? '');
        setEditDate(data.startedAt);
      }
    } catch (e) {
      console.error('Error loading workout detail:', e);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.danger} />
        <Text variant="headingSm" style={{ marginTop: spacing.sm }}>Workout Not Found</Text>
        <Button title="Go Back" variant="secondary" onPress={() => router.back()} style={{ marginTop: spacing.md }} />
      </SafeAreaView>
    );
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const handleSaveEditMeta = () => {
    lightImpact();
    updateCompletedWorkout(workout.id, {
      title: editTitle.trim(),
      notes: editNotes.trim(),
      startedAt: editDate.trim(),
    });
    setShowEditSheet(false);
    notificationSuccess();
    loadWorkout();
  };

  const handleUpdateSetWeight = (setId: string, val: string) => {
    const num = parseFloat(val);
    const weightKg = isNaN(num) ? null : toDatabaseWeight(num, weightUnit);
    updateCompletedWorkoutSet(setId, { weightKg });
    loadWorkout();
  };

  const handleUpdateSetReps = (setId: string, val: string) => {
    const num = parseInt(val, 10);
    updateCompletedWorkoutSet(setId, { reps: isNaN(num) ? null : num });
    loadWorkout();
  };

  const handleCycleSetType = (setId: string, currentType: string) => {
    lightImpact();
    const cycle = ['normal', 'warmup', 'drop', 'failure'] as const;
    const nextIdx = (cycle.indexOf(currentType as any) + 1) % cycle.length;
    updateCompletedWorkoutSet(setId, { setType: cycle[nextIdx] });
    loadWorkout();
  };

  const handleAddSet = (workoutExerciseId: string) => {
    lightImpact();
    addSetToCompletedWorkout(workoutExerciseId);
    loadWorkout();
  };

  const handleDeleteSet = (setId: string) => {
    lightImpact();
    deleteSetFromCompletedWorkout(setId);
    loadWorkout();
  };

  const handleDeleteWorkoutPrompt = () => {
    Alert.alert(
      'Delete Workout?',
      'Are you sure you want to delete this workout? Personal records will be recomputed automatically.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            lightImpact();
            deleteCompletedWorkout(workout.id);
            router.back();
          },
        },
      ],
    );
  };

  const handleSaveAsRoutine = () => {
    Alert.prompt
      ? Alert.prompt(
          'Save as Routine',
          'Enter routine template name:',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Save',
              onPress: (name?: string) => {
                if (name?.trim()) {
                  saveWorkoutAsRoutine(workout.id, name.trim());
                  notificationSuccess();
                  Alert.alert('Saved', `"${name.trim()}" saved to routines.`);
                }
              },
            },
          ],
          'plain-text',
          workout.title ?? 'Workout',
        )
      : (() => {
          saveWorkoutAsRoutine(workout.id, workout.title ?? 'Workout');
          notificationSuccess();
          Alert.alert('Saved', 'Saved to routines.');
        })();
  };

  const handleOpenComparison = (exerciseId: string, exerciseName: string) => {
    lightImpact();
    const comp = getPastSessionComparisonForExercise(exerciseId, workout.id);
    if (!comp) {
      Alert.alert('No Prior Session', `No earlier workout found for ${exerciseName} to compare against.`);
      return;
    }
    setComparisonExerciseName(exerciseName);
    setComparisonData(comp);
    setShowComparison(true);
  };

  const handleShareCard = async () => {
    if (!shareCardRef.current) return;
    try {
      setIsSharing(true);
      mediumImpact();
      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Share ${workout.title}`,
        });
      }
    } catch (err) {
      console.error('Error sharing workout card:', err);
      Alert.alert('Error', 'Failed to generate share image.');
    } finally {
      setIsSharing(false);
    }
  };

  const totalSetsCount = workout.exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const totalPRCount = workout.exercises.reduce(
    (sum, e) => sum + e.setsWithPRs.reduce((pSum, s) => pSum + s.prTypes.length, 0),
    0,
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: workout.title ?? 'Workout',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginRight: spacing.md }}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </Pressable>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Pressable onPress={handleShareCard} hitSlop={6} disabled={isSharing}>
                <Ionicons name="share-outline" size={22} color={theme.accent} />
              </Pressable>
              <Pressable onPress={() => setShowEditSheet(true)} hitSlop={6}>
                <Ionicons name="create-outline" size={22} color={theme.text} />
              </Pressable>
              <Pressable onPress={handleDeleteWorkoutPrompt} hitSlop={6}>
                <Ionicons name="trash-outline" size={22} color={theme.danger} />
              </Pressable>
            </View>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Workout Top Card (also captured for sharing) */}
        <View
          ref={shareCardRef}
          collapsable={false}
          style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={styles.summaryTop}>
            <View style={{ flex: 1 }}>
              <Text variant="headingLg" style={{ fontWeight: '800' }}>
                {workout.title ?? 'Workout'}
              </Text>
              <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                {formatDate(workout.startedAt)} · {formatTime(workout.startedAt)}
              </Text>
            </View>

            {totalPRCount > 0 && (
              <View style={[styles.goldBadge, { backgroundColor: theme.prGold + '22', borderColor: theme.prGold }]}>
                <Ionicons name="trophy" size={14} color={theme.prGold} />
                <Text variant="caption" style={{ color: theme.prGold, fontWeight: '800' }}>
                  {totalPRCount} PR{totalPRCount === 1 ? '' : 's'}
                </Text>
              </View>
            )}
          </View>

          {workout.notes ? (
            <Text variant="bodySm" color="textMuted" style={styles.workoutNotes}>
              {workout.notes}
            </Text>
          ) : null}

          {/* Key Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text variant="caption" color="textMuted">DURATION</Text>
              <Text variant="headingSm" color="accent" tabular style={{ fontWeight: '800' }}>
                {formatDuration(workout.durationSeconds ?? 0)}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text variant="caption" color="textMuted">VOLUME</Text>
              <Text variant="headingSm" color="text" tabular style={{ fontWeight: '800' }}>
                {formatWeight(workout.totalVolumeKg ?? 0, weightUnit)}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text variant="caption" color="textMuted">SETS</Text>
              <Text variant="headingSm" color="text" tabular style={{ fontWeight: '800' }}>
                {totalSetsCount}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <Button
            title="Save as Routine"
            variant="secondary"
            size="sm"
            icon={<Ionicons name="bookmark-outline" size={16} color={theme.text} />}
            onPress={handleSaveAsRoutine}
            style={{ flex: 1 }}
          />
          <Button
            title="Share Image"
            variant="primary"
            size="sm"
            icon={<Ionicons name="share-social-outline" size={16} color={theme.onAccent} />}
            onPress={handleShareCard}
            style={{ flex: 1 }}
          />
        </View>

        {/* Exercises Section */}
        <Text variant="caption" color="textMuted" style={styles.sectionHeader}>
          EXERCISES ({workout.exercises.length})
        </Text>

        {workout.exercises.map((we, exIdx) => (
          <View
            key={we.id}
            style={[
              styles.exerciseCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
              we.supersetLabel ? { borderLeftWidth: 4, borderLeftColor: theme.accent } : null,
            ]}
          >
            {/* Exercise Header */}
            <View style={styles.exerciseHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  {we.supersetLabel && (
                    <View style={[styles.supersetTag, { backgroundColor: theme.accent }]}>
                      <Text variant="caption" style={{ color: theme.onAccent, fontWeight: '800', fontSize: 10 }}>
                        {we.supersetLabel}
                      </Text>
                    </View>
                  )}
                  <Text variant="body" style={{ fontWeight: '700' }}>
                    {we.exercise.name}
                  </Text>
                </View>
                <Text variant="caption" color="textMuted" style={{ textTransform: 'capitalize', marginTop: 2 }}>
                  {we.exercise.primaryMuscle} · {we.exercise.equipment}
                </Text>
              </View>

              <Pressable
                onPress={() => handleOpenComparison(we.exercise.id, we.exercise.name)}
                style={[styles.compareBtn, { backgroundColor: theme.elevated, borderColor: theme.border }]}
                hitSlop={6}
              >
                <Ionicons name="git-compare-outline" size={14} color={theme.accent} />
                <Text variant="caption" color="accent" style={{ fontWeight: '700', marginLeft: 4 }}>
                  Compare
                </Text>
              </Pressable>
            </View>

            {we.notes ? (
              <Text variant="caption" color="textMuted" style={{ fontStyle: 'italic', marginBottom: spacing.xs }}>
                Note: {we.notes}
              </Text>
            ) : null}

            {/* Sets Header */}
            <View style={[styles.setsHeader, { borderBottomColor: theme.border }]}>
              <Text variant="caption" color="textMuted" style={{ width: 44 }}>SET</Text>
              <Text variant="caption" color="textMuted" style={{ flex: 1 }}>WEIGHT & REPS</Text>
              <Text variant="caption" color="textMuted" style={{ width: 60, textAlign: 'center' }}>RPE</Text>
              <Text variant="caption" color="textMuted" style={{ width: 30, textAlign: 'right' }}>EDIT</Text>
            </View>

            {/* Sets Rows */}
            {we.setsWithPRs.map((s, sIdx) => (
              <View key={s.id} style={[styles.setRow, { borderBottomColor: theme.border }]}>
                {/* Set Type & Index */}
                <Pressable
                  onPress={() => handleCycleSetType(s.id, s.setType)}
                  style={[
                    styles.setTypeBadge,
                    {
                      backgroundColor:
                        s.setType === 'warmup' ? theme.setWarmup + '22' :
                        s.setType === 'drop' ? theme.setDrop + '22' :
                        s.setType === 'failure' ? theme.setFailure + '22' : theme.elevated,
                      borderColor:
                        s.setType === 'warmup' ? theme.setWarmup :
                        s.setType === 'drop' ? theme.setDrop :
                        s.setType === 'failure' ? theme.setFailure : theme.border,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{
                      fontWeight: '800',
                      color:
                        s.setType === 'warmup' ? theme.setWarmup :
                        s.setType === 'drop' ? theme.setDrop :
                        s.setType === 'failure' ? theme.setFailure : theme.text,
                    }}
                  >
                    {s.setType === 'normal' ? s.setIndex : s.setType[0].toUpperCase()}
                  </Text>
                </Pressable>

                {/* Weight & Reps inputs */}
                <View style={styles.inputsRow}>
                  <TextInput
                    defaultValue={s.weightKg != null ? String(toDisplayWeight(s.weightKg, weightUnit)) : ''}
                    onEndEditing={(e) => handleUpdateSetWeight(s.id, e.nativeEvent.text)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                    style={[styles.numInput, { color: theme.text, borderColor: theme.border }]}
                  />
                  <Text variant="caption" color="textMuted">{weightUnit} ×</Text>
                  <TextInput
                    defaultValue={s.reps != null ? String(s.reps) : ''}
                    onEndEditing={(e) => handleUpdateSetReps(s.id, e.nativeEvent.text)}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                    style={[styles.numInput, { color: theme.text, borderColor: theme.border }]}
                  />
                </View>

                {/* RPE */}
                <Text variant="caption" color="textMuted" style={{ width: 60, textAlign: 'center' }}>
                  {s.rpe ? `@ ${s.rpe}` : '—'}
                </Text>

                {/* Delete set action */}
                <Pressable
                  onPress={() => handleDeleteSet(s.id)}
                  hitSlop={6}
                  disabled={we.setsWithPRs.length <= 1}
                  style={{ width: 30, alignItems: 'flex-end', opacity: we.setsWithPRs.length <= 1 ? 0.2 : 1 }}
                >
                  <Ionicons name="trash-outline" size={16} color={theme.danger} />
                </Pressable>

                {/* PR tag if achieved */}
                {s.prTypes.length > 0 && (
                  <View style={[styles.setPRBadge, { backgroundColor: theme.prGold + '22' }]}>
                    <Text style={{ color: theme.prGold, fontSize: 9, fontWeight: '800' }}>
                      🏆 PR
                    </Text>
                  </View>
                )}
              </View>
            ))}

            <Pressable onPress={() => handleAddSet(we.id)} style={styles.addSetBtn}>
              <Ionicons name="add" size={16} color={theme.accent} />
              <Text variant="caption" color="accent" style={{ fontWeight: '700', marginLeft: 4 }}>
                Add Set
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      {/* Edit Workout Metadata Sheet */}
      <Sheet visible={showEditSheet} onClose={() => setShowEditSheet(false)} title="Edit Workout">
        <View style={styles.editForm}>
          <Input
            label="Workout Title"
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="Title"
          />

          <Input
            label="Date & Time (ISO-8601)"
            value={editDate}
            onChangeText={setEditDate}
            placeholder="YYYY-MM-DDTHH:MM:SSZ"
          />

          <Input
            label="Workout Notes"
            value={editNotes}
            onChangeText={setEditNotes}
            placeholder="Add notes..."
            multiline
            numberOfLines={3}
          />

          <Button title="Save Changes" variant="primary" onPress={handleSaveEditMeta} fullWidth style={{ marginTop: spacing.md }} />
        </View>
      </Sheet>

      {/* Session Comparison Modal */}
      <SessionComparisonSheet
        visible={showComparison}
        onClose={() => setShowComparison(false)}
        exerciseName={comparisonExerciseName}
        comparison={comparisonData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing['5xl'],
    gap: spacing.base,
  },
  summaryCard: {
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  goldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  workoutNotes: {
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#33333333',
    paddingTop: spacing.sm,
  },
  metricItem: {
    gap: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sectionHeader: {
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  exerciseCard: {
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  supersetTag: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  setTypeBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  numInput: {
    width: 52,
    height: 32,
    borderWidth: 1,
    borderRadius: radii.sm,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 2,
  },
  setPRBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  editForm: {
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
});
