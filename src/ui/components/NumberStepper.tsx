/**
 * NumberStepper — tactile stepper component for reps, weight, and timers.
 *
 * Features:
 *   - Decrement (-) and Increment (+) buttons with haptics
 *   - Long-press auto-repeat for fast adjustments
 *   - Tap to edit value directly via inline numeric input
 *   - Configurable min, max, step, and unit
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Pressable,
  TextInput,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { Text } from '../typography/Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radii, layout, typography } from '../theme/tokens';
import { lightImpact, mediumImpact } from '../../lib/haptics';
import { Ionicons } from '@expo/vector-icons';

export interface NumberStepperProps {
  value: number;
  onChange: (val: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  decimals?: number;
  size?: 'sm' | 'md' | 'lg';
  containerStyle?: ViewStyle;
  disabled?: boolean;
}

export function NumberStepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  unit,
  decimals,
  size = 'md',
  containerStyle,
  disabled = false,
}: NumberStepperProps) {
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(value.toString());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setEditText(value.toString());
    }
  }, [value, isEditing]);

  const handleStep = (direction: -1 | 1) => {
    if (disabled) return;
    lightImpact();
    const nextVal = Math.round((value + direction * step) * 100) / 100;
    const clamped = Math.min(max, Math.max(min, nextVal));
    onChange(clamped);
  };

  const startRepeat = (direction: -1 | 1) => {
    if (disabled) return;
    mediumImpact();
    handleStep(direction);

    timerRef.current = setInterval(() => {
      onChange(Math.min(max, Math.max(min, Math.round((value + direction * step) * 100) / 100)));
    }, 120);
  };

  const stopRepeat = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleTextSubmit = () => {
    setIsEditing(false);
    const parsed = parseFloat(editText);
    if (!isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, Math.round(parsed * 100) / 100));
      onChange(clamped);
    } else {
      setEditText(value.toString());
    }
  };

  const displayString =
    decimals !== undefined
      ? value.toFixed(decimals)
      : (Math.round(value * 100) / 100).toString();

  const buttonSize = {
    sm: 32,
    md: 40,
    lg: 48,
  }[size];

  const fontSize = {
    sm: typography.bodySm.fontSize,
    md: typography.body.fontSize,
    lg: typography.headingSm.fontSize,
  }[size];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          opacity: disabled ? 0.5 : 1,
        },
        containerStyle,
      ]}
    >
      <Pressable
        onPress={() => handleStep(-1)}
        onPressIn={() => startRepeat(-1)}
        onPressOut={stopRepeat}
        disabled={disabled || value <= min}
        style={({ pressed }) => [
          styles.button,
          {
            width: buttonSize,
            height: buttonSize,
            backgroundColor: pressed ? theme.elevated : 'transparent',
            opacity: value <= min ? 0.3 : 1,
          },
        ]}
        hitSlop={layout.minTouchTarget - buttonSize}
      >
        <Ionicons name="remove" size={18} color={theme.text} />
      </Pressable>

      <View style={styles.valueContainer}>
        {isEditing ? (
          <TextInput
            value={editText}
            onChangeText={setEditText}
            onBlur={handleTextSubmit}
            onSubmitEditing={handleTextSubmit}
            autoFocus
            keyboardType="decimal-pad"
            selectTextOnFocus
            style={[
              styles.textInput,
              {
                color: theme.accent,
                fontSize,
                fontFamily: typography.mono.fontFamily,
              },
            ]}
          />
        ) : (
          <Pressable
            onPress={() => {
              if (!disabled) setIsEditing(true);
            }}
            style={styles.valueTouchable}
          >
            <Text
              style={[
                styles.valueText,
                {
                  fontSize,
                  color: theme.text,
                  fontFamily: typography.mono.fontFamily,
                },
              ]}
              tabular
            >
              {displayString}
            </Text>
            {unit && (
              <Text variant="caption" color="textMuted" style={styles.unitText}>
                {unit}
              </Text>
            )}
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={() => handleStep(1)}
        onPressIn={() => startRepeat(1)}
        onPressOut={stopRepeat}
        disabled={disabled || value >= max}
        style={({ pressed }) => [
          styles.button,
          {
            width: buttonSize,
            height: buttonSize,
            backgroundColor: pressed ? theme.elevated : 'transparent',
            opacity: value >= max ? 0.3 : 1,
          },
        ]}
        hitSlop={layout.minTouchTarget - buttonSize}
      >
        <Ionicons name="add" size={18} color={theme.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    minWidth: 60,
  },
  valueTouchable: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  valueText: {
    fontWeight: '600',
  },
  unitText: {
    marginLeft: spacing.xs,
  },
  textInput: {
    textAlign: 'center',
    paddingVertical: 2,
    fontWeight: '600',
    minWidth: 50,
  },
});
