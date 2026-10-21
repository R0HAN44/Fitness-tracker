/**
 * CustomExerciseSheet — modal sheet for creating and editing custom exercises.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Text } from '../typography/Text';
import { Sheet } from '../components/Sheet';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { NumberStepper } from '../components/NumberStepper';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radii } from '../theme/tokens';
import { MUSCLE_GROUPS, muscleGroupLabels, type MuscleGroup } from '../../constants/muscles';
import { EQUIPMENT_TYPES, equipmentLabels, type EquipmentType } from '../../constants/equipment';
import { EXERCISE_TYPES, type ExerciseType } from '../../db/schema';
import { createCustomExercise, updateExercise, type ExerciseRow } from '../../db/queries/exercises';
import { lightImpact, notificationSuccess } from '../../lib/haptics';

export interface CustomExerciseSheetProps {
  visible: boolean;
  onClose: () => void;
  exerciseToEdit?: ExerciseRow | null;
  onSave?: (savedExercise: ExerciseRow) => void;
}

export function CustomExerciseSheet({
  visible,
  onClose,
  exerciseToEdit,
  onSave,
}: CustomExerciseSheetProps) {
  const { theme } = useTheme();

  const [name, setName] = useState('');
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup>('chest');
  const [equipment, setEquipment] = useState<EquipmentType>('barbell');
  const [exerciseType, setExerciseType] = useState<ExerciseType>('weight_reps');
  const [defaultRestSeconds, setDefaultRestSeconds] = useState(90);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (exerciseToEdit) {
      setName(exerciseToEdit.name);
      setPrimaryMuscle((exerciseToEdit.primaryMuscle as MuscleGroup) || 'chest');
      setEquipment((exerciseToEdit.equipment as EquipmentType) || 'barbell');
      setExerciseType((exerciseToEdit.exerciseType as ExerciseType) || 'weight_reps');
      setDefaultRestSeconds(exerciseToEdit.defaultRestSeconds ?? 90);
      setNotes(exerciseToEdit.notes ?? '');
    } else {
      setName('');
      setPrimaryMuscle('chest');
      setEquipment('barbell');
      setExerciseType('weight_reps');
      setDefaultRestSeconds(90);
      setNotes('');
    }
  }, [exerciseToEdit, visible]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter an exercise name.');
      return;
    }

    lightImpact();

    try {
      let saved: ExerciseRow;

      if (exerciseToEdit) {
        saved = updateExercise(exerciseToEdit.id, {
          name: name.trim(),
          primaryMuscle,
          equipment,
          exerciseType,
          defaultRestSeconds,
          notes: notes.trim() || null,
        });
      } else {
        saved = createCustomExercise({
          name: name.trim(),
          primaryMuscle,
          equipment,
          exerciseType,
          defaultRestSeconds,
          notes: notes.trim() || undefined,
        });
      }

      notificationSuccess();
      if (onSave) onSave(saved);
      onClose();
    } catch (err) {
      console.error('Error saving custom exercise:', err);
      Alert.alert('Error', 'Failed to save exercise. Please try again.');
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={exerciseToEdit ? 'Edit Exercise' : 'New Custom Exercise'}
      subtitle={exerciseToEdit ? 'Update exercise properties' : 'Create a custom exercise for your library'}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Input
          label="Exercise Name *"
          placeholder="e.g. Bulgarian Split Squat"
          value={name}
          onChangeText={setName}
          autoFocus={!exerciseToEdit}
        />

        {/* Primary Muscle Selector */}
        <View style={styles.fieldSection}>
          <Text variant="caption" color="textMuted" style={styles.fieldLabel}>
            PRIMARY MUSCLE
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {MUSCLE_GROUPS.map((m) => {
              const selected = primaryMuscle === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => setPrimaryMuscle(m)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? theme.accent : theme.surface,
                      borderColor: selected ? theme.accent : theme.border,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: selected ? theme.onAccent : theme.text,
                      fontWeight: selected ? '700' : '500',
                    }}
                  >
                    {muscleGroupLabels[m]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Equipment Selector */}
        <View style={styles.fieldSection}>
          <Text variant="caption" color="textMuted" style={styles.fieldLabel}>
            EQUIPMENT
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {EQUIPMENT_TYPES.map((eq) => {
              const selected = equipment === eq;
              return (
                <Pressable
                  key={eq}
                  onPress={() => setEquipment(eq)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? theme.accent : theme.surface,
                      borderColor: selected ? theme.accent : theme.border,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: selected ? theme.onAccent : theme.text,
                      fontWeight: selected ? '700' : '500',
                    }}
                  >
                    {equipmentLabels[eq]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Exercise Type */}
        <View style={styles.fieldSection}>
          <Text variant="caption" color="textMuted" style={styles.fieldLabel}>
            LOGGING TYPE
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {EXERCISE_TYPES.map((t) => {
              const selected = exerciseType === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setExerciseType(t)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? theme.accent : theme.surface,
                      borderColor: selected ? theme.accent : theme.border,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: selected ? theme.onAccent : theme.text,
                      fontWeight: selected ? '700' : '500',
                    }}
                  >
                    {t.replace(/_/g, ' ')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Rest Timer */}
        <View style={styles.fieldSection}>
          <Text variant="caption" color="textMuted" style={styles.fieldLabel}>
            DEFAULT REST TIMER
          </Text>
          <NumberStepper
            value={defaultRestSeconds}
            onChange={setDefaultRestSeconds}
            step={15}
            min={0}
            max={600}
            unit="s"
          />
        </View>

        {/* Notes */}
        <Input
          label="Instructions & Notes (Optional)"
          placeholder="e.g. Set seat to height 4, wide grip"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <View style={styles.buttonContainer}>
          <Button
            title={exerciseToEdit ? 'Save Changes' : 'Create Exercise'}
            variant="primary"
            size="lg"
            onPress={handleSave}
            fullWidth
          />
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
  fieldSection: {
    gap: spacing.xs,
  },
  fieldLabel: {
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  chip: {
    height: 32,
    alignSelf: 'center',
    flexGrow: 0,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  buttonContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
