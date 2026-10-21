/**
 * Chip — small tappable filter chip for muscle/equipment filters.
 */

import React from 'react';
import { Pressable } from 'react-native';
import { Text } from '../typography/Text';
import { useTheme } from '../theme/ThemeProvider';
import { createStyles } from '../theme/createStyles';
import { spacing, radii } from '../theme/tokens';
import { selectionFeedback } from '../../lib/haptics';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected = false, onPress }: ChipProps) {
  const styles = useStyles();
  const { theme } = useTheme();

  const handlePress = () => {
    selectionFeedback();
    onPress?.();
  };

  return (
    <Pressable
      style={[
        styles.chip,
        selected && {
          backgroundColor: theme.accent,
          borderColor: theme.accent,
        },
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Text
        variant="bodySm"
        style={{
          color: selected ? theme.onAccent : theme.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = createStyles((theme) => ({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
}));
