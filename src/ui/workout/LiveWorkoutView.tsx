/**
 * LiveWorkoutView — full in-progress workout logging interface.
 *
 * Implements:
 *   - Real-time elapsed timer, volume counter, PR banners
 *   - "Previous" performance column per set with tap-to-copy
 *   - RPE field per set
 *   - Per-exercise notes & per-workout notes
 *   - Replace exercise in active workout
 *   - Supersets: group/ungroup with visual grouping badge and accent borders
 *   - Swipe-to-delete sets via SwipeableRow
 *   - Drag-reorder exercises wired with DraggableList
 *   - Save finished workout as reusable routine template
 *   - Rest timer: +/-15s, skip, per-exercise default, scheduled notification, keep-awake
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  TextInput,
  Switch,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../typography/Text';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { SwipeableRow } from '../components/SwipeableRow';
import { Sheet } from '../components/Sheet';
import { ConfirmationSheet } from '../components/ConfirmationSheet';
import { OptionMenuSheet } from '../components/OptionMenuSheet';
import { DraggableList } from '../components/DraggableList';
import { PlateCalculatorSheet } from './PlateCalculatorSheet';
import { ExercisePickerSheet } from './ExercisePickerSheet';
import { useWorkoutStore } from '../../state/workoutStore';
import { useSettingsStore } from '../../state/settingsStore';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radii, layout, typography } from '../theme/tokens';
import { formatDuration, formatWeight, toDisplayWeight, toDatabaseWeight } from '../../domain/units';
import { calculateWorkoutVolume } from '../../domain/calc';
import { lightImpact, mediumImpact, heavyImpact, notificationSuccess } from '../../lib/haptics';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_HEIGHT = Dimensions.get('window').height;
import {
  getPreviousSetPerformance,
  type FullWorkoutExercise,
  type FullWorkoutSet,
  type PreviousSetPerformance,
} from '../../db/queries/workouts';
import { saveWorkoutAsRoutine } from '../../db/queries/routines';

export function LiveWorkoutView() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const weightUnit = useSettingsStore((s) => s.weightUnit);

  const {
    activeWorkout,
    restRemainingSeconds,
    isRestTimerRunning,
    recentPRs,
    clearRecentPRs,
    addExercise,
    removeExercise,
    replaceExercise,
    updateExerciseNotes,
    reorderExercises,
    groupExercisesIntoSuperset,
    ungroupExercise,
    addSet,
    updateSet,
    toggleSetCompleted,
    deleteSet,
    adjustRestTimer,
    skipRestTimer,
    finishWorkout,
    discardWorkout,
    updateMeta,
  } = useWorkoutStore();

  // Elapsed duration timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Sheets and modals
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exerciseToReplaceId, setExerciseToReplaceId] = useState<string | null>(null);
  const [showPlateCalculator, setShowPlateCalculator] = useState(false);
  const [plateCalcWeight, setPlateCalcWeight] = useState(60);
  const [showFinishSheet, setShowFinishSheet] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);

  // Finish summary state
  const [workoutTitle, setWorkoutTitle] = useState(activeWorkout?.title ?? 'Workout');
  const [workoutNotes, setWorkoutNotes] = useState(activeWorkout?.notes ?? '');
  const [saveAsRoutine, setSaveAsRoutine] = useState(false);
  const [routineTemplateName, setRoutineTemplateName] = useState(activeWorkout?.title ?? 'Workout');

  // Elapsed time calculation
  useEffect(() => {
    if (!activeWorkout) return;
    const startMs = new Date(activeWorkout.startedAt).getTime();

    const interval = setInterval(() => {
      const secs = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setElapsedSeconds(secs);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeWorkout?.startedAt]);

  if (!activeWorkout) return null;

  // Stats calculation
  const allSets = activeWorkout.exercises.flatMap((e) => e.sets);
  const completedSetsCount = allSets.filter((s) => s.isCompleted).length;
  const currentVolume = calculateWorkoutVolume(allSets);

  const handleConfirmFinish = () => {
    lightImpact();

    if (saveAsRoutine && routineTemplateName.trim()) {
      try {
        saveWorkoutAsRoutine(activeWorkout.id, routineTemplateName.trim());
      } catch (err) {
        console.error('Error saving workout as routine:', err);
      }
    }

    finishWorkout({ title: workoutTitle, notes: workoutNotes });
    setShowFinishSheet(false);
  };

  const handlePromptDiscard = () => {
    lightImpact();
    setShowDiscardModal(true);
  };

  const handleOpenPlateCalc = (weightKg: number | null | undefined) => {
    setPlateCalcWeight(weightKg ?? 60);
    setShowPlateCalculator(true);
  };

  const handleSelectExerciseFromPicker = (selectedEx: { id: string }) => {
    if (exerciseToReplaceId) {
      replaceExercise(exerciseToReplaceId, selectedEx.id);
      setExerciseToReplaceId(null);
    } else {
      addExercise(selectedEx.id);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ── Top Bar ────────────────────────────────────────── */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + spacing.xs,
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <View style={styles.topBarLeft}>
          <TextInput
            value={workoutTitle}
            onChangeText={(t) => {
              setWorkoutTitle(t);
              setRoutineTemplateName(t);
              updateMeta({ title: t });
            }}
            style={[
              styles.titleInput,
              { color: theme.text, fontFamily: typography.headingSm.fontFamily },
            ]}
            placeholder="Workout Title"
            placeholderTextColor={theme.textMuted}
          />
          <View style={styles.statsRow}>
            <Ionicons name="time-outline" size={14} color={theme.accent} />
            <Text variant="caption" color="accent" tabular style={styles.statText}>
              {formatDuration(elapsedSeconds)}
            </Text>
            <Text variant="caption" color="textMuted" style={styles.statDivider}>
              •
            </Text>
            <Text variant="caption" color="textMuted">
              {completedSetsCount}/{allSets.length} sets
            </Text>
            <Text variant="caption" color="textMuted" style={styles.statDivider}>
              •
            </Text>
            <Text variant="caption" color="textMuted" tabular>
              {formatWeight(currentVolume, weightUnit)}
            </Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <Pressable
            onPress={() => {
              lightImpact();
              setIsReorderMode(!isReorderMode);
            }}
            style={[
              styles.iconBtn,
              { backgroundColor: isReorderMode ? theme.accent : theme.elevated },
            ]}
            hitSlop={6}
          >
            <Ionicons
              name="swap-vertical"
              size={18}
              color={isReorderMode ? theme.onAccent : theme.text}
            />
          </Pressable>

          <Button
            title="Finish"
            size="sm"
            variant="primary"
            onPress={() => {
              lightImpact();
              setShowFinishSheet(true);
            }}
          />

          <Pressable onPress={handlePromptDiscard} hitSlop={8} style={styles.discardIcon}>
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.textMuted} />
          </Pressable>
        </View>
      </View>

      {/* ── Rest Timer Banner ──────────────────────────────── */}
      {isRestTimerRunning && (
        <View
          style={[
            styles.restBanner,
            { backgroundColor: theme.elevated, borderColor: theme.border },
          ]}
        >
          <View style={styles.restLeft}>
            <Ionicons name="hourglass-outline" size={18} color={theme.accent} />
            <View style={styles.restTextCol}>
              <Text variant="caption" color="textMuted">
                REST TIMER
              </Text>
              <Text variant="headingSm" color="accent" tabular>
                {formatDuration(restRemainingSeconds)}
              </Text>
            </View>
          </View>

          <View style={styles.restControls}>
            <Pressable
              onPress={() => {
                lightImpact();
                adjustRestTimer(-15);
              }}
              style={[styles.restBtn, { borderColor: theme.border }]}
            >
              <Text variant="caption" color="text">
                -15s
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                lightImpact();
                adjustRestTimer(15);
              }}
              style={[styles.restBtn, { borderColor: theme.border }]}
            >
              <Text variant="caption" color="text">
                +15s
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                lightImpact();
                skipRestTimer();
              }}
              style={[styles.skipBtn, { backgroundColor: theme.surface }]}
            >
              <Text variant="caption" color="textMuted" style={{ fontWeight: '600' }}>
                Skip
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── PR Celebration Banner ──────────────────────────── */}
      {recentPRs.length > 0 && (
        <View
          style={[
            styles.prBanner,
            { backgroundColor: theme.elevated, borderColor: theme.prGold },
          ]}
        >
          <Ionicons name="trophy" size={24} color={theme.prGold} />
          <View style={styles.prInfo}>
            <Text variant="bodySm" style={{ color: theme.prGold, fontWeight: '700' }}>
              NEW PERSONAL RECORD!
            </Text>
            <Text variant="caption" color="text">
              {recentPRs.map((pr) => `${pr.label}: ${pr.value}`).join(' • ')}
            </Text>
          </View>
          <Pressable onPress={clearRecentPRs} hitSlop={8}>
            <Ionicons name="close" size={18} color={theme.textMuted} />
          </Pressable>
        </View>
      )}

      {/* ── Reorder Mode (DraggableList) ─────────────────────── */}
      {isReorderMode ? (
        <View style={styles.reorderContainer}>
          <View style={styles.reorderHeader}>
            <Text variant="headingSm">Reorder Exercises</Text>
            <Button
              title="Done"
              size="sm"
              variant="primary"
              onPress={() => setIsReorderMode(false)}
            />
          </View>
          <DraggableList
            data={activeWorkout.exercises}
            isEditing={true}
            onReorder={(reordered) => reorderExercises(reordered.map((e) => e.id))}
            renderItem={(item, index) => (
              <View
                style={[
                  styles.reorderCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <Text variant="body" style={{ fontWeight: '700' }}>
                  {index + 1}. {item.exercise.name}
                </Text>
                <Text variant="caption" color="textMuted">
                  {item.sets.length} sets · {item.exercise.primaryMuscle}
                </Text>
              </View>
            )}
          />
        </View>
      ) : (
        /* ── Main Workout Content ────────────────────────────── */
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing['5xl'] },
          ]}
        >
          {activeWorkout.exercises.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                { borderColor: theme.border, backgroundColor: theme.surface },
              ]}
            >
              <Ionicons name="barbell-outline" size={40} color={theme.textMuted} />
              <Text variant="headingSm" color="text">
                Workout is empty
              </Text>
              <Text variant="bodySm" color="textMuted" center>
                Tap "Add Exercise" below to start logging your sets.
              </Text>
            </View>
          ) : (
            activeWorkout.exercises.map((we, exIdx) => {
              const nextExercise = activeWorkout.exercises[exIdx + 1];
              return (
                <ExerciseCard
                  key={we.id}
                  workoutExercise={we}
                  workoutId={activeWorkout.id}
                  index={exIdx}
                  hasNextExercise={Boolean(nextExercise)}
                  onAddSet={() => addSet(we.id)}
                  onUpdateSet={updateSet}
                  onToggleComplete={toggleSetCompleted}
                  onDeleteSet={deleteSet}
                  onRemoveExercise={() => removeExercise(we.id)}
                  onReplaceExercise={() => {
                    setExerciseToReplaceId(we.id);
                    setShowExercisePicker(true);
                  }}
                  onUpdateNotes={(notes) => updateExerciseNotes(we.id, notes)}
                  onGroupWithNext={() => {
                    if (nextExercise) {
                      groupExercisesIntoSuperset([we.id, nextExercise.id]);
                    }
                  }}
                  onUngroup={() => ungroupExercise(we.id)}
                  onOpenPlateCalc={handleOpenPlateCalc}
                />
              );
            })
          )}

          {/* Add Exercise Button */}
          <View style={styles.addExerciseBtn}>
            <Button
              title="Add Exercise"
              variant="secondary"
              size="lg"
              icon={<Ionicons name="add" size={20} color={theme.text} />}
              onPress={() => {
                setExerciseToReplaceId(null);
                setShowExercisePicker(true);
              }}
              fullWidth
            />
          </View>
        </ScrollView>
      )}

      {/* ── Modals & Sheets ─────────────────────────────────── */}
      <ExercisePickerSheet
        visible={showExercisePicker}
        onClose={() => {
          setShowExercisePicker(false);
          setExerciseToReplaceId(null);
        }}
        onSelectExercise={handleSelectExerciseFromPicker}
      />

      <PlateCalculatorSheet
        visible={showPlateCalculator}
        onClose={() => setShowPlateCalculator(false)}
        initialWeightKg={plateCalcWeight}
      />

      {/* Finish Workout Sheet */}
      <Sheet
        visible={showFinishSheet}
        onClose={() => setShowFinishSheet(false)}
        title="Finish Workout"
        subtitle="Great work! Save your session."
      >
        <View style={styles.finishContainer}>
          <ScrollView contentContainerStyle={styles.finishContent} showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <View
            style={[
              styles.finishStats,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={styles.finishStatItem}>
              <Text variant="caption" color="textMuted">
                DURATION
              </Text>
              <Text variant="headingSm" color="accent" tabular>
                {formatDuration(elapsedSeconds)}
              </Text>
            </View>
            <View style={styles.finishStatItem}>
              <Text variant="caption" color="textMuted">
                VOLUME
              </Text>
              <Text variant="headingSm" color="text" tabular>
                {formatWeight(currentVolume, weightUnit)}
              </Text>
            </View>
            <View style={styles.finishStatItem}>
              <Text variant="caption" color="textMuted">
                SETS
              </Text>
              <Text variant="headingSm" color="text" tabular>
                {completedSetsCount}
              </Text>
            </View>
          </View>

          <Input
            label="Workout Title"
            value={workoutTitle}
            onChangeText={(t) => {
              setWorkoutTitle(t);
              setRoutineTemplateName(t);
            }}
          />

          <Input
            label="Workout Notes"
            value={workoutNotes}
            onChangeText={setWorkoutNotes}
            placeholder="How did this workout feel? (RPE, energy, equipment)"
            multiline
            numberOfLines={3}
          />

          {/* Save as Routine Toggle */}
          <View
            style={[
              styles.routineSaveBox,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodySm" style={{ fontWeight: '600' }}>
                  Save as Routine Template
                </Text>
                <Text variant="caption" color="textMuted">
                  Create a reusable routine from this finished workout
                </Text>
              </View>
              <Switch
                value={saveAsRoutine}
                onValueChange={(v) => {
                  lightImpact();
                  setSaveAsRoutine(v);
                }}
                trackColor={{ false: theme.border, true: theme.accent }}
              />
            </View>

            {saveAsRoutine && (
              <Input
                label="Routine Name"
                value={routineTemplateName}
                onChangeText={setRoutineTemplateName}
                containerStyle={{ marginTop: spacing.sm }}
              />
            )}
          </View>

          <View style={{ marginTop: spacing.base, gap: spacing.sm }}>
            <Button
              title="Save Workout"
              variant="primary"
              size="lg"
              onPress={handleConfirmFinish}
              fullWidth
            />
            <Button
              title="Discard Workout"
              variant="danger"
              size="md"
              onPress={() => {
                setShowFinishSheet(false);
                setShowDiscardModal(true);
              }}
              fullWidth
            />
          </View>
        </ScrollView>
        </View>
      </Sheet>

      {/* Discard Workout Confirmation Sheet */}
      <ConfirmationSheet
        visible={showDiscardModal}
        onClose={() => setShowDiscardModal(false)}
        title="Discard Workout?"
        message="Are you sure you want to discard this workout? All recorded sets and progress will be permanently lost."
        confirmLabel="Discard Workout"
        cancelLabel="Keep Training"
        destructive
        icon="trash-outline"
        onConfirm={() => {
          discardWorkout();
        }}
      />
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────
// Exercise Card Component
// ────────────────────────────────────────────────────────────────────

interface ExerciseCardProps {
  workoutExercise: FullWorkoutExercise;
  workoutId: string;
  index: number;
  hasNextExercise: boolean;
  onAddSet: () => void;
  onUpdateSet: (setId: string, updates: Partial<FullWorkoutSet>) => void;
  onToggleComplete: (setId: string) => void;
  onDeleteSet: (setId: string) => void;
  onRemoveExercise: () => void;
  onReplaceExercise: () => void;
  onUpdateNotes: (notes: string | null) => void;
  onGroupWithNext: () => void;
  onUngroup: () => void;
  onOpenPlateCalc: (weight: number | null | undefined) => void;
}

function ExerciseCard({
  workoutExercise,
  workoutId,
  index,
  hasNextExercise,
  onAddSet,
  onUpdateSet,
  onToggleComplete,
  onDeleteSet,
  onRemoveExercise,
  onReplaceExercise,
  onUpdateNotes,
  onGroupWithNext,
  onUngroup,
  onOpenPlateCalc,
}: ExerciseCardProps) {
  const { theme } = useTheme();
  const weightUnit = useSettingsStore((s) => s.weightUnit);
  const { exercise, sets, supersetGroupId, notes } = workoutExercise;
  const isBarbell = exercise.equipment === 'barbell';
  const isSuperset = supersetGroupId != null;

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [exerciseNotesText, setExerciseNotesText] = useState(notes ?? '');
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  const handleOpenMenu = () => {
    lightImpact();
    setShowOptionsMenu(true);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: isSuperset ? theme.accent : theme.border,
          borderLeftWidth: isSuperset ? 4 : 1,
        },
      ]}
    >
      {/* Superset Badge */}
      {isSuperset && (
        <View style={styles.supersetHeader}>
          <View style={[styles.supersetBadge, { backgroundColor: theme.accent }]}>
            <Text variant="caption" style={{ color: theme.onAccent, fontWeight: '700' }}>
              SUPERSET
            </Text>
          </View>
          <Pressable onPress={onUngroup} hitSlop={6}>
            <Text variant="caption" color="textMuted">
              Ungroup
            </Text>
          </Pressable>
        </View>
      )}

      {/* Exercise header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderInfo}>
          <Text variant="headingSm" color="text">
            {exercise.name}
          </Text>
          <View style={styles.badgeRow}>
            <Text variant="caption" color="accent" style={{ textTransform: 'capitalize' }}>
              {exercise.primaryMuscle}
            </Text>
            <Text variant="caption" color="textMuted">
              {' • '}
            </Text>
            <Text variant="caption" color="textMuted" style={{ textTransform: 'capitalize' }}>
              {exercise.equipment}
            </Text>
          </View>
        </View>

        <Pressable onPress={handleOpenMenu} hitSlop={8} style={styles.cardMenuBtn}>
          <Ionicons name="ellipsis-vertical" size={18} color={theme.textMuted} />
        </Pressable>
      </View>

      {/* Exercise Notes */}
      {isEditingNotes ? (
        <View style={styles.notesEditor}>
          <TextInput
            value={exerciseNotesText}
            onChangeText={setExerciseNotesText}
            placeholder="Exercise notes (e.g. seat height, cues)..."
            placeholderTextColor={theme.textMuted}
            style={[styles.notesInput, { color: theme.text, borderColor: theme.border }]}
            multiline
            autoFocus
          />
          <View style={styles.notesActionRow}>
            <Button
              title="Cancel"
              size="sm"
              variant="secondary"
              onPress={() => {
                setExerciseNotesText(notes ?? '');
                setIsEditingNotes(false);
              }}
            />
            <Button
              title="Save Note"
              size="sm"
              variant="primary"
              onPress={() => {
                onUpdateNotes(exerciseNotesText.trim() || null);
                setIsEditingNotes(false);
              }}
            />
          </View>
        </View>
      ) : notes ? (
        <Pressable onPress={() => setIsEditingNotes(true)} style={styles.notesDisplay}>
          <Ionicons name="document-text-outline" size={14} color={theme.textMuted} />
          <Text variant="caption" color="textMuted" style={{ flex: 1, fontStyle: 'italic' }}>
            {notes}
          </Text>
        </Pressable>
      ) : null}

      {/* Sets table header */}
      <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
        <Text variant="caption" color="textMuted" style={styles.colSet}>
          SET
        </Text>
        <Text variant="caption" color="textMuted" style={styles.colPrev} center>
          PREV
        </Text>
        <Text variant="caption" color="textMuted" style={styles.colWeight}>
          {weightUnit.toUpperCase()} {isBarbell && '🧮'}
        </Text>
        <Text variant="caption" color="textMuted" style={styles.colReps}>
          REPS
        </Text>
        <Text variant="caption" color="textMuted" style={styles.colRpe}>
          RPE
        </Text>
        <Text variant="caption" color="textMuted" style={styles.colCheck} center>
          ✓
        </Text>
      </View>

      {/* Sets list */}
      {sets.map((set, sIdx) => {
        const prevPerf = getPreviousSetPerformance(exercise.id, set.setIndex, workoutId);

        return (
          <SwipeableRow
            key={set.id}
            onDelete={() => onDeleteSet(set.id)}
            containerStyle={styles.setRowWrapper}
          >
            <View
              style={[
                styles.setRow,
                {
                  backgroundColor: set.isCompleted ? theme.elevated : theme.surface,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              {/* Set index / badge */}
              <Pressable
                onPress={() => cycleSetType(set, onUpdateSet)}
                style={[
                  styles.setBadge,
                  { backgroundColor: getSetTypeColor(set.setType, theme) },
                ]}
                hitSlop={4}
              >
                <Text
                  variant="caption"
                  style={{
                    color: set.setType === 'normal' ? theme.textMuted : '#fff',
                    fontWeight: '700',
                  }}
                >
                  {getSetTypeLabel(set.setType, sIdx + 1)}
                </Text>
              </Pressable>

              {/* PREVIOUS column: tap to copy */}
              <Pressable
                onPress={() => {
                  if (prevPerf && (prevPerf.weightKg != null || prevPerf.reps != null)) {
                    lightImpact();
                    onUpdateSet(set.id, {
                      weightKg: prevPerf.weightKg,
                      reps: prevPerf.reps,
                      rpe: prevPerf.rpe,
                    });
                  }
                }}
                style={styles.colPrev}
                hitSlop={4}
              >
                <Text
                  variant="caption"
                  color={prevPerf ? 'textMuted' : 'textMuted'}
                  tabular
                  center
                  style={{ fontSize: 11 }}
                >
                  {prevPerf && (prevPerf.weightKg != null || prevPerf.reps != null)
                    ? `${prevPerf.weightKg != null ? toDisplayWeight(prevPerf.weightKg, weightUnit) : 0}×${prevPerf.reps ?? 0}`
                    : '—'}
                </Text>
              </Pressable>

              {/* Weight input / plate calculator button */}
              <View style={styles.weightCell}>
                <TextInput
                  value={set.weightKg != null ? toDisplayWeight(set.weightKg, weightUnit).toString() : ''}
                  onChangeText={(val) => {
                    const num = parseFloat(val);
                    const weightKg = isNaN(num) ? null : toDatabaseWeight(num, weightUnit);
                    onUpdateSet(set.id, { weightKg });
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.cellInput,
                    { color: theme.text, fontFamily: typography.mono.fontFamily },
                  ]}
                />
                {isBarbell && (
                  <Pressable
                    onPress={() => onOpenPlateCalc(set.weightKg)}
                    hitSlop={6}
                    style={styles.plateIconBtn}
                  >
                    <Ionicons name="calculator-outline" size={13} color={theme.accent} />
                  </Pressable>
                )}
              </View>

              {/* Reps input */}
              <View style={styles.repsCell}>
                <TextInput
                  value={set.reps != null ? set.reps.toString() : ''}
                  onChangeText={(val) => {
                    const num = parseInt(val, 10);
                    onUpdateSet(set.id, { reps: isNaN(num) ? null : num });
                  }}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.cellInput,
                    { color: theme.text, fontFamily: typography.mono.fontFamily },
                  ]}
                />
              </View>

              {/* RPE input */}
              <View style={styles.rpeCell}>
                <TextInput
                  value={set.rpe != null ? set.rpe.toString() : ''}
                  onChangeText={(val) => {
                    const num = parseFloat(val);
                    onUpdateSet(set.id, { rpe: isNaN(num) ? null : num });
                  }}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.cellInput,
                    { color: theme.text, fontFamily: typography.mono.fontFamily },
                  ]}
                />
              </View>

              {/* Completion toggle */}
              <Pressable
                onPress={() => onToggleComplete(set.id)}
                style={[
                  styles.checkBtn,
                  {
                    backgroundColor: set.isCompleted ? theme.accent : theme.elevated,
                    borderColor: set.isCompleted ? theme.accent : theme.border,
                  },
                ]}
                hitSlop={layout.minTouchTarget - 36}
              >
                <Ionicons
                  name="checkmark"
                  size={18}
                  color={set.isCompleted ? theme.onAccent : theme.textMuted}
                />
              </Pressable>
            </View>
          </SwipeableRow>
        );
      })}

      {/* Add set button */}
      <Pressable
        onPress={() => {
          lightImpact();
          onAddSet();
        }}
        style={({ pressed }) => [
          styles.addSetRow,
          {
            backgroundColor: pressed ? theme.elevated : 'transparent',
          },
        ]}
      >
        <Ionicons name="add" size={18} color={theme.accent} />
        <Text variant="bodySm" color="accent" style={{ fontWeight: '600', marginLeft: 4 }}>
          Add Set
        </Text>
      </Pressable>

      {/* Exercise Options Sheet */}
      <OptionMenuSheet
        visible={showOptionsMenu}
        onClose={() => setShowOptionsMenu(false)}
        title={exercise.name}
        subtitle="Exercise Options"
        options={[
          {
            id: 'replace',
            label: 'Replace Exercise',
            icon: 'swap-horizontal',
            onPress: onReplaceExercise,
          },
          {
            id: 'note',
            label: notes ? 'Edit Exercise Note' : 'Add Exercise Note',
            icon: 'create-outline',
            onPress: () => setIsEditingNotes(true),
          },
          ...(isSuperset
            ? [
                {
                  id: 'ungroup',
                  label: 'Ungroup from Superset',
                  icon: 'link-outline' as const,
                  onPress: onUngroup,
                },
              ]
            : hasNextExercise
            ? [
                {
                  id: 'group',
                  label: 'Group with Next Exercise (Superset)',
                  icon: 'link-outline' as const,
                  onPress: onGroupWithNext,
                },
              ]
            : []),
          {
            id: 'remove',
            label: 'Remove Exercise',
            icon: 'trash-outline',
            destructive: true,
            onPress: onRemoveExercise,
          },
        ]}
      />
    </View>
  );
}

