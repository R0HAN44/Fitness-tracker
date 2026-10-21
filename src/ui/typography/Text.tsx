/**
 * Themed Text component with preset typography variants.
 *
 * Usage:
 *   <Text variant="headingLg">Title</Text>
 *   <Text variant="body" color="textMuted">Subtitle</Text>
 *   <Text variant="mono">135.5</Text>
 */

import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography, type TypographyVariant } from '../theme/tokens';
import type { ThemeTokens } from '../theme/palettes';

export interface TextProps extends RNTextProps {
  /** Typography preset. Defaults to 'body'. */
  variant?: TypographyVariant;
  /** Semantic color token key from the theme. Defaults to 'text'. */
  color?: keyof ThemeTokens;
  /** Center align text. */
  center?: boolean;
  /** Apply tabular-nums (automatic for 'mono' variant). */
  tabular?: boolean;
}

export function Text({
  variant = 'body',
  color = 'text',
  center,
  tabular,
  style,
  children,
  ...rest
}: TextProps) {
  const { theme } = useTheme();

  const variantStyle = typography[variant];
  const isTabular = tabular || variant === 'mono';

  const combinedStyle: TextStyle = {
    ...variantStyle,
    color: theme[color],
    ...(center && { textAlign: 'center' }),
    ...(isTabular && { fontVariant: ['tabular-nums'] }),
  };

  return (
    <RNText
      style={[combinedStyle, style]}
      allowFontScaling
      maxFontSizeMultiplier={1.4}
      {...rest}
    >
      {children}
    </RNText>
  );
}
