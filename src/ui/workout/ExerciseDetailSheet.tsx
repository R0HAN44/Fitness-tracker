/**
 * ExerciseDetailSheet — displays comprehensive exercise details (About tab).
 *
 * Shows muscle groups, equipment type, exercise execution type, default rest timer,
 * notes, and management actions (edit, archive/restore) for custom exercises.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Text } from '../typography/Text';
import { Sheet } from '../components/Sheet';
import { Button } from '../components/Button';
import { NumberStepper } from '../components/NumberStepper';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radii } from '../theme/tokens';
import { muscleGroupLabels, type MuscleGroup } from '../../constants/muscles';
import { equipmentLabels, type EquipmentType } from '../../constants/equipment';
import { formatDuration } from '../../lib/units';
import { lightImpact } from '../../lib/haptics';
import { Ionicons } from '@expo/vector-icons';
import type { ExerciseRow } from '../../db/queries/exercises';

export interface ExerciseDetailSheetProps {
  exercise: ExerciseRow | null;
  visible: boolean;
  onClose: () => void;
  onEdit?: (exercise: ExerciseRow) => void;
  onArchiveToggle?: (exercise: ExerciseRow) => void;
  onRestSecondsChange?: (exerciseId: string, seconds: number) => void;
}

export function ExerciseDetailSheet({
  exercise,
  visible,
  onClose,
  onEdit,
  onArchiveToggle,
  onRestSecondsChange,
}: ExerciseDetailSheetProps) {
  const { theme } = useTheme();
  const [restSeconds, setRestSeconds] = useState(exercise?.defaultRestSeconds ?? 90);

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

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={exercise.name}
      subtitle={exercise.isCustom ? 'Custom Exercise' : 'Built-in Exercise'}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top Badges */}
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
            <Text variant="bodySm" color="textMuted">
              Exercise Type
            </Text>
            <Text variant="bodySm" color="text" style={{ textTransform: 'capitalize' }}>
              {exercise.exerciseType.replace(/_/g, ' ')}
            </Text>
          </View>

          {secondaryMuscles.length > 0 && (
            <View style={styles.infoRow}>
              <Text variant="bodySm" color="textMuted">
                Secondary Muscles
              </Text>
              <Text variant="bodySm" color="text">
                {secondaryMuscles
                  .map((m) => muscleGroupLabels[m as MuscleGroup] ?? m)
                  .join(', ')}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text variant="bodySm" color="textMuted">
              Default Rest Timer
            </Text>
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
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: {
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
});
