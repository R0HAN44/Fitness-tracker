/**
 * Chip — compact, tactile filter chip for muscle/equipment filters, tags, and folders.
 * Features:
 *   - Fixed height (32-34px) avoiding vertical stretching
 *   - flexGrow: 0, flexShrink: 0, alignSelf: 'center'
 *   - Immediate press feedback (<100ms)
 */

import React from 'react';
import { View, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../typography/Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radii } from '../theme/tokens';
import { selectionFeedback } from '../../lib/haptics';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Chip({
  label,
  selected = false,
  onPress,
  size = 'md',
  icon,
  style,
}: ChipProps) {
  const { theme } = useTheme();

  const handlePress = () => {
    selectionFeedback();
    onPress?.();
  };

  const chipHeight = size === 'sm' ? 30 : 34;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        {
          height: chipHeight,
          backgroundColor: selected ? theme.accent : theme.surface,
          borderColor: selected ? theme.accent : theme.border,
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <Text
        variant={size === 'sm' ? 'caption' : 'bodySm'}
        style={{
          color: selected ? theme.onAccent : theme.text,
          fontWeight: selected ? '700' : '500',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  iconWrap: {
    marginRight: 4,
  },
});
