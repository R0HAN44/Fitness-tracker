/**
 * Personal Records Board — displays all current PRs across all exercises.
 * Fully local, sorted by recently achieved, with search & record type filters.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, Pressable, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../src/ui/typography/Text';
import { SegmentedControl } from '../../src/ui/components/SegmentedControl';
import { ExerciseDetailSheet } from '../../src/ui/workout/ExerciseDetailSheet';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { spacing, radii, fontFamily, typography } from '../../src/ui/theme/tokens';
import { getAllPersonalRecords, type GlobalPRItem } from '../../src/db/queries/workouts';
import { getExercises, type ExerciseRow } from '../../src/db/queries/exercises';
import { lightImpact } from '../../src/lib/haptics';

export default function RecordsScreen() {
  const { theme } = useTheme();

  const [allPRs, setAllPRs] = useState<GlobalPRItem[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Exercise sheet
  const [selectedExercise, setSelectedExercise] = useState<ExerciseRow | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);

  const loadPRs = useCallback(() => {
    try {
      const prs = getAllPersonalRecords();
      setAllPRs(prs);
    } catch (e) {
      console.error('Error loading PRs:', e);
    }
  }, []);

  useEffect(() => {
    loadPRs();
  }, [loadPRs]);

  const filteredPRs = allPRs.filter((pr) => {
    if (filterType !== 'all' && pr.recordType !== filterType) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        pr.exerciseName.toLowerCase().includes(q) ||
        pr.primaryMuscle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCardPress = (pr: GlobalPRItem) => {
    lightImpact();
    const rows = getExercises({ query: pr.exerciseName, limit: 1 });
    if (rows.length > 0) {
      setSelectedExercise(rows[0]);
      setShowDetailSheet(true);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getRecordLabel = (type: string) => {
    switch (type) {
      case 'max_weight': return 'Max Weight';
      case 'best_1rm': return 'Best 1RM';
      case 'best_set_volume': return 'Set Volume';
      case 'max_reps_at_weight': return 'Max Reps';
      default: return type;
    }
  };

  const renderPR = ({ item }: { item: GlobalPRItem }) => {
    const isWeightPR = item.recordType === 'max_weight' || item.recordType === 'best_1rm';
    const isVolPR = item.recordType === 'best_set_volume';

    return (
      <Pressable
        onPress={() => handleCardPress(item)}
        style={({ pressed }) => [
          styles.prCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={styles.prCardLeft}>
          <View style={styles.titleRow}>
            <Text variant="body" style={{ fontWeight: '700' }}>
              {item.exerciseName}
            </Text>
            <View style={[styles.badge, { backgroundColor: theme.prGold + '22', borderColor: theme.prGold }]}>
              <Text variant="caption" style={{ color: theme.prGold, fontSize: 10, fontWeight: '800' }}>
                🏆 {getRecordLabel(item.recordType).toUpperCase()}
              </Text>
            </View>
          </View>
          <Text variant="caption" color="textMuted" style={{ textTransform: 'capitalize' }}>
            {item.primaryMuscle} · {item.equipment}
          </Text>
          <Text variant="caption" color="textMuted" style={{ marginTop: 4 }}>
            Achieved {formatDate(item.achievedAt)}
          </Text>
        </View>

        <View style={styles.prCardRight}>
          <Text variant="headingSm" style={{ color: theme.prGold, fontWeight: '900' }} tabular>
            {item.value} {isVolPR ? 'kg' : isWeightPR ? 'kg' : 'reps'}
          </Text>
          {item.reps && item.recordType !== 'max_reps_at_weight' ? (
            <Text variant="caption" color="textMuted">
              for {item.reps} {item.reps === 1 ? 'rep' : 'reps'}
            </Text>
          ) : item.weightKg ? (
            <Text variant="caption" color="textMuted">
              @ {item.weightKg} kg
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Personal Records',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginRight: spacing.md }}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.header}>
        <Text variant="bodySm" color="textMuted">
          {filteredPRs.length} {filteredPRs.length === 1 ? 'personal record' : 'personal records'} earned
        </Text>

        {/* Filter type segmented control */}
        <SegmentedControl
          options={[
            { label: 'All', value: 'all' },
            { label: 'Max Wt', value: 'max_weight' },
            { label: '1RM', value: 'best_1rm' },
            { label: 'Volume', value: 'best_set_volume' },
            { label: 'Reps', value: 'max_reps_at_weight' },
          ]}
          value={filterType}
          onChange={(v) => {
            lightImpact();
            setFilterType(v);
          }}
          size="sm"
        />

        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search" size={16} color={theme.textMuted} style={{ marginRight: spacing.xs }} />
          <TextInput
            placeholder="Search exercise or muscle..."
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={6}>
              <Ionicons name="close-circle" size={16} color={theme.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filteredPRs}
        keyExtractor={(item) => item.id}
        renderItem={renderPR}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={44} color={theme.textMuted} />
            <Text variant="headingSm" style={{ marginTop: spacing.sm }}>No Records Found</Text>
            <Text variant="bodySm" color="textMuted" center style={{ marginTop: 4 }}>
              Complete sets in your workouts to automatically establish personal records.
            </Text>
          </View>
        }
      />

      <ExerciseDetailSheet
        exercise={selectedExercise}
        visible={showDetailSheet}
        onClose={() => setShowDetailSheet(false)}
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.xs,
    fontSize: typography.bodySm.fontSize,
    fontFamily: fontFamily.regular,
  },
  list: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['5xl'],
    gap: spacing.xs,
  },
  prCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  prCardLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  prCardRight: {
    alignItems: 'flex-end',
  },
  emptyContainer: {
    paddingVertical: spacing['5xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