function cycleSetType(
  set: FullWorkoutSet,
  onUpdate: (id: string, updates: Partial<FullWorkoutSet>) => void,
) {
  lightImpact();
  const types = ['normal', 'warmup', 'drop', 'failure'];
  const nextIdx = (types.indexOf(set.setType) + 1) % types.length;
  onUpdate(set.id, { setType: types[nextIdx] });
}

function getSetTypeLabel(type: string, index: number): string {
  switch (type) {
    case 'warmup':
      return 'W';
    case 'drop':
      return 'D';
    case 'failure':
      return 'F';
    default:
      return index.toString();
  }
}

function getSetTypeColor(type: string, theme: any): string {
  switch (type) {
    case 'warmup':
      return theme.setWarmup;
    case 'drop':
      return theme.setDrop;
    case 'failure':
      return theme.setFailure;
    default:
      return theme.elevated;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '700',
    padding: 0,
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 4,
    fontWeight: '600',
  },
  statDivider: {
    marginHorizontal: 6,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardIcon: {
    padding: spacing.xs,
  },
  restBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  restLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  restTextCol: {
    justifyContent: 'center',
  },
  restControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  restBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  skipBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  prBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  prInfo: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    gap: spacing.base,
  },
  emptyBox: {
    borderRadius: radii.lg,
    padding: spacing['3xl'],
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  addExerciseBtn: {
    marginTop: spacing.xs,
  },
  reorderContainer: {
    flex: 1,
    padding: spacing.base,
  },
  reorderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  reorderCard: {
    padding: spacing.base,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  supersetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  supersetBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  cardMenuBtn: {
    padding: spacing.xs,
  },
  notesDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  notesEditor: {
    gap: spacing.xs,
    marginVertical: 4,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.sm,
    fontSize: 13,
  },
  notesActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colSet: {
    width: 32,
    fontWeight: '700',
  },
  colPrev: {
    width: 60,
  },
  colWeight: {
    flex: 1,
    marginLeft: 6,
  },
  colReps: {
    width: 48,
    textAlign: 'center',
  },
  colRpe: {
    width: 40,
    textAlign: 'center',
  },
  colCheck: {
    width: 36,
  },
  setRowWrapper: {
    marginBottom: 4,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
  },
  setBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  repsCell: {
    width: 48,
    alignItems: 'center',
  },
  rpeCell: {
    width: 40,
    alignItems: 'center',
  },
  cellInput: {
    width: '100%',
    textAlign: 'center',
    fontSize: 15,
    padding: 0,
  },
  plateIconBtn: {
    padding: 2,
  },
  checkBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    marginTop: spacing.xs,
  },
  finishContainer: {
    height: Math.min(620, SCREEN_HEIGHT * 0.78),
  },
  finishContent: {
    gap: spacing.base,
    paddingBottom: spacing['4xl'],
  },
  finishStats: {
    flexDirection: 'row',
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingVertical: spacing.base,
    justifyContent: 'space-around',
  },
  finishStatItem: {
    alignItems: 'center',
    gap: 2,
  },
  routineSaveBox: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.base,
    gap: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
