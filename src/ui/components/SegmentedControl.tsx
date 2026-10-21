/**
 * SegmentedControl — tactile pill / tab switch component.
 *
 * Provides a segmented control with an animated indicator, haptics,
 * and support for custom icons and badges.
 */

import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  type ViewStyle,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Text } from '../typography/Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radii, typography, motion } from '../theme/tokens';
import { selectionFeedback } from '../../lib/haptics';

export interface SegmentOption<T extends string | number> {
  label: string;
  value: T;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface SegmentedControlProps<T extends string | number> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  containerStyle?: ViewStyle;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
  containerStyle,
}: SegmentedControlProps<T>) {
  const { theme } = useTheme();
  const [containerWidth, setContainerWidth] = React.useState(0);
  const selectedIndex = options.findIndex((opt) => opt.value === value);

  const segmentWidth =
    containerWidth > 0 && options.length > 0
      ? (containerWidth - 6) / options.length // 6px for 3px container padding on each side
      : 0;

  const translateX = useSharedValue(0);

  React.useEffect(() => {
    if (segmentWidth > 0 && selectedIndex >= 0) {
      translateX.value = withSpring(selectedIndex * segmentWidth, motion.switch);
    }
  }, [selectedIndex, segmentWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: segmentWidth,
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const handleSelect = (val: T) => {
    if (val !== value) {
      selectionFeedback();
      onChange(val);
    }
  };

  const padVertical = size === 'sm' ? spacing.xs : spacing.sm;

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.container,
        {
          backgroundColor: theme.elevated,
          borderColor: theme.border,
        },
        containerStyle,
      ]}
    >
      {segmentWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            {
              backgroundColor: theme.accent,
            },
            indicatorStyle,
          ]}
        />
      )}

      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => handleSelect(option.value)}
            style={[styles.segment, { paddingVertical: padVertical }]}
          >
            <View style={styles.contentRow}>
              {option.icon && (
                <View style={styles.iconWrapper}>{option.icon}</View>
              )}
              <Text
                variant={size === 'sm' ? 'caption' : 'bodySm'}
                style={[
                  styles.label,
                  {
                    color: isSelected ? theme.onAccent : theme.textMuted,
                    fontWeight: isSelected ? '600' : '400',
                  },
                ]}
                numberOfLines={1}
              >
                {option.label}
              </Text>
              {option.badge != null && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: isSelected
                        ? theme.surface
                        : theme.border,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: isSelected ? theme.text : theme.textMuted,
                      fontSize: 10,
                    }}
                  >
                    {option.badge}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 3,
    position: 'relative',
    alignItems: 'center',
    width: '100%',
  },
  indicator: {
    position: 'absolute',
    left: 3,
    top: 3,
    bottom: 3,
    borderRadius: radii.md,
    zIndex: 1,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginRight: spacing.xs,
  },
  label: {
    textAlign: 'center',
  },
  badge: {
    marginLeft: spacing.xs,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.full,
  },
});
