/**
 * Body tracking queries — CRUD for body measurements (builtin & custom),
 * measurement entries, progress trends, and chart data.
 */

import { eq, and, isNull, desc, asc } from 'drizzle-orm';
import { getDb } from '../client';
import { bodyMeasurements, bodyMeasurementEntries } from '../schema';
import { generateId as uuid, now, deterministicId } from '../../lib/uuid';
import type { TimeRange } from '../../domain/stats';

export type BodyMeasurementRow = typeof bodyMeasurements.$inferSelect;
export type BodyMeasurementEntryRow = typeof bodyMeasurementEntries.$inferSelect;

export interface MeasurementSummary extends BodyMeasurementRow {
  latestEntry: BodyMeasurementEntryRow | null;
  previousEntry: BodyMeasurementEntryRow | null;
  deltaValue: number | null;
  totalEntriesCount: number;
}

const BUILTIN_MEASUREMENTS = [
  { slug: 'bodyweight', name: 'Bodyweight', unit: 'kg', sortOrder: 1 },
  { slug: 'body_fat_pct', name: 'Body Fat %', unit: 'pct', sortOrder: 2 },
  { slug: 'waist', name: 'Waist', unit: 'cm', sortOrder: 3 },
  { slug: 'neck', name: 'Neck', unit: 'cm', sortOrder: 4 },
  { slug: 'chest', name: 'Chest', unit: 'cm', sortOrder: 5 },
  { slug: 'hips', name: 'Hips', unit: 'cm', sortOrder: 6 },
  { slug: 'biceps', name: 'Biceps', unit: 'cm', sortOrder: 7 },
  { slug: 'thighs', name: 'Thighs', unit: 'cm', sortOrder: 8 },
  { slug: 'calves', name: 'Calves', unit: 'cm', sortOrder: 9 },
];

/**
 * Ensure the 9 built-in body measurements exist. Idempotent.
 */
