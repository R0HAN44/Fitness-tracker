/**
 * Settings queries — read/write the singleton settings row.
 */

import { eq } from 'drizzle-orm';
import { getDb } from '../client';
import { settings } from '../schema';
import { now } from '../../lib/uuid';
import type { ThemeState } from '../../ui/theme/ThemeProvider';
import type { PaletteId, Appearance } from '../../ui/theme/palettes';

export type SettingsRow = typeof settings.$inferSelect;

/** Get the current settings (always returns a row since init seeds one). */
export function getSettings(): SettingsRow {
  const db = getDb();
  return db.select().from(settings).where(eq(settings.id, 'default')).get()!;
}

/** Update specific settings fields. */
export function updateSettings(
  updates: Partial<Omit<SettingsRow, 'id' | 'createdAt'>>,
): void {
  const db = getDb();
  db.update(settings)
    .set({ ...updates, updatedAt: now() })
    .where(eq(settings.id, 'default'))
    .run();
}

/** Load the theme state from settings (for ThemeProvider initialization). */
export function loadThemeState(): ThemeState {
  const row = getSettings();
  return {
    paletteId: row.paletteId as PaletteId,
    appearance: row.appearanceMode as Appearance,
    customAccent: row.customAccent ?? undefined,
  };
}

/** Persist the theme state to settings. */
export function saveThemeState(state: ThemeState): void {
  updateSettings({
    paletteId: state.paletteId,
    appearanceMode: state.appearance,
    customAccent: state.customAccent ?? null,
  });
}
