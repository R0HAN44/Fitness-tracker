/**
 * createStyles — a helper for building theme-aware StyleSheets.
 *
 * Components define styles as a function of (theme, tokens) and get
 * automatic re-renders when the theme changes.
 *
 * Usage:
 *   const useStyles = createStyles((theme) => ({
 *     container: { backgroundColor: theme.background },
 *   }));
 *
 *   function MyComponent() {
 *     const styles = useStyles();
 *     return <View style={styles.container} />;
 *   }
 */

import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
import { useTheme } from './ThemeProvider';
import type { ThemeTokens } from './palettes';

type NamedStyles<T> = {
  [P in keyof T]: ViewStyle | TextStyle | ImageStyle;
};

/**
 * Create a hook that returns theme-aware styles.
 * The factory function receives the current theme tokens and
 * should return a plain styles object (like StyleSheet.create).
 */
export function createStyles<T extends NamedStyles<T>>(
  factory: (theme: ThemeTokens) => T,
): () => T {
  return function useStyles(): T {
    const { theme } = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)) as T, [theme]);
  };
}
