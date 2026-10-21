/**
 * RoutineEditorSheet — modal sheet to create or edit workout routines.
 * Supports routine name, folder organization, exercise sequencing,
 * and target sets/reps/weight definitions.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Text } from '../typography/Text';
import { Sheet } from '../components/Sheet';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ExercisePickerSheet } from './ExercisePickerSheet';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radii, layout, typography } from '../theme/tokens';
import {
  createRoutine,
  updateRoutine,
  getRoutineById,
  getRoutineFolders,
  createRoutineFolder,
  type FullRoutine,
  type RoutineFolderRow,
} from '../../db/queries/routines';
import { lightImpact, notificationSuccess } from '../../lib/haptics';
import { Ionicons } from '@expo/vector-icons';
import type { ExerciseRow } from '../../db/queries/exercises';

export interface RoutineEditorSheetProps {
  visible: boolean;
  onClose: () => void;
  routineId?: string | null;
  onSave?: (routine: FullRoutine) => void;
}

interface RoutineExerciseDraft {
  exercise: ExerciseRow;
  sets: Array<{
    targetWeightKg: number | null;
    targetReps: number | null;
    setType: string;
  }>;
}

export function RoutineEditorSheet({
  visible,
  onClose,
  routineId,
  onSave,
}: RoutineEditorSheetProps) {
  const { theme } = useTheme();

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [folders, setFolders] = useState<RoutineFolderRow[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [exercisesList, setExercisesList] = useState<RoutineExerciseDraft[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  // New folder prompt
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    if (!visible) return;

    const allFolders = getRoutineFolders();
    setFolders(allFolders);

    if (routineId) {
      const routine = getRoutineById(routineId);
      if (routine) {
        setName(routine.name);
        setNotes(routine.notes ?? '');
        setSelectedFolderId(routine.folderId);
        setExercisesList(
          routine.exercises.map((re) => ({
            exercise: re.exercise,
            sets: re.sets.map((s) => ({
              targetWeightKg: s.targetWeightKg,
              targetReps: s.targetReps,
              setType: s.setType,
            })),
          })),
        );
        return;
      }
    }

    // New routine defaults
    setName('');
    setNotes('');
    setSelectedFolderId(null);
    setExercisesList([]);
  }, [visible, routineId]);

  const handleAddExercise = (exercise: ExerciseRow) => {
    lightImpact();
    setExercisesList((prev) => [
      ...prev,
      {
        exercise,
        sets: [
          { targetWeightKg: null, targetReps: 10, setType: 'normal' },
          { targetWeightKg: null, targetReps: 10, setType: 'normal' },
          { targetWeightKg: null, targetReps: 10, setType: 'normal' },
        ],
      },
    ]);
  };

  const handleRemoveExercise = (index: number) => {
    lightImpact();
    setExercisesList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveExercise = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= exercisesList.length) return;
    lightImpact();
    setExercisesList((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleAddSet = (exerciseIndex: number) => {
    lightImpact();
    setExercisesList((prev) =>
      prev.map((item, idx) => {
        if (idx !== exerciseIndex) return item;
        const lastSet = item.sets[item.sets.length - 1];
        return {
          ...item,
          sets: [
            ...item.sets,
            {
              targetWeightKg: lastSet?.targetWeightKg ?? null,
              targetReps: lastSet?.targetReps ?? 10,
              setType: 'normal',
            },
          ],
        };
      }),
    );
  };

  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    lightImpact();
    setExercisesList((prev) =>
      prev.map((item, idx) => {
        if (idx !== exerciseIndex) return item;
        return {
          ...item,
          sets: item.sets.filter((_, sIdx) => sIdx !== setIndex),
        };
      }),
    );
  };

  const handleMoveSet = (exerciseIndex: number, fromSetIndex: number, toSetIndex: number) => {
    lightImpact();
    setExercisesList((prev) =>
      prev.map((item, idx) => {
        if (idx !== exerciseIndex) return item;
        if (toSetIndex < 0 || toSetIndex >= item.sets.length) return item;
        const nextSets = [...item.sets];
        const [moved] = nextSets.splice(fromSetIndex, 1);
        nextSets.splice(toSetIndex, 0, moved);
        return { ...item, sets: nextSets };
      }),
    );
  };

  const handleUpdateSet = (
    exerciseIndex: number,
    setIndex: number,
    updates: Partial<{ targetWeightKg: number | null; targetReps: number | null }>,
  ) => {
    setExercisesList((prev) =>
      prev.map((item, idx) => {
        if (idx !== exerciseIndex) return item;
        return {
          ...item,
          sets: item.sets.map((s, sIdx) => (sIdx === setIndex ? { ...s, ...updates } : s)),
        };
      }),
    );
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const created = createRoutineFolder(newFolderName.trim());
    setFolders((prev) => [...prev, created]);
    setSelectedFolderId(created.id);
    setNewFolderName('');
    setShowNewFolderInput(false);
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a routine name.');
      return;
    }

    if (exercisesList.length === 0) {
      Alert.alert('Required', 'Please add at least one exercise to the routine.');
      return;
    }

    lightImpact();

    try {
      const routineInput = {
        name: name.trim(),
        folderId: selectedFolderId,
        notes: notes.trim() || null,
        exercises: exercisesList.map((item) => ({
          exerciseId: item.exercise.id,
          sets: item.sets.map((s) => ({
            setType: s.setType,
            targetWeightKg: s.targetWeightKg,
            targetReps: s.targetReps,
          })),
        })),
      };

      let result: FullRoutine;
      if (routineId) {
        updateRoutine(routineId, {
          name: routineInput.name,
          folderId: routineInput.folderId,
          notes: routineInput.notes,
        });
        result = getRoutineById(routineId)!;
      } else {
        result = createRoutine(routineInput);
      }

      notificationSuccess();
      if (onSave) onSave(result);
      onClose();
    } catch (err) {
      console.error('Error saving routine:', err);
      Alert.alert('Error', 'Failed to save routine. Please try again.');
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={routineId ? 'Edit Routine' : 'New Routine'}
      subtitle={routineId ? 'Update your routine template' : 'Create a reusable workout blueprint'}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Input
          label="Routine Name *"
          placeholder="e.g. Chest & Triceps Hypertrophy"
          value={name}
          onChangeText={setName}
        />

        {/* Folder Selector */}
        <View style={styles.section}>
          <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
            FOLDER
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Pressable
              onPress={() => setSelectedFolderId(null)}
              style={[
                styles.chip,
                {
                  backgroundColor: selectedFolderId === null ? theme.accent : theme.surface,
                  borderColor: selectedFolderId === null ? theme.accent : theme.border,
                },
              ]}
            >
              <Text
                variant="caption"
                style={{
                  color: selectedFolderId === null ? theme.onAccent : theme.text,
                  fontWeight: selectedFolderId === null ? '700' : '500',
                }}
              >
                No Folder
              </Text>
            </Pressable>
            {folders.map((f) => {
              const isSelected = selectedFolderId === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setSelectedFolderId(f.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? theme.accent : theme.surface,
                      borderColor: isSelected ? theme.accent : theme.border,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: isSelected ? theme.onAccent : theme.text,
                      fontWeight: isSelected ? '700' : '500',
                    }}
                  >
                    {f.name}
                  </Text>
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => setShowNewFolderInput(true)}
              style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Ionicons name="add" size={14} color={theme.accent} />
              <Text variant="caption" color="accent" style={{ fontWeight: '600' }}>
                New Folder
              </Text>
            </Pressable>
          </ScrollView>

          {showNewFolderInput && (
            <View style={styles.newFolderRow}>
              <Input
                placeholder="Folder name..."
                value={newFolderName}
                onChangeText={setNewFolderName}
                containerStyle={{ flex: 1 }}
              />
              <Button title="Add" size="sm" variant="primary" onPress={handleCreateFolder} />
            </View>
          )}
        </View>

        {/* Exercises */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
              EXERCISES ({exercisesList.length})
            </Text>
          </View>

          {exercisesList.map((item, exIdx) => (
            <View
              key={`${item.exercise.id}-${exIdx}`}
              style={[styles.exerciseCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={styles.exerciseCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '700' }}>
                    {item.exercise.name}
                  </Text>
                  <Text variant="caption" color="textMuted" style={{ textTransform: 'capitalize' }}>
                    {item.exercise.primaryMuscle} · {item.exercise.equipment}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Pressable
                    onPress={() => handleMoveExercise(exIdx, exIdx - 1)}
                    disabled={exIdx === 0}
                    hitSlop={6}
                    style={{ opacity: exIdx === 0 ? 0.25 : 1, padding: 4 }}
                    accessibilityLabel="Move exercise up"
                  >
                    <Ionicons name="arrow-up" size={18} color={theme.text} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleMoveExercise(exIdx, exIdx + 1)}
                    disabled={exIdx === exercisesList.length - 1}
                    hitSlop={6}
                    style={{ opacity: exIdx === exercisesList.length - 1 ? 0.25 : 1, padding: 4 }}
                    accessibilityLabel="Move exercise down"
                  >
                    <Ionicons name="arrow-down" size={18} color={theme.text} />
                  </Pressable>
                  <Pressable onPress={() => handleRemoveExercise(exIdx)} hitSlop={8} style={{ padding: 4, marginLeft: 4 }}>
                    <Ionicons name="trash-outline" size={18} color={theme.danger} />
                  </Pressable>
                </View>
              </View>

              {/* Sets Table */}
              <View style={styles.setsTable}>
                {item.sets.map((s, sIdx) => (
                  <View key={sIdx} style={[styles.setRow, { borderBottomColor: theme.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Text variant="caption" color="textMuted" style={{ width: 18, fontWeight: '700' }}>
                        {sIdx + 1}
                      </Text>
                      <Pressable
                        onPress={() => handleMoveSet(exIdx, sIdx, sIdx - 1)}
                        disabled={sIdx === 0}
                        hitSlop={4}
                        style={{ opacity: sIdx === 0 ? 0.2 : 0.8, padding: 2 }}
                        accessibilityLabel="Move set up"
                      >
                        <Ionicons name="chevron-up" size={14} color={theme.text} />
                      </Pressable>
                      <Pressable
                        onPress={() => handleMoveSet(exIdx, sIdx, sIdx + 1)}
                        disabled={sIdx === item.sets.length - 1}
                        hitSlop={4}
                        style={{ opacity: sIdx === item.sets.length - 1 ? 0.2 : 0.8, padding: 2 }}
                        accessibilityLabel="Move set down"
                      >
                        <Ionicons name="chevron-down" size={14} color={theme.text} />
                      </Pressable>
                    </View>

                    <View style={styles.cell}>
                      <Input
                        placeholder="kg"
                        value={s.targetWeightKg != null ? s.targetWeightKg.toString() : ''}
                        onChangeText={(v) => {
                          const num = parseFloat(v);
                          handleUpdateSet(exIdx, sIdx, { targetWeightKg: isNaN(num) ? null : num });
                        }}
                        keyboardType="decimal-pad"
                        inputStyle={{ textAlign: 'center', height: 32, paddingVertical: 4 }}
                      />
                    </View>

                    <Text variant="caption" color="textMuted">
                      ×
                    </Text>

                    <View style={styles.cell}>
                      <Input
                        placeholder="reps"
                        value={s.targetReps != null ? s.targetReps.toString() : ''}
                        onChangeText={(v) => {
                          const num = parseInt(v, 10);
                          handleUpdateSet(exIdx, sIdx, { targetReps: isNaN(num) ? null : num });
                        }}
                        keyboardType="number-pad"
                        inputStyle={{ textAlign: 'center', height: 32, paddingVertical: 4 }}
                      />
                    </View>

                    <Pressable
                      onPress={() => handleRemoveSet(exIdx, sIdx)}
                      hitSlop={6}
                      disabled={item.sets.length <= 1}
                      style={{ opacity: item.sets.length <= 1 ? 0.3 : 1 }}
                    >
                      <Ionicons name="close" size={16} color={theme.textMuted} />
                    </Pressable>
                  </View>
                ))}
              </View>

              <Pressable onPress={() => handleAddSet(exIdx)} style={styles.addSetBtn}>
                <Ionicons name="add" size={16} color={theme.accent} />
                <Text variant="caption" color="accent" style={{ fontWeight: '600', marginLeft: 4 }}>
                  Add Target Set
                </Text>
              </Pressable>
            </View>
          ))}

          <Button
            title="Add Exercise"
            variant="secondary"
            size="md"
            icon={<Ionicons name="add" size={18} color={theme.text} />}
            onPress={() => setShowPicker(true)}
            fullWidth
          />
        </View>

        {/* Notes */}
        <Input
          label="Routine Notes (Optional)"
          placeholder="e.g. Focus on progressive overload on bench press"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <View style={styles.saveBtnContainer}>
          <Button
            title={routineId ? 'Update Routine' : 'Create Routine'}
            variant="primary"
            size="lg"
            onPress={handleSave}
            fullWidth
          />
        </View>
      </ScrollView>

      <ExercisePickerSheet
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelectExercise={handleAddExercise}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing['4xl'],
    gap: spacing.base,
  },
  section: {
    gap: spacing.xs,
  },
  sectionLabel: {
    letterSpacing: 0.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 2,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  newFolderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  exerciseCard: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  setsTable: {
    gap: spacing.xs,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  cell: {
    flex: 1,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  saveBtnContainer: {
    marginTop: spacing.sm,
  },
});
