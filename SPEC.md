You are a senior mobile engineer and product designer. Build a production-quality, offline-first workout tracking app, a full-featured alternative to Hevy, called "Ironlog". Work in the phases below. After each phase, make sure the app runs, summarize what exists, and wait for my "continue" before starting the next phase.

# TECH STACK (do not substitute without asking)
- React Native + Expo (latest stable SDK), TypeScript in strict mode
- Expo Router for navigation
- expo-sqlite + Drizzle ORM (with migrations) as the single source of truth
- Zustand for ephemeral UI state (e.g. the active workout session)
- react-native-reanimated + react-native-gesture-handler for animations and gestures
- @shopify/react-native-skia (or Victory Native XL) for charts
- expo-haptics, expo-notifications, expo-keep-awake, expo-file-system, expo-document-picker, expo-sharing, expo-image-picker
- Zod for validating all imported data
- Vitest or Jest for unit tests on core logic

# NON-NEGOTIABLE PRINCIPLES
1. 100% offline. No feature may require internet. No backend in v1. All data lives in local SQLite.
2. Zero data loss. The in-progress workout must be persisted to SQLite after every change, so killing the app mid-workout and reopening it restores the session exactly, including the running timer.
3. Logging a set must take under 2 seconds and 2 taps. This is the most important interaction in the app.
4. Keep business logic (volume, 1RM, PR detection, plate math, unit conversion, import/export parsing) in pure, tested TypeScript modules separate from UI, so it can be reused if we later add sync or a web version.
5. Store all weights in kg internally and convert at display time. Support kg/lb and cm/in, switchable at any time.
6. Use UUIDs for all primary keys and include created_at, updated_at, and deleted_at (soft delete) on every table, so cloud sync can be added later without a rewrite.

# FEATURES (full scope)

