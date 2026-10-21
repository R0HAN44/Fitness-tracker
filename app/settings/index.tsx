/**
 * Settings hub — links to all settings sections.
 * Includes dev-only sample data tools (hidden in release builds).
 */

import React, { useState, useEffect } from 'react';
import { ScrollView, Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../src/ui/typography/Text';
import { ListRow } from '../../src/ui/components/ListRow';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { createStyles } from '../../src/ui/theme/createStyles';
import { spacing } from '../../src/ui/theme/tokens';
import { lightImpact, notificationSuccess } from '../../src/lib/haptics';
import {
  hasSampleData,
  loadSampleData,
  clearSampleData,
} from '../../src/db/devSampleData';
import {
  isAppLockConfigured,
  setAppLockConfigured,
  authenticateAppLock,
  isBiometricsSupported,
} from '../../src/lib/appLock';

export default function SettingsScreen() {
  const styles = useStyles();
  const { theme } = useTheme();

  const [sampleDataActive, setSampleDataActive] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [appLockActive, setAppLockActive] = useState(false);

  useEffect(() => {
    if (__DEV__) {
      setSampleDataActive(hasSampleData());
    }
    setAppLockActive(isAppLockConfigured());
  }, []);

  const handleToggleAppLock = async () => {
    lightImpact();
    if (!appLockActive) {
      const supported = await isBiometricsSupported();
      const prompt = supported
        ? 'Scan fingerprint or face to enable App Lock'
        : 'Authenticate to enable App Lock';

      const success = await authenticateAppLock(prompt);
      if (success) {
        setAppLockConfigured(true);
        setAppLockActive(true);
        notificationSuccess();
        Alert.alert('App Lock Enabled', 'Ironlog will require authentication when opened.');
      } else {
        Alert.alert('Authentication Failed', 'Could not verify your identity to enable App Lock.');
      }
    } else {
      const success = await authenticateAppLock('Authenticate to disable App Lock');
      if (success) {
        setAppLockConfigured(false);
        setAppLockActive(false);
        notificationSuccess();
        Alert.alert('App Lock Disabled', 'Biometric protection turned off.');
      }
    }
  };

  const handleLoadSample = () => {
    lightImpact();
    Alert.alert(
      'Load Sample Data?',
      'Generates 47 completed workouts spanning 16 weeks with progressive volume, balanced muscle groups, PRs, and body measurements. Real workouts and measurements are tagged and will never be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load Data',
          onPress: () => {
            setLoadingSample(true);
            try {
              const res = loadSampleData();
              setSampleDataActive(true);
              notificationSuccess();
              Alert.alert(
                'Sample Data Loaded',
                `Successfully created ${res.workoutsCount} workouts and ${res.entriesCount} body tracking entries across 16 weeks.`,
              );
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to load sample data.');
            } finally {
              setLoadingSample(false);
            }
          },
        },
      ],
    );
  };

  const handleClearSample = () => {
    lightImpact();
    Alert.alert(
      'Clear Sample Data?',
      'This will remove all sample workouts, sample sets, and sample measurements. Any real data you created is untouched and completely safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: () => {
            setLoadingSample(true);
            try {
              const res = clearSampleData();
              setSampleDataActive(false);
              notificationSuccess();
              Alert.alert(
                'Sample Data Cleared',
                `Removed ${res.deletedWorkoutsCount} sample workouts and ${res.deletedEntriesCount} sample measurement entries.`,
              );
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to clear sample data.');
            } finally {
              setLoadingSample(false);
            }
          },
        },
      ],
    );
  };

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
          onPress={() => router.push('/settings/import-export' as any)}
          showChevron
        />
        <ListRow
          label="Backup & Restore"
          icon={<Ionicons name="save-outline" size={18} color={theme.text} />}
          onPress={() => router.push('/settings/backup-restore' as any)}
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
          value={appLockActive ? 'On (Biometric)' : 'Off'}
          icon={<Ionicons name={appLockActive ? "lock-closed" : "lock-open-outline"} size={18} color={appLockActive ? theme.accent : theme.text} />}
          onPress={handleToggleAppLock}
          showChevron
        />

        {/* Dev-only sample data tools */}
        {__DEV__ && (
          <>
            <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
              DEVELOPER TOOLS (DEV BUILDS ONLY)
            </Text>
            <ListRow
              label="Load Sample Data"
              value={sampleDataActive ? 'Active (47 workouts)' : 'None'}
              icon={<Ionicons name="sparkles-outline" size={18} color={theme.accent} />}
              onPress={handleLoadSample}
            />
            {sampleDataActive && (
              <ListRow
                label="Clear Sample Data"
                icon={<Ionicons name="trash-outline" size={18} color={theme.danger} />}
                onPress={handleClearSample}
              />
            )}
          </>
        )}
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
