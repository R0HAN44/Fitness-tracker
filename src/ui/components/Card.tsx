/**
 * Card — themed container with surface background, border, and radii.
 */

import React from 'react';
import { View, type ViewProps } from 'react-native';
import { createStyles } from '../theme/createStyles';
import { spacing, radii } from '../theme/tokens';

export interface CardProps extends ViewProps {
  elevated?: boolean;
  children: React.ReactNode;
}

export function Card({ elevated = false, style, children, ...rest }: CardProps) {
  const styles = useStyles();

  return (
    <View
      style={[styles.card, elevated && styles.elevated, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  card: {
    backgroundColor: theme.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: theme.border,
  },
  elevated: {
    backgroundColor: theme.elevated,
  },
}));