## A. Exercise library
- Seed a built-in library of 300+ exercises, written by you (original names and descriptions, not copied from any app's database). Each has: name, primary muscle, secondary muscles, equipment, exercise type (weight+reps, bodyweight reps, weighted bodyweight, assisted bodyweight, duration, distance+duration, weight+duration).
- Fast search, filter by muscle group and equipment, and recently used / most used sorting.
- Create, edit, archive custom exercises. Add per-exercise notes.
- Per-exercise detail screen with tabs: About, History, Records (PRs), Charts (estimated 1RM, max weight, volume per session over time).

## B. Workout logging (core experience)
- Start an empty workout or start from a routine.
- Live workout screen: running duration, total volume, total sets.
- Add exercises, reorder via drag, remove, replace an exercise.
- Set types: Normal, Warm-up, Drop set, Failure. Warm-up sets are excluded from volume and PR calculations.
- Each set row: weight, reps (or time/distance depending on exercise type), RPE (optional), checkmark to complete.
- Show "Previous" performance for each set slot, from the last time that exercise was done. Tapping it copies those values in.
- Swipe to delete a set. Add set button auto-fills from the previous set.
- Supersets / circuits: group exercises together visually.
- Per-exercise and per-workout notes.
- Auto-start rest timer when a set is completed. Per-exercise default rest time, adjustable +/-15s, skippable, with haptic and notification alert when finished (works when the app is backgrounded or the screen is locked, using scheduled local notifications). Persistent minimized workout bar visible across the app while a workout is active.
- Real-time PR detection with a celebratory but tasteful animation (max weight, best estimated 1RM, best set volume, best reps at a given weight).
- Plate calculator: configurable barbell weight and available plates, shows plates per side.
- Finish workout screen with a summary (duration, volume, PRs, muscle groups hit) and an editable title, date, and notes. Discard workout with confirmation.
- Edit any past workout afterward (date, sets, notes), and delete with confirmation.

## C. Routines
- Create, edit, duplicate, delete routines. Organize into folders.
- Routines store exercises, set counts, target reps/weight, rest times, and notes.
- "Save workout as routine" after finishing any workout.
- Preloaded set of starter routines (PPL, Upper/Lower, Full Body, 5x5, etc.) that the user can copy.

## D. History and calendar
- Chronological workout history with summary cards (title, date, duration, volume, PRs, exercises).
- Calendar view with workout days marked, tap a day to view workouts.
- Workout detail view. Share workout as a beautifully designed image card (use view-shot + expo-sharing), with a themeable layout.

## E. Stats and progress
- Dashboard: workouts per week, total volume, total duration, streak, weekly goal progress.
- Muscle group distribution (sets per muscle, last 7/30/90 days), displayed as a chart and an anatomical-style heat summary (a stylized one is fine).
- Per-exercise progression charts with time-range selectors.
- Personal records board.
- Body tracking: bodyweight, body fat %, and custom measurements (chest, waist, arms, etc.) with charts and history.
- Progress photos stored locally with a before/after comparison view.

## F. Settings
- Units (kg/lb, cm/in), weekday the week starts on, default rest timer, plate/barbell setup, haptics on/off, sound on/off, theme (light, dark, system), accent color choice.
- Weekly workout goal.
- App lock (biometric) as an optional toggle.

## G. Data import and export (important)
- Export all data as a single JSON backup file (versioned schema, includes settings, exercises, routines, workouts, body measurements, and references to photos).
- Export workouts as CSV, including a Hevy-compatible column layout (title, start_time, end_time, description, exercise_title, superset_id, exercise_notes, set_index, set_type, weight, reps, distance, duration, rpe).
- Full backup & restore: export a .zip containing the SQLite database plus progress photos, and restore from it.
- Import from: my own JSON backup, Hevy CSV, Strong CSV, and generic CSV with a column-mapping screen.
- Import flow: pick file, validate with Zod, show a preview ("142 workouts, 38 exercises found, 5 exercises need matching"), map unknown exercises to library entries or create them, choose to merge or replace, run in a single database transaction (all or nothing), and show a result summary.
- Deduplicate on import so importing the same file twice does not create duplicates.
- Never crash on malformed files. Show clear, human-readable errors.
- Auto-backup reminder option (e.g. nudge every 2 weeks if no export).

# UI / UX DIRECTION: modern, premium
- Dark-first design with a refined light theme. Deep neutral backgrounds (near-black, not pure black), layered surfaces, subtle borders, one confident accent color. Think premium fitness apps: clean, spacious, high-contrast, no clutter.
- Define a design-token system up front (colors, spacing scale, radii, typography scale, shadows, motion durations) and use it everywhere. No hardcoded styles in components.
- Typography: one high-quality sans-serif (e.g. Inter or Geist) with tabular numerals for weights/reps/timers so numbers don't jump.
- Large touch targets (min 44px). The active workout screen must be usable one-handed, with sweaty hands, at a glance.
- Motion: spring-based, 60fps, purposeful. Set completion has a satisfying check animation + haptic. Rest timer is a smooth ring/progress. Screen transitions are smooth. Bottom sheets for pickers. Skeleton loaders instead of spinners. Respect the reduce-motion accessibility setting.
- Charts are minimal, elegant, and animated, with a gradient fill and touch scrubbing.
- Empty states are designed with a friendly illustration/message and a clear call to action.
- Accessibility: dynamic type support, screen reader labels, sufficient contrast.
- Bottom tab navigation: Home, History, Workout (center, prominent), Exercises, Profile/Stats.

# ARCHITECTURE & QUALITY
- Folder structure: /app (routes), /src/db (schema, migrations, queries), /src/domain (pure logic), /src/features/* (feature modules), /src/ui (design system components), /src/lib (utils).
- Build a reusable component library first (Button, Card, Sheet, Input, NumberStepper, Chip, ListRow, Chart wrapper, etc.).
- Add database indexes for common queries (exercise_id + date, workout date).
- Handle large datasets: virtualized lists, paginated queries, test with 5 years of generated data (about 1,000 workouts) and keep the app fast.
- Write unit tests for: volume calculation, estimated 1RM (Epley and Brzycki), PR detection, unit conversion, plate calculator, CSV import/export round-trip (export then import yields identical data).
- Include a seed/dev script that generates realistic fake workout history for testing.
- Document everything in a README: setup, architecture, schema diagram, how to build for iOS/Android with EAS.

# PHASES
Phase 1: Project setup, design tokens, UI component library, navigation shell, SQLite schema + migrations, exercise library seeding.
Phase 2: Exercise library UI, routines, and the full live workout logging flow (including rest timer, set types, supersets, persistence/restore).
Phase 3: History, calendar, workout detail/edit, PR detection, plate calculator.
Phase 4: Stats dashboard, exercise charts, body measurements, progress photos.
Phase 5: Import/export (JSON, CSV, Hevy/Strong import, ZIP backup/restore), settings, app lock.
Phase 6: Polish: animations, haptics, empty states, accessibility, performance tuning, tests, README, EAS build config.

# THEMING SYSTEM (live palette switching)

The user can switch the whole app's look at any time from Settings, with no restart.

## Requirements
- Ship 5 built-in palettes: Volt, Aurora, Ember, Glacier, Graphite. Each has a dark and a light variant (10 themes total), with the exact colors I provide below.
- Appearance mode: Dark, Light, or System (follows the OS). Palette and mode are chosen independently.
- Optional "Custom accent" picker on top of any palette. Auto-derive the accent's pressed, subtle-background, and on-accent text colors, and enforce WCAG AA contrast (fall back to black or white text on the accent automatically).
- Switching is instant and animated (a short cross-fade, respecting reduce-motion). Every screen, chart, and the shareable workout card must update, with no hardcoded colors anywhere.
- Persist the choice in the settings table (palette_id, mode, custom_accent). Load it before first render so there is no flash of the wrong theme at launch.
- Include the theme settings in JSON backup/restore.

## Settings UI: "Appearance" screen
- A horizontal gallery of palette cards. Each card is a miniature live preview of the app (header, a set row, an accent button, a PR badge) rendered in that palette's real colors, with a check on the selected one.
- Tapping a card applies it immediately, with a light haptic.
- Below it: Mode selector (segmented control), Custom accent toggle with a color picker, and a "Reset to default" action.

## Architecture
- /src/ui/theme/palettes.ts: all palettes as typed data (semantic tokens, not raw colors).
- /src/ui/theme/ThemeProvider.tsx: React context holding the resolved theme, plus a useTheme() hook.
- /src/ui/theme/createStyles.ts: helper so components declare styles as (theme) => StyleSheet and re-render on theme change.
- Components consume ONLY semantic tokens (background, surface, elevated, border, text, textMuted, accent, onAccent, accentSubtle, prGold, danger, success, setWarmup, setDrop, setFailure). Never raw hex.
- Unit tests: every palette and mode passes AA contrast for text/background, textMuted/surface, and onAccent/accent.

## Palettes (dark variants; derive matching light variants with an off-white #F7F7F9 background, white surfaces, subtle borders, and a slightly darkened accent that passes AA)
Volt:     bg #0B0C0E surface #14161A elevated #1C1F24 border #272B31 text #F4F5F7 muted #8A9099 accent #C6FF3D onAccent #0B0C0E gold #FFC857 danger #FF5C5C
Aurora:   bg #0A0A12 surface #12121C elevated #1B1B28 border #272736 text #F3F3FA muted #8888A0 accent #7C5CFF onAccent #FFFFFF gold #FFCB47 danger #FF5C7A
Ember:    bg #0E0B0A surface #171211 elevated #211A18 border #2E2522 text #F6F1EE muted #9A8C86 accent #FF6B3D onAccent #0E0B0A gold #FFD166 danger #FF4D4D
Glacier:  bg #080D10 surface #0F171B elevated #172229 border #22313A text #EEF6F8 muted #7F95A0 accent #2DD4BF onAccent #080D10 gold #FBBF24 danger #F87171
Graphite: bg #0A0A0A surface #121212 elevated #1A1A1A border #262626 text #FAFAFA muted #8A8A8A accent #FF4D2E onAccent #0A0A0A gold #F5C451 danger #FF5C5C
Shared set-type colors: warmup #F5A524, drop #4DA3FF, failure #FF5C5C, success #34D399.

export type ThemeTokens = {
  background: string; surface: string; elevated: string; border: string;
  text: string; textMuted: string;
  accent: string; onAccent: string; accentSubtle: string;
  prGold: string; danger: string; success: string;
  setWarmup: string; setDrop: string; setFailure: string;
};

export type PaletteId = 'volt' | 'aurora' | 'ember' | 'glacier' | 'graphite';
export type Mode = 'dark' | 'light';

const shared = {
  success: '#34D399', setWarmup: '#F5A524', setDrop: '#4DA3FF', setFailure: '#FF5C5C',
};

export const palettes: Record<PaletteId, { name: string; dark: ThemeTokens; light: ThemeTokens }> = {
  volt: {
    name: 'Volt',
    dark: {
      background: '#0B0C0E', surface: '#14161A', elevated: '#1C1F24', border: '#272B31',
      text: '#F4F5F7', textMuted: '#8A9099',
      accent: '#C6FF3D', onAccent: '#0B0C0E', accentSubtle: '#C6FF3D22',
      prGold: '#FFC857', danger: '#FF5C5C', ...shared,
    },
    light: {
      background: '#F7F7F9', surface: '#FFFFFF', elevated: '#FFFFFF', border: '#E4E6EA',
      text: '#0B0C0E', textMuted: '#5E6570',
      accent: '#5C8A00', onAccent: '#FFFFFF', accentSubtle: '#5C8A0018',
      prGold: '#B7791F', danger: '#D93636', ...shared,
    },
  },
  // aurora, ember, glacier, graphite follow the same shape
} as const;

import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { palettes, PaletteId, ThemeTokens } from './palettes';

type Appearance = 'dark' | 'light' | 'system';
type ThemeState = { paletteId: PaletteId; appearance: Appearance; customAccent?: string };

const ThemeContext = createContext<{
  theme: ThemeTokens;
  state: ThemeState;
  setPalette: (id: PaletteId) => void;
  setAppearance: (a: Appearance) => void;
  setCustomAccent: (hex?: string) => void;
} | null>(null);

export function ThemeProvider({ initial, children }: { initial: ThemeState; children: React.ReactNode }) {
  const system = useColorScheme() ?? 'dark';
  const [state, setState] = useState<ThemeState>(initial);

  const theme = useMemo(() => {
    const mode = state.appearance === 'system' ? system : state.appearance;
    const base = palettes[state.paletteId][mode];
    return state.customAccent ? withAccent(base, state.customAccent) : base;
  }, [state, system]);

  useEffect(() => { /* persist `state` to the settings table */ }, [state]);

  const value = useMemo(() => ({
    theme, state,
    setPalette: (paletteId: PaletteId) => setState(s => ({ ...s, paletteId })),
    setAppearance: (appearance: Appearance) => setState(s => ({ ...s, appearance })),
    setCustomAccent: (customAccent?: string) => setState(s => ({ ...s, customAccent })),
  }), [theme, state]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};

// derives onAccent (black/white by luminance) and accentSubtle from any hex
function withAccent(base: ThemeTokens, hex: string): ThemeTokens { /* ... */ return base; }

const { theme } = useTheme();
<View style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
  <Text style={{ color: theme.text }}>Bench press</Text>
</View>

Before writing any code, give me: (1) the database schema, (2) the folder structure, (3) the design token palette, and (4) any questions you have. Then begin Phase 1 after I confirm.