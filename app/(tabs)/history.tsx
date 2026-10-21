/**
 * History tab — Phase 1 placeholder.
 * Will display chronological workout history + calendar in Phase 3.
 */

import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../src/ui/typography/Text';
import { createStyles } from '../../src/ui/theme/createStyles';
import { spacing } from '../../src/ui/theme/tokens';

export default function HistoryScreen() {
  const styles = useStyles();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="displaySm">History</Text>
        <Text variant="body" color="textMuted" style={styles.subtitle}>
          Your past workouts will appear here.
        </Text>

        <View style={styles.emptyState}>
          <Text variant="headingLg" center>🏋️</Text>
          <Text variant="headingSm" center style={styles.emptyTitle}>
            No workouts yet
          </Text>
          <Text variant="bodySm" color="textMuted" center>
            Complete your first workout to start building your history.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = createStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    padding: spacing.base,
    paddingTop: spacing.xl,
  },
  subtitle: {
    marginBottom: spacing['3xl'],
  },
  emptyState: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: spacing['2xl'],
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    marginTop: spacing.sm,
  },
}));
