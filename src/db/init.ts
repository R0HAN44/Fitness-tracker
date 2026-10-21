/**
 * Database initialization — runs Drizzle migrations and seeds initial data.
 *
 * Uses Drizzle ORM migrations generated via drizzle-kit.
 */

import { getDb } from './client';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '../../drizzle/migrations';
import { settings } from './schema';
import { now } from '../lib/uuid';
import { eq } from 'drizzle-orm';

/**
 * Initialize the database: run migrations and ensure default settings exist.
 */
export async function initializeDatabase(): Promise<void> {
  const db = getDb();

  // Run real Drizzle migrations
  await migrate(db, migrations);

  // Ensure the default settings row exists
  const existing = db.select().from(settings).where(eq(settings.id, 'default')).get();

  if (!existing) {
    const timestamp = now();
    db.insert(settings)
      .values({
        id: 'default',
        weightUnit: 'kg',
        lengthUnit: 'cm',
        weekStart: 1,
        defaultRestSeconds: 90,
        barbellWeightKg: 20.0,
        availablePlatesKg: JSON.stringify([25, 20, 15, 10, 5, 2.5, 1.25]),
        hapticsEnabled: true,
        soundEnabled: true,
        paletteId: 'volt',
        appearanceMode: 'dark',
        weeklyWorkoutGoal: 4,
        appLockEnabled: false,
        autoBackupReminderDays: 14,
        backupSchemaVersion: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
  }
}
