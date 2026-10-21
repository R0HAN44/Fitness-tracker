/**
 * OptionMenuSheet — themed action bottom sheet replacing native alert popups.
 * Features:
 *   - Follows Ironlog design system (theme colors, radii, typography, firm springs)
 *   - Supports icons, subtitles, and destructive options (theme.danger)
 *   - Fast touch response with light impact haptics
 */

import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sheet } from './Sheet';
import { Text } from '../typography/Text';
import { Button } from './Button';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radii } from '../theme/tokens';
import { lightImpact } from '../../lib/haptics';

export interface OptionMenuItem {
  id: string;
  label: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
}

export interface OptionMenuSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  options: OptionMenuItem[];
}

export function OptionMenuSheet({
  visible,
  onClose,
  title,
  subtitle,
  options,
}: OptionMenuSheetProps) {
  const { theme } = useTheme();

  const handleSelect = (item: OptionMenuItem) => {
    lightImpact();
    onClose();
    // Allow sheet closing animation to start cleanly before callback
    setTimeout(() => {
      item.onPress();
    }, 120);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
    >
      <View style={styles.container}>
        <ScrollView
          style={{ maxHeight: 420 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.optionsList, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            {options.map((opt, idx) => {
              const isLast = idx === options.length - 1;
              const textColor = opt.destructive ? theme.danger : theme.text;
              const iconColor = opt.destructive ? theme.danger : theme.textMuted;

              return (
                <Pressable
                  key={opt.id}
                  onPress={() => handleSelect(opt)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    !isLast && { borderBottomWidth: 1, borderBottomColor: theme.border },
                    { backgroundColor: pressed ? theme.elevated : 'transparent' },
                  ]}
                >
                  {opt.icon && (
                    <View style={styles.iconContainer}>
                      <Ionicons name={opt.icon} size={20} color={iconColor} />
                    </View>
                  )}
                  <View style={styles.labelContainer}>
                    <Text
                      variant="body"
                      style={{
                        color: textColor,
                        fontWeight: opt.destructive ? '700' : '600',
                      }}
                    >
                      {opt.label}
                    </Text>
                    {opt.subtitle && (
                      <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                        {opt.subtitle}
                      </Text>
                    )}
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={opt.destructive ? theme.danger + '88' : theme.textMuted}
                  />
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <Button
          title="Cancel"
          variant="secondary"
          size="md"
          onPress={onClose}
          fullWidth
          style={styles.cancelBtn}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.sm,
  },
  optionsList: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.base,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  iconContainer: {
    width: 28,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  labelContainer: {
    flex: 1,
  },
  cancelBtn: {
    marginTop: spacing.xs,
  },
});
