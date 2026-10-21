/**
 * Ironlog theme palettes.
 *
 * Each palette has a dark and light variant. Colors use semantic names
 * so components never reference raw hex values. Light variants use an
 * off-white background, white surfaces, and darkened accents that
 * pass WCAG AA contrast.
 */

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

export type ThemeTokens = {
  background: string;
  surface: string;
  elevated: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  onAccent: string;
  accentSubtle: string;
  prGold: string;
  danger: string;
  success: string;
  setWarmup: string;
  setDrop: string;
  setFailure: string;
};

export type PaletteId = 'volt' | 'aurora' | 'ember' | 'glacier' | 'graphite';
export type Mode = 'dark' | 'light';
export type Appearance = 'dark' | 'light' | 'system';

export interface Palette {
  id: PaletteId;
  name: string;
  dark: ThemeTokens;
  light: ThemeTokens;
}

// ────────────────────────────────────────────────────────────────────
// Shared colors (identical across all palettes)
// ────────────────────────────────────────────────────────────────────

const shared = {
  success: '#34D399',
  setWarmup: '#F5A524',
  setDrop: '#4DA3FF',
  setFailure: '#FF5C5C',
} as const;

// ────────────────────────────────────────────────────────────────────
// Palettes
// ────────────────────────────────────────────────────────────────────

export const palettes: Record<PaletteId, Palette> = {
  volt: {
    id: 'volt',
    name: 'Volt',
    dark: {
      background: '#0B0C0E',
      surface: '#14161A',
      elevated: '#1C1F24',
      border: '#272B31',
      text: '#F4F5F7',
      textMuted: '#8A9099',
      accent: '#C6FF3D',
      onAccent: '#0B0C0E',
      accentSubtle: '#C6FF3D22',
      prGold: '#FFC857',
      danger: '#FF5C5C',
      ...shared,
    },
    light: {
      background: '#F7F7F9',
      surface: '#FFFFFF',
      elevated: '#FFFFFF',
      border: '#E4E6EA',
      text: '#0B0C0E',
      textMuted: '#5E6570',
      accent: '#5C8A00',
      onAccent: '#FFFFFF',
      accentSubtle: '#5C8A0018',
      prGold: '#B7791F',
      danger: '#D93636',
      ...shared,
    },
  },

  aurora: {
    id: 'aurora',
    name: 'Aurora',
    dark: {
      background: '#0A0A12',
      surface: '#12121C',
      elevated: '#1B1B28',
      border: '#272736',
      text: '#F3F3FA',
      textMuted: '#8888A0',
      accent: '#7C5CFF',
      onAccent: '#FFFFFF',
      accentSubtle: '#7C5CFF22',
      prGold: '#FFCB47',
      danger: '#FF5C7A',
      ...shared,
    },
    light: {
      background: '#F7F7F9',
      surface: '#FFFFFF',
      elevated: '#FFFFFF',
      border: '#E2E2EC',
      text: '#0A0A12',
      textMuted: '#5E5E72',
      accent: '#5A3FCC',
      onAccent: '#FFFFFF',
      accentSubtle: '#5A3FCC18',
      prGold: '#B8860B',
      danger: '#CC3355',
      ...shared,
    },
  },

  ember: {
    id: 'ember',
    name: 'Ember',
    dark: {
      background: '#0E0B0A',
      surface: '#171211',
      elevated: '#211A18',
      border: '#2E2522',
      text: '#F6F1EE',
      textMuted: '#9A8C86',
      accent: '#FF6B3D',
      onAccent: '#0E0B0A',
      accentSubtle: '#FF6B3D22',
      prGold: '#FFD166',
      danger: '#FF4D4D',
      ...shared,
    },
    light: {
      background: '#F7F7F9',
      surface: '#FFFFFF',
      elevated: '#FFFFFF',
      border: '#E8E0DC',
      text: '#0E0B0A',
      textMuted: '#6B5E58',
      accent: '#CC4D1E',
      onAccent: '#FFFFFF',
      accentSubtle: '#CC4D1E18',
      prGold: '#B88B2B',
      danger: '#CC3333',
      ...shared,
    },
  },

  glacier: {
    id: 'glacier',
    name: 'Glacier',
    dark: {
      background: '#080D10',
      surface: '#0F171B',
      elevated: '#172229',
      border: '#22313A',
      text: '#EEF6F8',
      textMuted: '#7F95A0',
      accent: '#2DD4BF',
      onAccent: '#080D10',
      accentSubtle: '#2DD4BF22',
      prGold: '#FBBF24',
      danger: '#F87171',
      ...shared,
    },
    light: {
      background: '#F7F7F9',
      surface: '#FFFFFF',
      elevated: '#FFFFFF',
      border: '#DAE6EA',
      text: '#080D10',
      textMuted: '#506872',
      accent: '#0E9E8E',
      onAccent: '#FFFFFF',
      accentSubtle: '#0E9E8E18',
      prGold: '#B58C0A',
      danger: '#CC4444',
      ...shared,
    },
  },

  graphite: {
    id: 'graphite',
    name: 'Graphite',
    dark: {
      background: '#0A0A0A',
      surface: '#121212',
      elevated: '#1A1A1A',
      border: '#262626',
      text: '#FAFAFA',
      textMuted: '#8A8A8A',
      accent: '#FF4D2E',
      onAccent: '#0A0A0A',
      accentSubtle: '#FF4D2E22',
      prGold: '#F5C451',
      danger: '#FF5C5C',
      ...shared,
    },
    light: {
      background: '#F7F7F9',
      surface: '#FFFFFF',
      elevated: '#FFFFFF',
      border: '#E2E2E2',
      text: '#0A0A0A',
      textMuted: '#666666',
      accent: '#CC3310',
      onAccent: '#FFFFFF',
      accentSubtle: '#CC331018',
      prGold: '#B89530',
      danger: '#D93636',
      ...shared,
    },
  },
} as const;

// ────────────────────────────────────────────────────────────────────
// Palette list (for the settings gallery)
// ────────────────────────────────────────────────────────────────────

export const paletteList: Palette[] = Object.values(palettes);

// ────────────────────────────────────────────────────────────────────
// Default theme state
// ────────────────────────────────────────────────────────────────────

export const DEFAULT_PALETTE_ID: PaletteId = 'volt';
export const DEFAULT_APPEARANCE: Appearance = 'dark';
