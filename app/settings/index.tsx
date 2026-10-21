/**
 * Settings hub — links to all settings sections.
 */

import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../src/ui/typography/Text';
import { ListRow } from '../../src/ui/components/ListRow';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { createStyles } from '../../src/ui/theme/createStyles';
import { spacing } from '../../src/ui/theme/tokens';

export default function SettingsScreen() {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Settings',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
          DISPLAY
        </Text>
        <ListRow
          label="Appearance"
          icon={<Ionicons name="color-palette-outline" size={18} color={theme.text} />}
          onPress={() => router.push('/settings/appearance')}
        />

        <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
          WORKOUT
        </Text>
        <ListRow
          label="Units"
          value="kg / cm"
          icon={<Ionicons name="swap-horizontal-outline" size={18} color={theme.text} />}
          showChevron
        />
        <ListRow
          label="Rest Timer"
          value="90s"
          icon={<Ionicons name="timer-outline" size={18} color={theme.text} />}
          showChevron
        />
        <ListRow
          label="Plate Setup"
          icon={<Ionicons name="disc-outline" size={18} color={theme.text} />}
          showChevron
        />

        <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
          DATA
        </Text>
        <ListRow
          label="Import & Export"
          icon={<Ionicons name="cloud-upload-outline" size={18} color={theme.text} />}
          showChevron
        />
        <ListRow
          label="Backup & Restore"
          icon={<Ionicons name="save-outline" size={18} color={theme.text} />}
          showChevron
        />

        <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
          GENERAL
        </Text>
        <ListRow
          label="Haptics"
          value="On"
          icon={<Ionicons name="phone-portrait-outline" size={18} color={theme.text} />}
          showChevron={false}
        />
        <ListRow
          label="App Lock"
          value="Off"
          icon={<Ionicons name="lock-closed-outline" size={18} color={theme.text} />}
          showChevron
        />
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
    paddingBottom: spacing['5xl'],
  },
  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
  },
}));
