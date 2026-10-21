/**
 * Body Measurements Hub — overview of all body metrics (preset & custom).
 * Features:
 *   - Current values and trend deltas for all 9 builtins + custom metrics
 *   - Quick "Log Entry" action on each card
 *   - "New Metric" modal to create custom measurements
 *   - Navigation to detailed history & charts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, StyleSheet, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../src/ui/typography/Text';
import { Button } from '../../src/ui/components/Button';
import { Sheet } from '../../src/ui/components/Sheet';
import { Input } from '../../src/ui/components/Input';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { spacing, radii } from '../../src/ui/theme/tokens';
import { lightImpact, notificationSuccess } from '../../src/lib/haptics';
import {
  getMeasurements,
  addMeasurementEntry,
  createCustomMeasurement,
  type MeasurementSummary,
} from '../../src/db/queries/measurements';

export default function MeasurementsScreen() {
  const { theme } = useTheme();

  const [measurements, setMeasurements] = useState<MeasurementSummary[]>([]);
  const [selectedMeasurement, setSelectedMeasurement] = useState<MeasurementSummary | null>(null);

  // Quick Log Entry Sheet
  const [showLogSheet, setShowLogSheet] = useState(false);
  const [logValue, setLogValue] = useState('');
  const [logNotes, setLogNotes] = useState('');

  // Create Custom Metric Sheet
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customUnit, setCustomUnit] = useState('cm');

  const reload = useCallback(() => {
    try {
      const data = getMeasurements();
      setMeasurements(data);
    } catch (e) {
      console.error('Error loading measurements:', e);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleOpenDetail = (id: string) => {
    lightImpact();
    router.push({ pathname: '/measurements/[id]', params: { id } } as any);
  };

  const handleOpenQuickLog = (m: MeasurementSummary) => {
    lightImpact();
    setSelectedMeasurement(m);
    setLogValue(m.latestEntry ? String(m.latestEntry.value) : '');
    setLogNotes('');
    setShowLogSheet(true);
  };

  const handleSaveLog = () => {
    if (!selectedMeasurement) return;
    const num = parseFloat(logValue);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid Value', 'Please enter a valid numeric value.');
      return;
    }
    lightImpact();
    addMeasurementEntry(selectedMeasurement.id, {
      value: num,
      notes: logNotes.trim() || undefined,
    });
    setShowLogSheet(false);
    notificationSuccess();
    reload();
  };

  const handleCreateCustomMetric = () => {
    if (!customName.trim()) {
      Alert.alert('Required', 'Please enter a measurement name.');
      return;
    }
    lightImpact();
    createCustomMeasurement({
      name: customName.trim(),
      unit: customUnit.trim() || 'cm',
    });
    setCustomName('');
    setShowCreateSheet(false);
    notificationSuccess();
    reload();
  };

  const formatDate = (iso?: string) => {
    if (!iso) return 'No entries';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Body Tracking',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginRight: spacing.md }}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={() => {
                lightImpact();
                setShowCreateSheet(true);
              }}
              hitSlop={6}
            >
              <Ionicons name="add" size={26} color={theme.accent} />
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text variant="displaySm">Measurements</Text>
            <Text variant="bodySm" color="textMuted">
              Track numeric body metrics over time
            </Text>
          </View>

          <Button
            title="Custom"
            size="sm"
            variant="secondary"
            icon={<Ionicons name="add" size={16} color={theme.text} />}
            onPress={() => {
              lightImpact();
              setShowCreateSheet(true);
            }}
          />
        </View>

        {/* Grid of Measurements */}
        <View style={styles.grid}>
          {measurements.map((m) => {
            const hasDelta = m.deltaValue !== null;
            const isPositive = (m.deltaValue ?? 0) > 0;
            const isZero = (m.deltaValue ?? 0) === 0;

            return (
              <Pressable
                key={m.id}
                onPress={() => handleOpenDetail(m.id)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text variant="headingSm" style={{ fontWeight: '700' }}>
                      {m.name}
                    </Text>
                    <Text variant="caption" color="textMuted">
                      {formatDate(m.latestEntry?.measuredAt)}
                    </Text>
                  </View>

                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      handleOpenQuickLog(m);
                    }}
                    style={[styles.quickLogBtn, { backgroundColor: theme.accent }]}
                    hitSlop={8}
                  >
                    <Ionicons name="add" size={16} color={theme.onAccent} />
                  </Pressable>
                </View>

                {/* Value & Delta */}
                <View style={styles.cardValueRow}>
                  {m.latestEntry ? (
                    <Text variant="displaySm" style={{ fontWeight: '800' }} tabular>
                      {m.latestEntry.value}{' '}
                      <Text variant="bodySm" color="textMuted">
                        {m.unit}
                      </Text>
                    </Text>
                  ) : (
                    <Text variant="bodySm" color="textMuted">
                      No logs yet
                    </Text>
                  )}

                  {hasDelta && (
                    <View style={styles.deltaBadge}>
                      <Text
                        variant="caption"
                        style={{
                          fontWeight: '700',
                          color: isZero ? theme.textMuted : isPositive ? theme.accent : theme.textMuted,
                        }}
                        tabular
                      >
                        {isPositive ? '+' : ''}
                        {m.deltaValue} {m.unit}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Quick Log Modal */}
      <Sheet
        visible={showLogSheet}
        onClose={() => setShowLogSheet(false)}
        title={`Log ${selectedMeasurement?.name ?? 'Measurement'}`}
        subtitle={`Unit: ${selectedMeasurement?.unit ?? ''}`}
      >
        <View style={styles.form}>
          <Input
            label={`Value (${selectedMeasurement?.unit ?? ''})`}
            value={logValue}
            onChangeText={setLogValue}
            keyboardType="decimal-pad"
            placeholder="e.g. 75.5"
            autoFocus
          />

          <Input
            label="Notes (optional)"
            value={logNotes}
            onChangeText={setLogNotes}
            placeholder="Morning measurement, fasting..."
          />

          <Button
            title="Save Entry"
            variant="primary"
            onPress={handleSaveLog}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </View>
      </Sheet>

      {/* Create Custom Metric Sheet */}
      <Sheet
        visible={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        title="New Custom Measurement"
      >
        <View style={styles.form}>
          <Input
            label="Measurement Name"
            value={customName}
            onChangeText={setCustomName}
            placeholder="e.g. Forearms, Shoulders..."
            autoFocus
          />

          <Input
            label="Unit"
            value={customUnit}
            onChangeText={setCustomUnit}
            placeholder="cm, kg, %, in"
          />

          <Button
            title="Create Measurement"
            variant="primary"
            onPress={handleCreateCustomMetric}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grid: {
    gap: spacing.sm,
  },
  card: {
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  quickLogBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  deltaBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  form: {
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
});
