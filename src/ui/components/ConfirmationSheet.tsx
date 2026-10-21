/**
 * ConfirmationSheet — themed confirmation bottom sheet.
 * Replaces default Android Alert.alert dialogs for delete, discard, and critical actions.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Sheet } from './Sheet';
import { Button } from './Button';
import { Text } from '../typography/Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radii } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { lightImpact, mediumImpact } from '../../lib/haptics';

export interface ConfirmationSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
}

export function ConfirmationSheet({
  visible,
  onClose,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  icon = 'trash-outline',
  onConfirm,
}: ConfirmationSheetProps) {
  const { theme } = useTheme();

  const handleConfirm = () => {
    mediumImpact();
    onClose();
    onConfirm();
  };

  const iconBg = destructive ? theme.danger + '22' : theme.accent + '22';
  const iconColor = destructive ? theme.danger : theme.accent;

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        {/* Icon Circle */}
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={32} color={iconColor} />
        </View>

        {/* Title & Message */}
        <Text variant="headingSm" style={styles.title} center>
          {title}
        </Text>
        <Text variant="bodySm" color="textMuted" center style={styles.message}>
          {message}
        </Text>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title={confirmLabel}
            variant={destructive ? 'danger' : 'primary'}
            size="lg"
            onPress={handleConfirm}
            fullWidth
          />
          <Button
            title={cancelLabel}
            variant="secondary"
            size="md"
            onPress={() => {
              lightImpact();
              onClose();
            }}
            fullWidth
          />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.base,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  message: {
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
});
