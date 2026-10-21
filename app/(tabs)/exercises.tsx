/**
 * Exercises tab — exercise library browser.
 * Displays the seeded exercise list with search, filtering by
 * muscle group and equipment. Full UI built in Phase 2.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { View, FlatList, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../src/ui/typography/Text';
import { createStyles } from '../../src/ui/theme/createStyles';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { spacing, radii, fontFamily, typography } from '../../src/ui/theme/tokens';
import { getDb } from '../../src/db/client';
import { exercises } from '../../src/db/schema';
import { isNull } from 'drizzle-orm';
import { muscleGroupLabels, type MuscleGroup } from '../../src/constants/muscles';
import { equipmentLabels, type EquipmentType } from '../../src/constants/equipment';

type ExerciseRow = typeof exercises.$inferSelect;

export default function ExercisesScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const [allExercises, setAllExercises] = useState<ExerciseRow[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const db = getDb();
    const rows = db
      .select()
      .from(exercises)
      .where(isNull(exercises.deletedAt))
      .orderBy(exercises.name)
      .all();
    setAllExercises(rows);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return allExercises;
    const q = search.toLowerCase();
    return allExercises.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.primaryMuscle.toLowerCase().includes(q) ||
        e.equipment.toLowerCase().includes(q),
    );
  }, [allExercises, search]);

  const renderExercise = ({ item }: { item: ExerciseRow }) => (
    <Pressable
      style={({ pressed }) => [
        styles.exerciseRow,
        pressed && styles.exerciseRowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.name}
    >
      <View style={styles.exerciseInfo}>
        <Text variant="body">{item.name}</Text>
        <Text variant="caption" color="textMuted">
          {muscleGroupLabels[item.primaryMuscle as MuscleGroup]} · {equipmentLabels[item.equipment as EquipmentType]}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="displaySm">Exercises</Text>
        <Text variant="bodySm" color="textMuted" style={styles.count}>
          {filtered.length} exercises
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={theme.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="Search exercises"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderExercise}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
      />
    </SafeAreaView>
  );
}

const useStyles = createStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  count: {
    marginTop: spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: radii.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontFamily: fontFamily.regular,
    fontSize: typography.body.fontSize,
    color: theme.text,
  },
  list: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['5xl'],
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  exerciseRowPressed: {
    backgroundColor: theme.elevated,
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
}));
