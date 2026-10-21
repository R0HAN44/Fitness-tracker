/**
 * ExercisePickerSheet — bottom sheet for searching and adding exercises to a workout.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Sheet } from '../components/Sheet';
import { Input } from '../components/Input';
import { Chip } from '../components/Chip';
import { Text } from '../typography/Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radii } from '../theme/tokens';
import { getExercises, type ExerciseRow } from '../../db/queries/exercises';
import { lightImpact } from '../../lib/haptics';
import { Ionicons } from '@expo/vector-icons';

export interface ExercisePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: ExerciseRow) => void;
}

const MUSCLES = [
  { id: 'all', label: 'All' },
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'legs', label: 'Legs' },
  { id: 'arms', label: 'Arms' },
  { id: 'core', label: 'Core' },
];

const EQUIPMENT = [
  { id: 'all', label: 'All Equipment' },
  { id: 'barbell', label: 'Barbell' },
  { id: 'dumbbell', label: 'Dumbbell' },
  { id: 'cable', label: 'Cable' },
  { id: 'machine', label: 'Machine' },
  { id: 'bodyweight', label: 'Bodyweight' },
];

export function ExercisePickerSheet({
  visible,
  onClose,
  onSelectExercise,
}: ExercisePickerSheetProps) {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('all');
  const [selectedEquipment, setSelectedEquipment] = useState('all');

  const exercisesList = useMemo(() => {
    if (!visible) return [];
    return getExercises({
      query: search,
      muscle: selectedMuscle !== 'all' ? selectedMuscle : undefined,
      equipment: selectedEquipment !== 'all' ? selectedEquipment : undefined,
      limit: 150,
    });
  }, [visible, search, selectedMuscle, selectedEquipment]);

  const handleSelect = (exercise: ExerciseRow) => {
    lightImpact();
    onSelectExercise(exercise);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Add Exercise"
      subtitle={`${exercisesList.length} exercises found`}
      maxHeight={Dimensions.get('window').height * 0.9}
    >
      <View style={styles.container}>
        {/* Search input */}
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises by name or muscle..."
          prefix={<Ionicons name="search" size={18} color={theme.textMuted} />}
          clearable
          containerStyle={styles.searchInput}
        />

        {/* Filter chips: Muscles */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {MUSCLES.map((m) => (
            <Chip
              key={m.id}
              label={m.label}
              selected={selectedMuscle === m.id}
              onPress={() => setSelectedMuscle(m.id)}
            />
          ))}
        </ScrollView>

        {/* Filter chips: Equipment */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {EQUIPMENT.map((eq) => (
            <Chip
              key={eq.id}
              label={eq.label}
              selected={selectedEquipment === eq.id}
              onPress={() => setSelectedEquipment(eq.id)}
            />
          ))}
        </ScrollView>

        {/* Exercises list */}
        <FlatList
          data={exercisesList}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          style={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleSelect(item)}
              style={({ pressed }) => [
                styles.itemRow,
                {
                  backgroundColor: pressed ? theme.elevated : theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.itemInfo}>
                <Text variant="headingSm" color="text">
                  {item.name}
                </Text>
                <View style={styles.badgeRow}>
                  <Text variant="caption" color="accent" style={{ textTransform: 'capitalize' }}>
                    {item.primaryMuscle}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {' • '}
                  </Text>
                  <Text variant="caption" color="textMuted" style={{ textTransform: 'capitalize' }}>
                    {item.equipment}
                  </Text>
                </View>
              </View>

              <Ionicons name="add-circle" size={24} color={theme.accent} />
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text variant="body" color="textMuted" center>
                No exercises found matching your filter.
              </Text>
            </View>
          }
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  container: {
    height: Dimensions.get('window').height * 0.72,
  },
  searchInput: {
    marginBottom: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  list: {
    marginTop: spacing.sm,
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing['2xl'],
    gap: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  emptyContainer: {
    paddingVertical: spacing['3xl'],
  },
});
