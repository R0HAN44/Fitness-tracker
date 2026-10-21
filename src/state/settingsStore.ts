/**
 * Settings Zustand store.
 * Reactive state store synchronized with SQLite singleton settings table.
 * Changes apply immediately across all screens and persist across app restarts.
 */

import { create } from 'zustand';
import { getSettings, updateSettings, type SettingsRow } from '../db/queries/settings';
import { setHapticsEnabled as setGlobalHaptics } from '../lib/haptics';
import type { WeightUnit, LengthUnit } from '../domain/units';

export interface SettingsState {
  weightUnit: WeightUnit;
  lengthUnit: LengthUnit;
  weekStart: number; // 0=Sun, 1=Mon
  defaultRestSeconds: number;
  barbellWeightKg: number;
  availablePlatesKg: number[];
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  weeklyWorkoutGoal: number;
  appLockEnabled: boolean;
  isLoaded: boolean;

  // Actions
  loadSettings: () => void;
  setWeightUnit: (unit: WeightUnit) => void;
  setLengthUnit: (unit: LengthUnit) => void;
  setWeekStart: (day: number) => void;
  setDefaultRestSeconds: (seconds: number) => void;
  setBarbellWeightKg: (weightKg: number) => void;
  setAvailablePlatesKg: (plates: number[]) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setWeeklyWorkoutGoal: (goal: number) => void;
  setAppLockEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  weightUnit: 'kg',
  lengthUnit: 'cm',
  weekStart: 1,
  defaultRestSeconds: 90,
  barbellWeightKg: 20.0,
  availablePlatesKg: [25, 20, 15, 10, 5, 2.5, 1.25],
  hapticsEnabled: true,
  soundEnabled: true,
  weeklyWorkoutGoal: 4,
  appLockEnabled: false,
  isLoaded: false,

  loadSettings: () => {
    try {
      const row = getSettings();
      if (!row) return;

      let plates: number[] = [25, 20, 15, 10, 5, 2.5, 1.25];
      if (row.availablePlatesKg) {
        try {
          plates = JSON.parse(row.availablePlatesKg);
        } catch {}
      }

      const haptics = row.hapticsEnabled ?? true;
      setGlobalHaptics(haptics);

      set({
        weightUnit: (row.weightUnit as WeightUnit) ?? 'kg',
        lengthUnit: (row.lengthUnit as LengthUnit) ?? 'cm',
        weekStart: row.weekStart ?? 1,
        defaultRestSeconds: row.defaultRestSeconds ?? 90,
        barbellWeightKg: row.barbellWeightKg ?? 20.0,
        availablePlatesKg: plates,
        hapticsEnabled: haptics,
        soundEnabled: row.soundEnabled ?? true,
        weeklyWorkoutGoal: row.weeklyWorkoutGoal ?? 4,
        appLockEnabled: row.appLockEnabled ?? false,
        isLoaded: true,
      });
    } catch (e) {
      console.warn('Could not load settings from DB:', e);
    }
  },

  setWeightUnit: (unit: WeightUnit) => {
    set({ weightUnit: unit });
    updateSettings({ weightUnit: unit });
  },

  setLengthUnit: (unit: LengthUnit) => {
    set({ lengthUnit: unit });
    updateSettings({ lengthUnit: unit });
  },

  setWeekStart: (day: number) => {
    set({ weekStart: day });
    updateSettings({ weekStart: day });
  },

  setDefaultRestSeconds: (seconds: number) => {
    set({ defaultRestSeconds: seconds });
    updateSettings({ defaultRestSeconds: seconds });
  },

  setBarbellWeightKg: (weightKg: number) => {
    set({ barbellWeightKg: weightKg });
    updateSettings({ barbellWeightKg: weightKg });
  },

  setAvailablePlatesKg: (plates: number[]) => {
    set({ availablePlatesKg: plates });
    updateSettings({ availablePlatesKg: JSON.stringify(plates) });
  },

  setHapticsEnabled: (enabled: boolean) => {
    set({ hapticsEnabled: enabled });
    setGlobalHaptics(enabled);
    updateSettings({ hapticsEnabled: enabled });
  },

  setSoundEnabled: (enabled: boolean) => {
    set({ soundEnabled: enabled });
    updateSettings({ soundEnabled: enabled });
  },

  setWeeklyWorkoutGoal: (goal: number) => {
    set({ weeklyWorkoutGoal: goal });
    updateSettings({ weeklyWorkoutGoal: goal });
  },

  setAppLockEnabled: (enabled: boolean) => {
    set({ appLockEnabled: enabled });
    updateSettings({ appLockEnabled: enabled });
  },
}));
