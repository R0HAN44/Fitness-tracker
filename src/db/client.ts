/**
 * Database client — initializes expo-sqlite with Drizzle ORM.
 *
 * Enforces PRAGMA foreign_keys = ON and PRAGMA journal_mode = WAL
 * on every connection for data integrity and performance.
 */

import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const DB_NAME = 'ironlog.db';

let _sqliteDb: SQLiteDatabase | null = null;
let _db: ExpoSQLiteDatabase<typeof schema> | null = null;

/**
 * Get the Drizzle database instance (singleton).
 * Safe to call multiple times — returns the same instance.
 */
export function getDb(): ExpoSQLiteDatabase<typeof schema> {
  if (_db) return _db;

  _sqliteDb = openDatabaseSync(DB_NAME);

  // Enable foreign keys and WAL mode
  _sqliteDb.execSync('PRAGMA foreign_keys = ON;');
  _sqliteDb.execSync('PRAGMA journal_mode = WAL;');

  _db = drizzle(_sqliteDb, { schema });

  return _db;
}

/**
 * Get the raw SQLite database instance (for migrations or raw queries).
 */
export function getRawDb(): SQLiteDatabase {
  if (!_sqliteDb) {
    getDb(); // ensure initialized
  }
  return _sqliteDb!;
}

/**
 * Close the database connection (for cleanup during testing).
 */
export function closeDb(): void {
  if (_sqliteDb) {
    _sqliteDb.closeSync();
    _sqliteDb = null;
    _db = null;
  }
}

export { schema };
export type { ExpoSQLiteDatabase };
