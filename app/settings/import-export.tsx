/**
 * Import & Export Screen — Migrate data to and from Ironlog.
 * - Export completed workouts to standard CSV
 * - Import workouts from Hevy or Strong CSV with deduplication
 */

import React, { useState } from 'react';
import { View, ScrollView, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Text } from '../../src/ui/typography/Text';
import { Button } from '../../src/ui/components/Button';
import { ListRow } from '../../src/ui/components/ListRow';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { spacing, radii } from '../../src/ui/theme/tokens';
import { lightImpact, notificationSuccess } from '../../src/lib/haptics';
import {
  exportWorkoutsAsCSV,
  importExternalCSVWorkouts,
} from '../../src/db/queries/exportImport';

export default function ImportExportScreen() {
  const { theme } = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExportCSV = async () => {
    lightImpact();
    setIsExporting(true);
    try {
      const csvData = exportWorkoutsAsCSV();
      if (!csvData || csvData.trim().length === 0) {
        Alert.alert('No Workouts', 'No completed workouts to export.');
        return;
      }

      const fileUri = `${FileSystem.cacheDirectory}ironlog_workouts_${new Date().toISOString().slice(0, 10)}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvData, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Ironlog Workouts',
          UTI: 'public.comma-separated-values-text',
        });
        notificationSuccess();
      } else {
        Alert.alert('Sharing Unavailable', `Saved to ${fileUri}`);
      }
    } catch (e: any) {
      Alert.alert('Export Error', e.message || 'Could not export workouts.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportCSV = async () => {
    lightImpact();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const fileUri = result.assets[0].uri;
      setIsImporting(true);

      const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const res = await importExternalCSVWorkouts(content);
      notificationSuccess();

      Alert.alert(
        'Import Successful',
        `Format detected: ${res.format.toUpperCase()}\n\n• Imported: ${res.importedCount} workouts\n• Skipped (duplicates): ${res.skippedDuplicatesCount}`,
      );
    } catch (e: any) {
      Alert.alert('Import Failed', e.message || 'Unable to import CSV.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Import & Export',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headingLg" style={{ fontWeight: '800' }}>
            Data Migration
          </Text>
          <Text variant="body" color="textMuted">
            Export your workouts to standard CSV or import from Hevy and Strong.
          </Text>
        </View>

        {/* Export Section */}
        <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
          EXPORT
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: theme.elevated }]}>
              <Ionicons name="document-text-outline" size={20} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body" style={{ fontWeight: '700' }}>
                Export Workouts (CSV)
              </Text>
              <Text variant="caption" color="textMuted">
                Compatible with Excel, Sheets, and analytical tools.
              </Text>
            </View>
          </View>

          <Button
            title={isExporting ? 'Exporting...' : 'Export Workouts'}
            variant="secondary"
            size="md"
            icon={isExporting ? <ActivityIndicator size="small" color={theme.text} /> : <Ionicons name="share-outline" size={18} color={theme.text} />}
            onPress={handleExportCSV}
            disabled={isExporting}
          />
        </View>

        {/* Import Section */}
        <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
          IMPORT
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: theme.elevated }]}>
              <Ionicons name="cloud-download-outline" size={20} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body" style={{ fontWeight: '700' }}>
                Import from Hevy or Strong
              </Text>
              <Text variant="caption" color="textMuted">
                Select your exported CSV file. Auto-detects format and skips duplicate workouts.
              </Text>
            </View>
          </View>

          <Button
            title={isImporting ? 'Importing Workouts...' : 'Choose CSV File'}
            variant="primary"
            size="md"
            icon={isImporting ? <ActivityIndicator size="small" color={theme.onAccent} /> : <Ionicons name="folder-open-outline" size={18} color={theme.onAccent} />}
            onPress={handleImportCSV}
            disabled={isImporting}
          />
        </View>

        {/* Instructions */}
        <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
          HOW TO EXPORT FROM OTHER APPS
        </Text>
        <View style={[styles.guideCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text variant="bodySm" style={{ fontWeight: '700', marginBottom: 4 }}>
            From Hevy:
          </Text>
          <Text variant="caption" color="textMuted" style={{ lineHeight: 18 }}>
            1. Open Hevy → Go to Profile{'\n'}
            2. Tap Settings (gear icon){'\n'}
            3. Tap "Export Data" and save the CSV file to your device{'\n'}
            4. Tap "Choose CSV File" above to import
          </Text>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <Text variant="bodySm" style={{ fontWeight: '700', marginBottom: 4 }}>
            From Strong:
          </Text>
          <Text variant="caption" color="textMuted" style={{ lineHeight: 18 }}>
            1. Open Strong → Go to More / Settings{'\n'}
            2. Tap "Export Workout Data"{'\n'}
            3. Save the CSV file and select it above
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing['5xl'],
    gap: spacing.base,
  },
  header: {
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: spacing.xs,
    marginTop: spacing.sm,
  },
  card: {
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.base,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideCard: {
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
});
