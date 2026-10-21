/**
 * Button — themed pressable button with variants.
 *
 * Variants:
 *   primary   — accent background, onAccent text
 *   secondary — surface background with border
 *   ghost     — transparent, text-colored
 *   danger    — danger-colored for destructive actions
 */

import React from 'react';
import { Pressable, type PressableProps, ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../typography/Text';
import { useTheme } from '../theme/ThemeProvider';
import { createStyles } from '../theme/createStyles';
import { spacing, radii, layout, typography } from '../theme/tokens';
import { lightImpact } from '../../lib/haptics';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  haptic = true,
  disabled,
  onPress,
  style,
  ...rest
}: ButtonProps) {
  const styles = useStyles();
  const { theme } = useTheme();

  const handlePress = (e: any) => {
    if (haptic) lightImpact();
    onPress?.(e);
  };

  const bgColor = {
    primary: theme.accent,
    secondary: theme.surface,
    ghost: 'transparent',
    danger: theme.danger,
  }[variant];

  const textColor = {
    primary: theme.onAccent,
    secondary: theme.text,
    ghost: theme.accent,
    danger: '#FFFFFF',
  }[variant];

  const borderColor = variant === 'secondary' ? theme.border : 'transparent';

  const heightMap = { sm: 36, md: layout.minTouchTarget, lg: 52 };
  const paddingMap = { sm: spacing.md, md: spacing.base, lg: spacing.lg };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bgColor,
          borderColor,
          height: heightMap[size],
          paddingHorizontal: paddingMap[size],
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      disabled={disabled || loading}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={title}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text
            variant={size === 'sm' ? 'bodySm' : 'body'}
            style={{
              color: textColor,
              fontFamily: typography.headingSm.fontFamily,
            }}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const useStyles = createStyles((theme) => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    marginRight: 2,
  },
}));
