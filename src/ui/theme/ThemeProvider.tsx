/**
 * ThemeProvider — wraps the app and provides the resolved theme tokens
 * to all children via React context. Handles palette switching, appearance
 * mode (dark/light/system), and custom accent colors with WCAG AA enforcement.
 */

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { useColorScheme } from 'react-native';
import {
  palettes,
  PaletteId,
  Appearance,
  ThemeTokens,
  DEFAULT_PALETTE_ID,
  DEFAULT_APPEARANCE,
} from './palettes';

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

export interface ThemeState {
  paletteId: PaletteId;
  appearance: Appearance;
  customAccent?: string;
}

export interface ThemeContextValue {
  theme: ThemeTokens;
  state: ThemeState;
  isDark: boolean;
  setPalette: (id: PaletteId) => void;
  setAppearance: (a: Appearance) => void;
  setCustomAccent: (hex?: string) => void;
}

// ────────────────────────────────────────────────────────────────────
// Color utilities
// ────────────────────────────────────────────────────────────────────

/** Parse a hex color string to RGB values (0–255). */
function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return [r, g, b];
}

/** Relative luminance per WCAG 2.1. */
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colors. */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Choose black or white text on the accent, enforcing WCAG AA (4.5:1).
 * Falls back to whichever has the higher contrast.
 */
function accessibleOnAccent(accentHex: string): string {
  const whiteContrast = contrastRatio(accentHex, '#FFFFFF');
  const blackContrast = contrastRatio(accentHex, '#000000');
  return blackContrast >= whiteContrast ? '#000000' : '#FFFFFF';
}

/** Derive a subtle background tint from an accent color (8% opacity). */
function accentSubtleFromHex(hex: string): string {
  return hex + '14'; // ~8% alpha
}

/**
 * Override the base theme tokens with a custom accent, auto-deriving
 * the onAccent color (AA-compliant) and accentSubtle.
 */
function withCustomAccent(base: ThemeTokens, hex: string): ThemeTokens {
  return {
    ...base,
    accent: hex,
    onAccent: accessibleOnAccent(hex),
    accentSubtle: accentSubtleFromHex(hex),
  };
}

// ────────────────────────────────────────────────────────────────────
// Context
// ────────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ────────────────────────────────────────────────────────────────────
// Provider
// ────────────────────────────────────────────────────────────────────

export interface ThemeProviderProps {
  initial?: ThemeState;
  onStateChange?: (state: ThemeState) => void;
  children: React.ReactNode;
}

export function ThemeProvider({
  initial,
  onStateChange,
  children,
}: ThemeProviderProps) {
  const systemScheme = useColorScheme() ?? 'dark';

  const [state, setState] = useState<ThemeState>(
    initial ?? {
      paletteId: DEFAULT_PALETTE_ID,
      appearance: DEFAULT_APPEARANCE,
    },
  );

  // Resolve the current mode (dark or light)
  const isDark = useMemo(() => {
    return state.appearance === 'system'
      ? systemScheme === 'dark'
      : state.appearance === 'dark';
  }, [state.appearance, systemScheme]);

  // Resolve the full theme tokens
  const theme = useMemo(() => {
    const mode = isDark ? 'dark' : 'light';
    const base = palettes[state.paletteId][mode];
    return state.customAccent
      ? withCustomAccent(base, state.customAccent)
      : base;
  }, [state.paletteId, state.customAccent, isDark]);

  // Persist state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  const setPalette = useCallback(
    (paletteId: PaletteId) =>
      setState((s) => ({ ...s, paletteId })),
    [],
  );

  const setAppearance = useCallback(
    (appearance: Appearance) =>
      setState((s) => ({ ...s, appearance })),
    [],
  );

  const setCustomAccent = useCallback(
    (customAccent?: string) =>
      setState((s) => ({ ...s, customAccent })),
    [],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      state,
      isDark,
      setPalette,
      setAppearance,
      setCustomAccent,
    }),
    [theme, state, isDark, setPalette, setAppearance, setCustomAccent],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// ────────────────────────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}

// Export utilities for testing
export { contrastRatio, accessibleOnAccent, relativeLuminance };
