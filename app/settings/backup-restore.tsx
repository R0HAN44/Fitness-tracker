/**
 * Backup & Restore Screen — Complete database JSON export and restore.
 * Supports merge and overwrite restore modes.
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Text } from '../../src/ui/typography/Text';
import { Button } from '../../src/ui/components/Button';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { spacing, radii } from '../../src/ui/theme/tokens';
import { lightImpact, notificationSuccess } from '../../src/lib/haptics';
import { getSettings } from '../../src/db/queries/settings';
import {
  exportAllDataAsJSON,
  restoreFromBackupJSON,
} from '../../src/db/queries/exportImport';
import { validateBackupJSON } from '../../src/domain/exportImport';

export default function BackupRestoreScreen() {
  const { theme } = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

  useEffect(() => {
    try {
      const s = getSettings();
      setLastBackupDate(s.lastBackupAt ?? null);
    } catch (e) {
      console.warn('Could not load settings backup info:', e);
    }
  }, []);

  const handleCreateBackup = async () => {
    lightImpact();
    setIsExporting(true);
    try {
      const backupJson = exportAllDataAsJSON();
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileUri = `${FileSystem.cacheDirectory}ironlog_backup_${dateStr}.json`;

      await FileSystem.writeAsStringAsync(fileUri, backupJson, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      setLastBackupDate(new Date().toISOString());

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Save Ironlog Backup',
          UTI: 'public.json',
        });
        notificationSuccess();
      } else {
        Alert.alert('Backup Created', `Saved to ${fileUri}`);
      }
    } catch (e: any) {
      Alert.alert('Backup Error', e.message || 'Failed to create backup.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreBackup = async () => {
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

      const validation = validateBackupJSON(content);
      if (!validation.valid || !validation.data) {
        Alert.alert('Invalid Backup', validation.error || 'The selected file is not a valid Ironlog backup.');
        return;
      }

      const bData = validation.data;
      const previewMsg = `Contains:\n• ${bData.workouts.length} workouts\n• ${bData.routines.length} routines\n• ${bData.measurements.length} measurement metrics\nExported: ${new Date(bData.exportedAt).toLocaleDateString()}`;

      Alert.alert(
        'Restore Backup',
        `${previewMsg}\n\nChoose restore strategy:`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Merge (Keep Existing)',
            onPress: () => performRestore(content, 'merge'),
          },
          {
            text: 'Overwrite (Replace All)',
            style: 'destructive',
            onPress: () => performRestore(content, 'overwrite'),
          },
        ],
      );
    } catch (e: any) {
      Alert.alert('Restore Error', e.message || 'Could not read backup file.');
    }
  };

  const performRestore = async (content: string, mode: 'merge' | 'overwrite') => {
    setIsRestoring(true);
    try {
      const res = await restoreFromBackupJSON(content, mode);
      notificationSuccess();
      Alert.alert(
        'Restore Complete',
        `Successfully restored:\n• ${res.workoutsRestored} workouts\n• ${res.routinesRestored} routines\n• ${res.measurementsRestored} measurement entries`,
      );
    } catch (e: any) {
      Alert.alert('Restore Failed', e.message || 'An error occurred during restore.');
    } finally {
      setIsRestoring(false);
    }
  };

  const formatLastBackup = () => {
    if (!lastBackupDate) return 'Never';
    return new Date(lastBackupDate).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Backup & Restore',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headingLg" style={{ fontWeight: '800' }}>
            Full Database Backup
          </Text>
          <Text variant="body" color="textMuted">
            Export a versioned JSON archive of all workouts, routines, and body measurements.
          </Text>
        </View>

        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.statusRow}>
            <Text variant="caption" color="textMuted">LAST BACKUP</Text>
            <Text variant="bodySm" style={{ fontWeight: '700' }}>{formatLastBackup()}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.statusRow}>
            <Text variant="caption" color="textMuted">BACKUP FORMAT</Text>
            <Text variant="bodySm" style={{ fontWeight: '700' }}>Version 1.0 (Plain JSON)</Text>
          </View>
        </View>

        {/* Create Backup */}
        <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
          CREATE BACKUP
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: theme.elevated }]}>
              <Ionicons name="save-outline" size={20} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body" style={{ fontWeight: '700' }}>
                Export Full Backup (JSON)
              </Text>
              <Text variant="caption" color="textMuted">
                Save to Google Drive, local storage, or share to another device.
              </Text>
            </View>
          </View>

          <Button
            title={isExporting ? 'Creating Backup...' : 'Create Backup'}
            variant="primary"
            size="md"
            icon={isExporting ? <ActivityIndicator size="small" color={theme.onAccent} /> : <Ionicons name="cloud-upload-outline" size={18} color={theme.onAccent} />}
            onPress={handleCreateBackup}
            disabled={isExporting}
          />
        </View>

        {/* Restore Backup */}
        <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
          RESTORE BACKUP
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: theme.elevated }]}>
              <Ionicons name="refresh-outline" size={20} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body" style={{ fontWeight: '700' }}>
                Restore from Backup File
              </Text>
              <Text variant="caption" color="textMuted">
                Select an Ironlog .json backup to restore with merge or overwrite.
              </Text>
            </View>
          </View>

          <Button
            title={isRestoring ? 'Restoring Data...' : 'Select Backup File'}
            variant="secondary"
            size="md"
            icon={isRestoring ? <ActivityIndicator size="small" color={theme.text} /> : <Ionicons name="folder-open-outline" size={18} color={theme.text} />}
            onPress={handleRestoreBackup}
            disabled={isRestoring}
          />
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
  statusCard: {
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
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
});
