/**
 * Design tokens for Ironlog.
 *
 * Spacing, border radii, typography, shadows, and motion durations.
 * Every component references these tokens — no hardcoded values.
 */

// ────────────────────────────────────────────────────────────────────
// Spacing (4px base grid)
// ────────────────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export type SpacingToken = keyof typeof spacing;

// ────────────────────────────────────────────────────────────────────
// Border radii
// ────────────────────────────────────────────────────────────────────

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radii;

// ────────────────────────────────────────────────────────────────────
// Typography (Inter with tabular numerals)
// ────────────────────────────────────────────────────────────────────

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  displayLg: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  displaySm: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  headingLg: {
    fontFamily: fontFamily.semiBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0,
  },
  headingSm: {
    fontFamily: fontFamily.semiBold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: 0,
  },
  bodyLg: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0,
  },
  bodySm: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.3,
  },
  mono: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0,
    fontVariant: ['tabular-nums' as const],
  },
} as const;

export type TypographyVariant = keyof typeof typography;

// ────────────────────────────────────────────────────────────────────
// Shadows (for dark mode; light mode uses lighter opacity)
// ────────────────────────────────────────────────────────────────────

export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

export type ShadowToken = keyof typeof shadows;

// ────────────────────────────────────────────────────────────────────
// Motion (premium, firm springs & fast timings)
// Targets:
//   - modal/sheet open: 200-240ms, close: 180ms
//   - tab/chip/segment switch: 120-160ms
//   - press feedback: <100ms
//   - list transitions: <200ms
// ────────────────────────────────────────────────────────────────────

export const motion = {
  /** Immediate press feedback (<100ms) */
  press: { duration: 80 },
  /** Fast tab / segment / chip switches (120-160ms) */
  switch: { damping: 32, stiffness: 360, mass: 0.7 },
  /** Sheet open firm spring (200-220ms, well-damped, zero wobble) */
  sheetOpen: { damping: 28, stiffness: 280, mass: 0.8 },
  /** Sheet close timing (180ms) */
  sheetCloseDuration: 180,
  /** Modal open/close timing (200ms) */
  modalDuration: 200,
  /** List item transition duration (160ms) */
  listTransitionDuration: 160,
  /** Instant transition */
  instant: { duration: 50 },
  /** Legacy / generic spring tokens (retuned to firm) */
  fast: { damping: 30, stiffness: 320, mass: 0.8 },
  normal: { damping: 28, stiffness: 260, mass: 0.8 },
  slow: { damping: 26, stiffness: 200, mass: 0.9 },
} as const;

export type MotionToken = keyof typeof motion;

// ────────────────────────────────────────────────────────────────────
// Layout constants
// ────────────────────────────────────────────────────────────────────

export const layout = {
  /** Minimum touch target per Apple/Google HIG */
  minTouchTarget: 44,
  /** Tab bar height */
  tabBarHeight: 56,
  /** Workout bar height (minimized) */
  workoutBarHeight: 56,
  /** Screen horizontal padding */
  screenPaddingH: spacing.base,
} as const;
