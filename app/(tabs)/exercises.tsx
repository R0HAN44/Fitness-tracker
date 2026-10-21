/**
 * Exercises tab — comprehensive exercise library browser.
 * Supports:
 *   - Search & muscle group filtering
 *   - Sorting: A-Z, Most Used, Recently Used
 *   - Create custom exercises
 *   - Exercise detail screen (About tab) with edit & archive actions
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, Pressable, TextInput, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../src/ui/typography/Text';
import { SegmentedControl } from '../../src/ui/components/SegmentedControl';
import { ExerciseDetailSheet } from '../../src/ui/workout/ExerciseDetailSheet';
import { CustomExerciseSheet } from '../../src/ui/workout/CustomExerciseSheet';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { spacing, radii, fontFamily, typography } from '../../src/ui/theme/tokens';
import {
  getExercises,
  archiveExercise,
  unarchiveExercise,
  updateExercise,
  type ExerciseRow,
  type ExerciseSortOption,
} from '../../src/db/queries/exercises';
import { MUSCLE_GROUPS, muscleGroupLabels, type MuscleGroup } from '../../src/constants/muscles';
import { equipmentLabels, type EquipmentType } from '../../src/constants/equipment';
import { lightImpact } from '../../src/lib/haptics';

const SORT_OPTIONS: Array<{ value: ExerciseSortOption; label: string }> = [
  { value: 'name', label: 'A-Z' },
  { value: 'most_used', label: 'Most Used' },
  { value: 'recently_used', label: 'Recent' },
];

export default function ExercisesScreen() {
  const { theme } = useTheme();

  const [exercisesList, setExercisesList] = useState<ExerciseRow[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('all');
  const [sortBy, setSortBy] = useState<ExerciseSortOption>('name');

  // Sheet states
  const [selectedExercise, setSelectedExercise] = useState<ExerciseRow | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [showCustomSheet, setShowCustomSheet] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<ExerciseRow | null>(null);

  const reloadExercises = useCallback(() => {
    const data = getExercises({
      query: search,
      muscle: selectedMuscle,
      sortBy,
      includeArchived: false,
    });
    setExercisesList(data);
  }, [search, selectedMuscle, sortBy]);

  useEffect(() => {
    reloadExercises();
  }, [reloadExercises]);

  const handleSelectExercise = (exercise: ExerciseRow) => {
    lightImpact();
    setSelectedExercise(exercise);
    setShowDetailSheet(true);
  };

  const handleOpenCreateCustom = () => {
    lightImpact();
    setExerciseToEdit(null);
    setShowCustomSheet(true);
  };

  const handleOpenEditCustom = (exercise: ExerciseRow) => {
    setExerciseToEdit(exercise);
    setShowCustomSheet(true);
  };

  const handleToggleArchive = (exercise: ExerciseRow) => {
    if (exercise.deletedAt) {
      unarchiveExercise(exercise.id);
    } else {
      archiveExercise(exercise.id);
    }
    reloadExercises();
  };

  const handleRestSecondsChange = (exerciseId: string, seconds: number) => {
    updateExercise(exerciseId, { defaultRestSeconds: seconds });
    reloadExercises();
  };

  const renderExercise = ({ item }: { item: ExerciseRow }) => (
    <Pressable
      onPress={() => handleSelectExercise(item)}
      style={({ pressed }) => [
        styles.exerciseRow,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.name}
    >
      <View style={styles.exerciseInfo}>
        <View style={styles.nameRow}>
          <Text variant="body" style={{ fontWeight: '600' }}>
            {item.name}
          </Text>
          {item.isCustom && (
            <View style={[styles.customBadge, { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}>
              <Text variant="caption" style={{ color: theme.accent, fontSize: 10, fontWeight: '700' }}>
                CUSTOM
              </Text>
            </View>
          )}
        </View>
        <Text variant="caption" color="textMuted">
          {muscleGroupLabels[item.primaryMuscle as MuscleGroup] ?? item.primaryMuscle} ·{' '}
          {equipmentLabels[item.equipment as EquipmentType] ?? item.equipment}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text variant="displaySm">Exercises</Text>
            <Text variant="bodySm" color="textMuted">
              {exercisesList.length} exercises
            </Text>
          </View>
          <Pressable
            onPress={handleOpenCreateCustom}
            style={[styles.createBtn, { backgroundColor: theme.accent }]}
            hitSlop={8}
          >
            <Ionicons name="add" size={20} color={theme.onAccent} />
            <Text variant="bodySm" style={{ color: theme.onAccent, fontWeight: '700', marginLeft: 4 }}>
              Custom
            </Text>
          </Pressable>
        </View>

        {/* Sort Segmented Control */}
        <View style={styles.sortContainer}>
          <SegmentedControl
            options={SORT_OPTIONS}
            value={sortBy}
            onChange={(val) => setSortBy(val as ExerciseSortOption)}
          />
        </View>

        {/* Search Input */}
        <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search exercises or muscles..."
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={6}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* Muscle group filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Pressable
            onPress={() => setSelectedMuscle('all')}
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedMuscle === 'all' ? theme.accent : theme.surface,
                borderColor: selectedMuscle === 'all' ? theme.accent : theme.border,
              },
            ]}
          >
            <Text
              variant="caption"
              style={{
                color: selectedMuscle === 'all' ? theme.onAccent : theme.text,
                fontWeight: selectedMuscle === 'all' ? '700' : '500',
              }}
            >
              All Muscles
            </Text>
          </Pressable>
          {MUSCLE_GROUPS.map((m) => {
            const isSelected = selectedMuscle === m;
            return (
              <Pressable
                key={m}
                onPress={() => setSelectedMuscle(m)}
                style={[
                  styles.filterChip,
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
                  {muscleGroupLabels[m]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Exercises List */}
      <FlatList
        data={exercisesList}
        keyExtractor={(item) => item.id}
        renderItem={renderExercise}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={36} color={theme.textMuted} />
            <Text variant="body" color="textMuted" style={{ marginTop: 8 }}>
              No exercises found
            </Text>
          </View>
        }
      />

      {/* Detail Sheet */}
      <ExerciseDetailSheet
        exercise={selectedExercise}
        visible={showDetailSheet}
        onClose={() => setShowDetailSheet(false)}
        onEdit={handleOpenEditCustom}
        onArchiveToggle={handleToggleArchive}
        onRestSecondsChange={handleRestSecondsChange}
      />

      {/* Custom Exercise Sheet */}
      <CustomExerciseSheet
        visible={showCustomSheet}
        onClose={() => setShowCustomSheet(false)}
        exerciseToEdit={exerciseToEdit}
        onSave={(saved) => {
          reloadExercises();
          setSelectedExercise(saved);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  sortContainer: {
    marginTop: spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontFamily: fontFamily.regular,
    fontSize: typography.body.fontSize,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  list: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing['5xl'],
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  customBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  emptyContainer: {
    paddingVertical: spacing['4xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