export function seedBuiltinMeasurements(): void {
  const db = getDb();
  const timestamp = now();

  for (const m of BUILTIN_MEASUREMENTS) {
    const id = deterministicId(`measurement-${m.slug}`);
    const existing = db
      .select({ id: bodyMeasurements.id })
      .from(bodyMeasurements)
      .where(eq(bodyMeasurements.id, id))
      .get();

    if (!existing) {
      db.insert(bodyMeasurements)
        .values({
          id,
          name: m.name,
          unit: m.unit,
          isBuiltin: true,
          sortOrder: m.sortOrder,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .run();
    }
  }
}

/**
 * Get all active measurements with their latest entry and delta.
 */
export function getMeasurements(): MeasurementSummary[] {
  const db = getDb();

  // Ensure builtins exist
  seedBuiltinMeasurements();

  const allMeasurements = db
    .select()
    .from(bodyMeasurements)
    .where(isNull(bodyMeasurements.deletedAt))
    .orderBy(asc(bodyMeasurements.sortOrder), asc(bodyMeasurements.name))
    .all();

  return allMeasurements.map((m) => {
    const entries = db
      .select()
      .from(bodyMeasurementEntries)
      .where(
        and(
          eq(bodyMeasurementEntries.measurementId, m.id),
          isNull(bodyMeasurementEntries.deletedAt),
        ),
      )
      .orderBy(desc(bodyMeasurementEntries.measuredAt))
      .all();

    const latest = entries[0] ?? null;
    const previous = entries[1] ?? null;
    const delta = latest && previous ? Math.round((latest.value - previous.value) * 100) / 100 : null;

    return {
      ...m,
      latestEntry: latest,
      previousEntry: previous,
      deltaValue: delta,
      totalEntriesCount: entries.length,
    };
  });
}

export const getMeasurementSummaries = getMeasurements;

/**
 * Get single measurement by ID.
 */
export function getMeasurementById(id: string): MeasurementSummary | null {
  const db = getDb();
  const m = db
    .select()
    .from(bodyMeasurements)
    .where(and(eq(bodyMeasurements.id, id), isNull(bodyMeasurements.deletedAt)))
    .get();

  if (!m) return null;

  const entries = db
    .select()
    .from(bodyMeasurementEntries)
    .where(
      and(
        eq(bodyMeasurementEntries.measurementId, m.id),
        isNull(bodyMeasurementEntries.deletedAt),
      ),
    )
    .orderBy(desc(bodyMeasurementEntries.measuredAt))
    .all();

  const latest = entries[0] ?? null;
  const previous = entries[1] ?? null;
  const delta = latest && previous ? Math.round((latest.value - previous.value) * 100) / 100 : null;

  return {
    ...m,
    latestEntry: latest,
    previousEntry: previous,
    deltaValue: delta,
    totalEntriesCount: entries.length,
  };
}

export interface MeasurementChartPoint {
  id: string;
  date: string;
  label: string;
  value: number;
}

/**
 * Get chronological entries for charting across time range.
 */
export function getMeasurementChartData(
  measurementId: string,
  range: TimeRange = 'all',
): MeasurementChartPoint[] {
  const db = getDb();

  let cutoffDate: Date | null = null;
  if (range === '3m') {
    cutoffDate = new Date(Date.now() - 90 * 86400000);
  } else if (range === '1y') {
    cutoffDate = new Date(Date.now() - 365 * 86400000);
  }

  const entries = db
    .select()
    .from(bodyMeasurementEntries)
    .where(
      and(
        eq(bodyMeasurementEntries.measurementId, measurementId),
        isNull(bodyMeasurementEntries.deletedAt),
      ),
    )
    .orderBy(asc(bodyMeasurementEntries.measuredAt))
    .all();

  const filtered = entries.filter((e) => {
    if (!cutoffDate) return true;
    return new Date(e.measuredAt) >= cutoffDate;
  });

  return filtered.map((e) => {
    const d = new Date(e.measuredAt);
    return {
      id: e.id,
      date: e.measuredAt.slice(0, 10),
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      value: e.value,
    };
  });
}

/**
 * Get all history entries for a measurement ordered newest first.
 */
export function getMeasurementHistory(measurementId: string): BodyMeasurementEntryRow[] {
  const db = getDb();
  return db
    .select()
    .from(bodyMeasurementEntries)
    .where(
      and(
        eq(bodyMeasurementEntries.measurementId, measurementId),
        isNull(bodyMeasurementEntries.deletedAt),
      ),
    )
    .orderBy(desc(bodyMeasurementEntries.measuredAt))
    .all();
}

/**
 * Add a new body measurement entry.
 */
export function addMeasurementEntry(
  measurementId: string,
  data: {
    value: number;
    measuredAt?: string;
    notes?: string;
  },
): BodyMeasurementEntryRow {
  const db = getDb();
  const timestamp = now();
  const id = uuid();

  db.insert(bodyMeasurementEntries)
    .values({
      id,
      measurementId,
      value: data.value,
      measuredAt: data.measuredAt ?? timestamp,
      notes: data.notes ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return db.select().from(bodyMeasurementEntries).where(eq(bodyMeasurementEntries.id, id)).get()!;
}

/**
 * Update an existing measurement entry.
 */
export function updateMeasurementEntry(
  entryId: string,
  data: {
    value?: number;
    measuredAt?: string;
    notes?: string;
  },
): void {
  const db = getDb();
  const timestamp = now();
  const updates: Record<string, any> = { updatedAt: timestamp };
  if (data.value !== undefined) updates.value = data.value;
  if (data.measuredAt !== undefined) updates.measuredAt = data.measuredAt;
  if (data.notes !== undefined) updates.notes = data.notes;

  db.update(bodyMeasurementEntries).set(updates).where(eq(bodyMeasurementEntries.id, entryId)).run();
}

/**
 * Delete a measurement entry.
 */
export function deleteMeasurementEntry(entryId: string): void {
  const db = getDb();
  db.update(bodyMeasurementEntries)
    .set({ deletedAt: now(), updatedAt: now() })
    .where(eq(bodyMeasurementEntries.id, entryId))
    .run();
}

/**
 * Create a new custom measurement (e.g. Forearms).
 */
export function createCustomMeasurement(data: { name: string; unit: string }): BodyMeasurementRow {
  const db = getDb();
  const timestamp = now();
  const id = uuid();

  db.insert(bodyMeasurements)
    .values({
      id,
      name: data.name.trim(),
      unit: data.unit.trim(),
      isBuiltin: false,
      sortOrder: 50,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return db.select().from(bodyMeasurements).where(eq(bodyMeasurements.id, id)).get()!;
}

/**
 * Delete a custom measurement and all its entries.
 */
export function deleteCustomMeasurement(measurementId: string): void {
  const db = getDb();
  const timestamp = now();

  db.update(bodyMeasurementEntries)
    .set({ deletedAt: timestamp, updatedAt: timestamp })
    .where(eq(bodyMeasurementEntries.measurementId, measurementId))
    .run();

  db.update(bodyMeasurements)
    .set({ deletedAt: timestamp, updatedAt: timestamp })
    .where(eq(bodyMeasurements.id, measurementId))
    .run();
}
