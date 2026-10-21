/**
 * Input — themed text and numeric input component.
 *
 * Supports labels, helper text, error states, prefix/suffix adornments,
 * clear button, tabular numerals, and focus states.
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  type TextInputProps,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import { Text } from '../typography/Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radii, layout, typography } from '../theme/tokens';
import { lightImpact } from '../../lib/haptics';
import { Ionicons } from '@expo/vector-icons';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  helperText?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  clearable?: boolean;
  mono?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: StyleProp<TextStyle>;
}

export function Input({
  label,
  helperText,
  error,
  prefix,
  suffix,
  clearable,
  mono,
  value,
  onChangeText,
  onFocus,
  onBlur,
  containerStyle,
  inputStyle,
  placeholder,
  editable = true,
  ...rest
}: InputProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleClear = () => {
    lightImpact();
    onChangeText?.('');
  };

  const borderColor = error
    ? theme.danger
    : isFocused
    ? theme.accent
    : theme.border;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Text variant="caption" color="textMuted" style={styles.label}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.container,
          {
            backgroundColor: editable ? theme.surface : theme.elevated,
            borderColor,
          },
        ]}
      >
        {prefix && <View style={styles.adornmentLeft}>{prefix}</View>}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          editable={editable}
          style={[
            styles.input,
            {
              color: theme.text,
              ...(mono && {
                fontFamily: typography.mono.fontFamily,
                fontVariant: ['tabular-nums'],
              }),
            },
            inputStyle,
          ]}
          {...rest}
        />

        {clearable && value ? (
          <Pressable
            onPress={handleClear}
            hitSlop={8}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={18} color={theme.textMuted} />
          </Pressable>
        ) : null}

        {suffix && (
          <View style={styles.adornmentRight}>
            {typeof suffix === 'string' ? (
              <Text variant="bodySm" color="textMuted">
                {suffix}
              </Text>
            ) : (
              suffix
            )}
          </View>
        )}
      </View>

      {error ? (
        <Text variant="caption" color="danger" style={styles.footerText}>
          {error}
        </Text>
      ) : helperText ? (
        <Text variant="caption" color="textMuted" style={styles.footerText}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: typography.body.fontSize,
    paddingVertical: spacing.sm,
  },
  adornmentLeft: {
    marginRight: spacing.sm,
  },
  adornmentRight: {
    marginLeft: spacing.sm,
  },
  clearButton: {
    padding: spacing.xs,
  },
  footerText: {
    marginTop: spacing.xs,
  },
});
