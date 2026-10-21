/**
 * ListRow — themed pressable row for list items with label, value, and chevron.
 */

import React from 'react';
import { View, Pressable, type PressableProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../typography/Text';
import { useTheme } from '../theme/ThemeProvider';
import { createStyles } from '../theme/createStyles';
import { spacing, radii, layout } from '../theme/tokens';

export interface ListRowProps extends Omit<PressableProps, 'style'> {
  label: string;
  value?: string;
  icon?: React.ReactNode;
  showChevron?: boolean;
  destructive?: boolean;
}

export function ListRow({
  label,
  value,
  icon,
  showChevron = true,
  destructive = false,
  ...rest
}: ListRowProps) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      {...rest}
    >
      {icon && <View style={styles.iconWrap}>{icon}</View>}
      <Text
        variant="body"
        style={[styles.label, destructive && { color: theme.danger }]}
      >
        {label}
      </Text>
      {value && (
        <Text variant="body" color="textMuted" style={styles.value}>
          {value}
        </Text>
      )}
      {showChevron && (
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      )}
    </Pressable>
  );
}

const useStyles = createStyles((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: theme.border,
    minHeight: layout.minTouchTarget,
  },
  rowPressed: {
    backgroundColor: theme.elevated,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: theme.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  label: {
    flex: 1,
  },
  value: {
    marginRight: spacing.sm,
  },
}));
