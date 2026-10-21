/**
 * Workout tab — seamlessly switches between:
 *   1. LiveWorkoutView (when an active workout is in progress)
 *   2. Workout Dashboard (to start an empty workout or from routines)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../src/ui/typography/Text';
import { Button } from '../../src/ui/components/Button';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { spacing, radii, layout } from '../../src/ui/theme/tokens';
import { useWorkoutStore } from '../../src/state/workoutStore';
import { LiveWorkoutView } from '../../src/ui/workout/LiveWorkoutView';
import { RoutineEditorSheet } from '../../src/ui/workout/RoutineEditorSheet';
import {
  getRoutines,
  getRoutineFolders,
  duplicateRoutine,
  deleteRoutine,
  startWorkoutFromRoutine,
  type FullRoutine,
  type RoutineFolderRow,
} from '../../src/db/queries/routines';
import { lightImpact, notificationSuccess } from '../../src/lib/haptics';

export default function WorkoutScreen() {
  const { theme } = useTheme();
  const { activeWorkout, isLoading, loadActiveWorkout, startWorkout } = useWorkoutStore();

  const [routinesList, setRoutinesList] = useState<FullRoutine[]>([]);
  const [folders, setFolders] = useState<RoutineFolderRow[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | undefined>(undefined);

  // Routine editor sheet
  const [showRoutineEditor, setShowRoutineEditor] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);

  const reloadRoutines = useCallback(() => {
    const allRoutines = getRoutines({
      folderId: selectedFolderId === undefined ? undefined : selectedFolderId,
    });
    setRoutinesList(allRoutines);

    const allFolders = getRoutineFolders();
    setFolders(allFolders);
  }, [selectedFolderId]);

  useEffect(() => {
    loadActiveWorkout();
    reloadRoutines();
  }, [loadActiveWorkout, reloadRoutines]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  // If workout is active, show the live logging screen
  if (activeWorkout) {
    return <LiveWorkoutView />;
  }

  const handleStartEmpty = () => {
    lightImpact();
    startWorkout();
  };

  const handleStartRoutine = (routineId: string) => {
    lightImpact();
    try {
      startWorkoutFromRoutine(routineId);
      loadActiveWorkout();
    } catch (err) {
      console.error('Error starting workout from routine:', err);
      Alert.alert('Error', 'Failed to start workout from routine.');
    }
  };

  const handleDuplicateRoutine = (routineId: string) => {
    lightImpact();
    try {
      duplicateRoutine(routineId);
      notificationSuccess();
      reloadRoutines();
    } catch (err) {
      console.error('Error duplicating routine:', err);
    }
  };

  const handleDeleteRoutine = (routine: FullRoutine) => {
    Alert.alert(
      'Delete Routine?',
      `Are you sure you want to delete "${routine.name}"? Past workouts logged from this routine will be preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            lightImpact();
            deleteRoutine(routine.id);
            reloadRoutines();
          },
        },
      ],
    );
  };

  const handleOpenMenu = (routine: FullRoutine) => {
    Alert.alert(routine.name, 'Choose an option', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start Workout',
        onPress: () => handleStartRoutine(routine.id),
      },
      {
        text: 'Edit Routine',
        onPress: () => {
          setEditingRoutineId(routine.id);
          setShowRoutineEditor(true);
        },
      },
      {
        text: 'Duplicate Routine',
        onPress: () => handleDuplicateRoutine(routine.id),
      },
      {
        text: 'Delete Routine',
        style: 'destructive',
        onPress: () => handleDeleteRoutine(routine),
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="displaySm">Workout</Text>
          <Text variant="body" color="textMuted">
            Track your training session
          </Text>
        </View>

        {/* Start Empty Workout Button */}
        <Pressable
          onPress={handleStartEmpty}
          style={({ pressed }) => [
            styles.startButton,
            { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Start empty workout"
        >
          <Ionicons name="play" size={22} color={theme.onAccent} />
          <Text variant="headingSm" style={{ color: theme.onAccent, marginLeft: spacing.sm }}>
            Start Empty Workout
          </Text>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Routines Section Header */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text variant="headingSm">Routines</Text>
            <Text variant="caption" color="textMuted">
              {routinesList.length} templates
            </Text>
          </View>

          <Button
            title="New Routine"
            size="sm"
            variant="secondary"
            icon={<Ionicons name="add" size={16} color={theme.text} />}
            onPress={() => {
              lightImpact();
              setEditingRoutineId(null);
              setShowRoutineEditor(true);
            }}
          />
        </View>

        {/* Folder Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderRow}>
          <Pressable
            onPress={() => setSelectedFolderId(undefined)}
            style={[
              styles.folderChip,
              {
                backgroundColor: selectedFolderId === undefined ? theme.accent : theme.surface,
                borderColor: selectedFolderId === undefined ? theme.accent : theme.border,
              },
            ]}
          >
            <Text
              variant="caption"
              style={{
                color: selectedFolderId === undefined ? theme.onAccent : theme.text,
                fontWeight: selectedFolderId === undefined ? '700' : '500',
              }}
            >
              All
            </Text>
          </Pressable>

          {folders.map((folder) => {
            const isSelected = selectedFolderId === folder.id;
            return (
              <Pressable
                key={folder.id}
                onPress={() => setSelectedFolderId(folder.id)}
                style={[
                  styles.folderChip,
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
                  {folder.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Routines List */}
        {routinesList.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="clipboard-outline" size={36} color={theme.textMuted} />
            <Text variant="headingSm" color="text">
              No Routines in this Folder
            </Text>
            <Text variant="bodySm" color="textMuted" center>
              Create custom routines to quickly launch your favorite workouts.
            </Text>
          </View>
        ) : (
          routinesList.map((routine) => (
            <View
              key={routine.id}
              style={[styles.routineCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={styles.routineHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text variant="headingSm" style={{ fontWeight: '700' }}>
                      {routine.name}
                    </Text>
                    {routine.isPreset ? (
                      <View style={[styles.presetBadge, { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}>
                        <Text variant="caption" style={{ color: theme.accent, fontSize: 10, fontWeight: '700' }}>
                          PRESET
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {routine.folder ? (
                    <Text variant="caption" color="accent" style={{ fontWeight: '600', marginTop: 2 }}>
                      📁 {routine.folder.name}
                    </Text>
                  ) : null}
                </View>

                <Pressable onPress={() => handleOpenMenu(routine)} hitSlop={8} style={styles.cardMenuBtn}>
                  <Ionicons name="ellipsis-horizontal" size={20} color={theme.textMuted} />
                </Pressable>
              </View>

              {/* Exercises preview */}
              <Text variant="bodySm" color="textMuted" numberOfLines={2} style={styles.exercisesPreview}>
                {routine.exercises.map((re) => re.exercise.name).join(', ') || 'No exercises'}
              </Text>

              {/* Card Footer: Start Routine Button */}
              <View style={styles.routineFooter}>
                <Text variant="caption" color="textMuted">
                  {routine.exercises.length} {routine.exercises.length === 1 ? 'exercise' : 'exercises'}
                </Text>
                <Button
                  title="Start Routine"
                  size="sm"
                  variant="primary"
                  icon={<Ionicons name="play" size={14} color={theme.onAccent} />}
                  onPress={() => handleStartRoutine(routine.id)}
                />
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Routine Editor Sheet */}
      <RoutineEditorSheet
        visible={showRoutineEditor}
        onClose={() => setShowRoutineEditor(false)}
        routineId={editingRoutineId}
        onSave={() => reloadRoutines()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing['5xl'],
    gap: spacing.base,
  },
  header: {
    marginBottom: spacing.xs,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    minHeight: layout.minTouchTarget,
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  folderRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  folderChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  routineCard: {
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  presetBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  cardMenuBtn: {
    padding: spacing.xs,
  },
  exercisesPreview: {
    lineHeight: 18,
  },
  routineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  emptyState: {
    borderRadius: radii.lg,
    padding: spacing['2xl'],
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
});
