/**
 * MeasurementDetailScreen — detail screen for a specific body metric.
 * Features:
 *   - Interactive LineChart progression across 3M, 1Y, and All-Time ranges
 *   - Log new entry modal
 *   - History list of entries with delete/edit
 *   - Custom measurement deletion
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../src/ui/typography/Text';
import { Button } from '../../src/ui/components/Button';
import { Sheet } from '../../src/ui/components/Sheet';
import { Input } from '../../src/ui/components/Input';
import { SegmentedControl } from '../../src/ui/components/SegmentedControl';
import { LineChart } from '../../src/ui/charts/LineChart';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { spacing, radii } from '../../src/ui/theme/tokens';
import { lightImpact, notificationSuccess } from '../../src/lib/haptics';
import {
  getMeasurementById,
  getMeasurementChartData,
  getMeasurementHistory,
  addMeasurementEntry,
  deleteMeasurementEntry,
  deleteCustomMeasurement,
  type MeasurementSummary,
  type BodyMeasurementEntryRow,
  type MeasurementChartPoint,
} from '../../src/db/queries/measurements';
import type { TimeRange } from '../../src/domain/stats';

export default function MeasurementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();

  const [measurement, setMeasurement] = useState<MeasurementSummary | null>(null);
  const [range, setRange] = useState<TimeRange>('all');
  const [chartData, setChartData] = useState<MeasurementChartPoint[]>([]);
  const [history, setHistory] = useState<BodyMeasurementEntryRow[]>([]);

  // Log Entry Modal
  const [showLogSheet, setShowLogSheet] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const loadData = useCallback(() => {
    if (!id) return;
    try {
      const m = getMeasurementById(id);
      setMeasurement(m);
      const pts = getMeasurementChartData(id, range);
      setChartData(pts);
      const hist = getMeasurementHistory(id);
      setHistory(hist);
    } catch (e) {
      console.error('Error loading measurement detail:', e);
    }
  }, [id, range]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!measurement) return null;

  const handleSaveEntry = () => {
    const num = parseFloat(newValue);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid Value', 'Please enter a valid positive number.');
      return;
    }
    lightImpact();
    addMeasurementEntry(measurement.id, {
      value: num,
      notes: newNotes.trim() || undefined,
    });
    setNewValue('');
    setNewNotes('');
    setShowLogSheet(false);
    notificationSuccess();
    loadData();
  };

  const handleDeleteEntry = (entryId: string) => {
    Alert.alert('Delete Entry?', 'Are you sure you want to delete this measurement entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          lightImpact();
          deleteMeasurementEntry(entryId);
          loadData();
        },
      },
    ]);
  };

  const handleDeleteMetric = () => {
    Alert.alert(
      'Delete Measurement?',
      `Are you sure you want to delete ${measurement.name} and all its logged history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            lightImpact();
            deleteCustomMeasurement(measurement.id);
            router.back();
          },
        },
      ],
    );
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: measurement.name,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginRight: spacing.md }}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </Pressable>
          ),
          headerRight: () =>
            !measurement.isBuiltin ? (
              <Pressable onPress={handleDeleteMetric} hitSlop={6}>
                <Ionicons name="trash-outline" size={22} color={theme.danger} />
              </Pressable>
            ) : null,
        }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Latest Value Card */}
        <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.heroTop}>
            <View>
              <Text variant="caption" color="textMuted">LATEST VALUE</Text>
              <Text variant="displayLg" style={{ fontWeight: '900', marginTop: 2 }} tabular>
                {measurement.latestEntry ? measurement.latestEntry.value : '—'}{' '}
                <Text variant="headingSm" color="textMuted">
                  {measurement.unit}
                </Text>
              </Text>
            </View>

            <Button
              title="Log Entry"
              variant="primary"
              size="sm"
              icon={<Ionicons name="add" size={16} color={theme.onAccent} />}
              onPress={() => {
                lightImpact();
                setNewValue(measurement.latestEntry ? String(measurement.latestEntry.value) : '');
                setShowLogSheet(true);
              }}
            />
          </View>

          {measurement.latestEntry && (
            <View style={styles.heroFooter}>
              <Text variant="caption" color="textMuted">
                Logged on {formatDate(measurement.latestEntry.measuredAt)}
              </Text>
              {measurement.deltaValue !== null && (
                <Text
                  variant="caption"
                  style={{
                    fontWeight: '700',
                    color: measurement.deltaValue > 0 ? theme.accent : theme.textMuted,
                  }}
                  tabular
                >
                  {measurement.deltaValue > 0 ? '+' : ''}
                  {measurement.deltaValue} {measurement.unit} from prior
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Range Segmented Control */}
        <SegmentedControl
          options={[
            { label: '3 Months', value: '3m' },
            { label: '1 Year', value: '1y' },
            { label: 'All Time', value: 'all' },
          ]}
          value={range}
          onChange={(r) => {
            lightImpact();
            setRange(r as TimeRange);
          }}
          size="sm"
        />

        {/* Chart Card */}
        <View style={[styles.chartCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text variant="headingSm" style={{ fontWeight: '700', marginBottom: spacing.xs }}>
            Progression Chart
          </Text>
          <LineChart
            data={chartData.map((pt) => ({ label: pt.label, value: pt.value }))}
            height={190}
            unit={measurement.unit}
            emptyMessage="Log 2 or more entries to see your trend curve."
          />
        </View>

        {/* History List */}
        <Text variant="caption" color="textMuted" style={{ marginTop: spacing.xs }}>
          LOGGED ENTRIES ({history.length})
        </Text>

        {history.length === 0 ? (
          <View style={[styles.emptyHistory, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="bodySm" color="textMuted" center>
              No entries recorded yet. Tap "Log Entry" above to add your first point.
            </Text>
          </View>
        ) : (
          history.map((entry) => (
            <View
              key={entry.id}
              style={[styles.historyRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '700' }} tabular>
                  {entry.value} {measurement.unit}
                </Text>
                <Text variant="caption" color="textMuted">
                  {formatDate(entry.measuredAt)}
                </Text>
                {entry.notes ? (
                  <Text variant="caption" color="textMuted" style={{ marginTop: 2, fontStyle: 'italic' }}>
                    {entry.notes}
                  </Text>
                ) : null}
              </View>

              <Pressable
                onPress={() => handleDeleteEntry(entry.id)}
                hitSlop={8}
                style={{ padding: spacing.xs }}
              >
                <Ionicons name="trash-outline" size={18} color={theme.danger} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      {/* Log Entry Sheet */}
      <Sheet
        visible={showLogSheet}
        onClose={() => setShowLogSheet(false)}
        title={`Log ${measurement.name}`}
        subtitle={`Unit: ${measurement.unit}`}
      >
        <View style={styles.form}>
          <Input
            label={`Value (${measurement.unit})`}
            value={newValue}
            onChangeText={setNewValue}
            keyboardType="decimal-pad"
            placeholder="0.0"
            autoFocus
          />

          <Input
            label="Notes (optional)"
            value={newNotes}
            onChangeText={setNewNotes}
            placeholder="Measurement notes..."
          />

          <Button
            title="Save Entry"
            variant="primary"
            onPress={handleSaveEntry}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing['5xl'],
    gap: spacing.base,
  },
  heroCard: {
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#33333333',
  },
  chartCard: {
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.base,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  emptyHistory: {
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  form: {
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
});
