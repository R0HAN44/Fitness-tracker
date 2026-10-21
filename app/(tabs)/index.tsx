/**
 * Home / Dashboard tab — Phase 1 placeholder.
 * Will display weekly stats, recent workouts, and streak in Phase 4.
 */

import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../src/ui/typography/Text';
import { createStyles } from '../../src/ui/theme/createStyles';
import { spacing } from '../../src/ui/theme/tokens';

export default function HomeScreen() {
  const styles = useStyles();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="displaySm" style={styles.greeting}>
          Ironlog
        </Text>
        <Text variant="body" color="textMuted" style={styles.subtitle}>
          Your workout tracker
        </Text>

        <View style={styles.card}>
          <Text variant="headingSm">Ready to train?</Text>
          <Text variant="bodySm" color="textMuted" style={styles.cardBody}>
            Start an empty workout or pick a routine to begin logging sets.
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
  greeting: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing['2xl'],
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardBody: {
    marginTop: spacing.sm,
  },
}));
