/**
 * Workout tab — seamlessly switches between:
 *   1. LiveWorkoutView (when an active workout is in progress)
 *   2. Workout Dashboard (to start an empty workout or from routines)
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { OptionMenuSheet } from '../../src/ui/components/OptionMenuSheet';
import { ConfirmationSheet } from '../../src/ui/components/ConfirmationSheet';
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
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { exportRoutineAsJSON, importSharedRoutineJSON } from '../../src/db/queries/exportImport';

export default function WorkoutScreen() {
  const { theme } = useTheme();
  const { activeWorkout, isLoading, loadActiveWorkout, startWorkout } = useWorkoutStore();

  const [routinesList, setRoutinesList] = useState<FullRoutine[]>([]);
  const [folders, setFolders] = useState<RoutineFolderRow[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | undefined>(undefined);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Routine editor & option menu sheets
  const [showRoutineEditor, setShowRoutineEditor] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [menuRoutine, setMenuRoutine] = useState<FullRoutine | null>(null);
  const [deletingRoutine, setDeletingRoutine] = useState<FullRoutine | null>(null);

  const reloadRoutines = useCallback(() => {
    const allRoutines = getRoutines({
      folderId: selectedFolderId === undefined ? undefined : selectedFolderId,
    });
    setRoutinesList(allRoutines);

    const allFolders = getRoutineFolders();
    setFolders(allFolders);
  }, [selectedFolderId]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    routinesList.forEach((r) => {
      if (r.tags) {
        try {
          const tags: string[] = JSON.parse(r.tags);
          tags.forEach((t) => set.add(t));
        } catch {}
      }
    });
    return Array.from(set);
  }, [routinesList]);

  const displayedRoutines = useMemo(() => {
    if (!selectedTag) return routinesList;
    return routinesList.filter((r) => {
      if (!r.tags) return false;
      try {
        const tags: string[] = JSON.parse(r.tags);
        return tags.includes(selectedTag);
      } catch {
        return false;
      }
    });
  }, [routinesList, selectedTag]);

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
    lightImpact();
    setDeletingRoutine(routine);
  };

  const handleShareRoutine = async (routine: FullRoutine) => {
    lightImpact();
    try {
      const routineJson = exportRoutineAsJSON(routine.id);
      const filename = `${routine.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_routine.json`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, routineJson, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: `Share ${routine.name}`,
          UTI: 'public.json',
        });
        notificationSuccess();
      } else {
        Alert.alert('Sharing Unavailable', `Saved to ${fileUri}`);
      }
    } catch (e: any) {
      Alert.alert('Share Error', e.message || 'Could not export routine.');
    }
  };

  const handleImportRoutine = async () => {
    lightImpact();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      importSharedRoutineJSON(content);
      notificationSuccess();
      reloadRoutines();
      Alert.alert('Routine Imported', 'The shared routine was successfully added to your templates.');
    } catch (e: any) {
      Alert.alert('Import Failed', e.message || 'The selected file is not a valid routine JSON.');
    }
  };

  const handleOpenMenu = (routine: FullRoutine) => {
    lightImpact();
    setMenuRoutine(routine);
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

          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <Button
              title="Import"
              size="sm"
              variant="ghost"
              icon={<Ionicons name="download-outline" size={16} color={theme.text} />}
              onPress={handleImportRoutine}
            />
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
        </View>

        {/* Folder Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderRow}>
          <Pressable
            onPress={() => {
              lightImpact();
              setSelectedFolderId(undefined);
            }}
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
              All Folders
            </Text>
          </Pressable>

          {folders.map((folder) => {
            const isSelected = selectedFolderId === folder.id;
            return (
              <Pressable
                key={folder.id}
                onPress={() => {
                  lightImpact();
                  setSelectedFolderId(folder.id);
                }}
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

        {/* Tag Filter Chips */}
        {availableTags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderRow}>
            <Pressable
              onPress={() => {
                lightImpact();
                setSelectedTag(null);
              }}
              style={[
                styles.tagFilterChip,
                {
                  backgroundColor: selectedTag === null ? theme.text : theme.surface,
                  borderColor: selectedTag === null ? theme.text : theme.border,
                },
              ]}
            >
              <Text
                variant="caption"
                style={{
                  color: selectedTag === null ? theme.background : theme.textMuted,
                  fontWeight: selectedTag === null ? '700' : '500',
                }}
              >
                All Tags
              </Text>
            </Pressable>

            {availableTags.map((tag) => {
              const isSelected = selectedTag === tag;
              return (
                <Pressable
                  key={tag}
                  onPress={() => {
                    lightImpact();
                    setSelectedTag(isSelected ? null : tag);
                  }}
                  style={[
                    styles.tagFilterChip,
                    {
                      backgroundColor: isSelected ? theme.accent : theme.surface,
                      borderColor: isSelected ? theme.accent : theme.border,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: isSelected ? theme.onAccent : theme.textMuted,
                      fontWeight: isSelected ? '700' : '500',
                    }}
                  >
                    #{tag.replace(/_/g, ' ')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Routines List */}
        {displayedRoutines.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="clipboard-outline" size={36} color={theme.textMuted} />
            <Text variant="headingSm" color="text">
              No Routines Match Filter
            </Text>
            <Text variant="bodySm" color="textMuted" center>
              Try clearing folder or tag filters, or create a new routine template.
            </Text>
          </View>
        ) : (
          displayedRoutines.map((routine) => {
            const routineTags: string[] = routine.tags
              ? (() => {
                  try {
                    return JSON.parse(routine.tags);
                  } catch {
                    return [];
                  }
                })()
              : [];

            return (
              <View
                key={routine.id}
                style={[styles.routineCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={styles.routineHeader}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <View style={styles.titleRow}>
                      <Text
                        variant="headingSm"
                        numberOfLines={2}
                        ellipsizeMode="tail"
                        style={{ fontWeight: '700', flexShrink: 1 }}
                      >
                        {routine.name}
                      </Text>
                      {routine.isPreset ? (
                        <View style={[styles.presetBadge, { backgroundColor: theme.accent + '22', borderColor: theme.accent, flexShrink: 0 }]}>
                          <Text variant="caption" style={{ color: theme.accent, fontSize: 10, fontWeight: '700' }}>
                            PRESET
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {routine.folder ? (
                      <Text variant="caption" color="accent" numberOfLines={1} style={{ fontWeight: '600', marginTop: 2 }}>
                        📁 {routine.folder.name}
                      </Text>
                    ) : null}
                  </View>

                  <Pressable
                    onPress={() => handleOpenMenu(routine)}
                    hitSlop={8}
                    style={[styles.cardMenuBtn, { flexShrink: 0 }]}
                    accessibilityLabel={`Options for ${routine.name}`}
                  >
                    <Ionicons name="ellipsis-horizontal" size={20} color={theme.textMuted} />
                  </Pressable>
                </View>

                {/* Exercises preview */}
                <Text variant="bodySm" color="textMuted" numberOfLines={2} style={styles.exercisesPreview}>
                  {routine.exercises.map((re) => re.exercise.name).join(', ') || 'No exercises'}
                </Text>

                {/* Routine Tags */}
                {routineTags.length > 0 && (
                  <View style={styles.routineTagsRow}>
                    {routineTags.map((tag) => (
                      <View
                        key={tag}
                        style={[
                          styles.routineTagBadge,
                          { backgroundColor: theme.elevated, borderColor: theme.border },
                        ]}
                      >
                        <Text variant="caption" color="textMuted" style={{ fontSize: 11 }}>
                          #{tag.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

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
            );
          })
        )}
      </ScrollView>

      {/* Routine Options Sheet ("..." Menu) */}
      <OptionMenuSheet
        visible={!!menuRoutine}
        onClose={() => setMenuRoutine(null)}
        title={menuRoutine?.name}
        subtitle={menuRoutine?.folder ? `Folder: ${menuRoutine.folder.name}` : undefined}
        options={[
          {
            id: 'start',
            label: 'Start Workout',
            icon: 'play',
            onPress: () => menuRoutine && handleStartRoutine(menuRoutine.id),
          },
          {
            id: 'edit',
            label: 'Edit Routine',
            icon: 'create-outline',
            onPress: () => {
              if (menuRoutine) {
                setEditingRoutineId(menuRoutine.id);
                setShowRoutineEditor(true);
              }
            },
          },
          {
            id: 'share',
            label: 'Share Routine',
            icon: 'share-outline',
            onPress: () => menuRoutine && handleShareRoutine(menuRoutine),
          },
          {
            id: 'duplicate',
            label: 'Duplicate Routine',
            icon: 'copy-outline',
            onPress: () => menuRoutine && handleDuplicateRoutine(menuRoutine.id),
          },
          {
            id: 'delete',
            label: 'Delete Routine',
            icon: 'trash-outline',
            destructive: true,
            onPress: () => menuRoutine && handleDeleteRoutine(menuRoutine),
          },
        ]}
      />

      {/* Routine Editor Sheet */}
      <RoutineEditorSheet
        visible={showRoutineEditor}
        onClose={() => setShowRoutineEditor(false)}
        routineId={editingRoutineId}
        onSave={() => reloadRoutines()}
      />

      {/* Delete Routine Confirmation Sheet */}
      <ConfirmationSheet
        visible={!!deletingRoutine}
        onClose={() => setDeletingRoutine(null)}
        title="Delete Routine?"
        message={`Are you sure you want to delete "${deletingRoutine?.name}"? Past workouts logged from this routine will be preserved.`}
        confirmLabel="Delete Routine"
        cancelLabel="Keep Routine"
        destructive
        icon="trash-outline"
        onConfirm={() => {
          if (deletingRoutine) {
            deleteRoutine(deletingRoutine.id);
            reloadRoutines();
            setDeletingRoutine(null);
          }
        }}
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
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  folderChip: {
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
  tagFilterChip: {
    height: 30,
    alignSelf: 'center',
    flexGrow: 0,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  routineTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  routineTagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
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
