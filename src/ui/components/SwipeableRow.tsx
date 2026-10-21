/**
 * SwipeableRow — swipe-to-reveal actions for list items (e.g., delete set or exercise).
 *
 * Built with react-native-reanimated and react-native-gesture-handler.
 * Features:
 *   - Swipe left for destructive / quick actions
 *   - Haptic feedback upon reaching the action threshold
 *   - Smooth spring recovery
 */

import React from 'react';
import { View, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, motion } from '../theme/tokens';
import { mediumImpact, lightImpact } from '../../lib/haptics';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../typography/Text';

export interface SwipeAction {
  key: string;
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
  backgroundColor?: string;
  color?: string;
  onPress: () => void;
}

export interface SwipeableRowProps {
  children: React.ReactNode;
  rightActions?: SwipeAction[];
  onDelete?: () => void;
  deleteLabel?: string;
  containerStyle?: ViewStyle;
  disabled?: boolean;
}

const ACTION_WIDTH = 72;

export function SwipeableRow({
  children,
  rightActions,
  onDelete,
  deleteLabel = 'Delete',
  containerStyle,
  disabled = false,
}: SwipeableRowProps) {
  const { theme } = useTheme();

  const actions: SwipeAction[] = rightActions ?? (onDelete
    ? [
        {
          key: 'delete',
          icon: 'trash-outline',
          label: deleteLabel,
          backgroundColor: theme.danger,
          color: theme.onAccent,
          onPress: onDelete,
        },
      ]
    : []);

  const totalActionsWidth = actions.length * ACTION_WIDTH;
  const translateX = useSharedValue(0);
  const hasTriggeredHaptic = useSharedValue(false);

  const triggerHaptic = () => {
    mediumImpact();
  };

  const closeRow = () => {
    translateX.value = withSpring(0, motion.fast);
    hasTriggeredHaptic.value = false;
  };

  const panGesture = Gesture.Pan()
    .enabled(!disabled && actions.length > 0)
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      // Only allow swiping left
      if (event.translationX <= 0) {
        // Resistance when pulling past total actions width
        if (Math.abs(event.translationX) > totalActionsWidth) {
          const excess = Math.abs(event.translationX) - totalActionsWidth;
          translateX.value = -(totalActionsWidth + excess * 0.3);
        } else {
          translateX.value = event.translationX;
        }

        if (
          Math.abs(event.translationX) >= totalActionsWidth &&
          !hasTriggeredHaptic.value
        ) {
          hasTriggeredHaptic.value = true;
          runOnJS(triggerHaptic)();
        }
      } else {
        translateX.value = 0;
      }
    })
    .onEnd((event) => {
      if (
        Math.abs(event.translationX) > totalActionsWidth * 0.5 ||
        event.velocityX < -400
      ) {
        translateX.value = withSpring(-totalActionsWidth, motion.fast);
      } else {
        translateX.value = withSpring(0, motion.fast);
      }
    });

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleActionPress = (action: SwipeAction) => {
    lightImpact();
    closeRow();
    action.onPress();
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Background action buttons */}
      <View style={styles.actionsContainer}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            onPress={() => handleActionPress(action)}
            style={[
              styles.actionButton,
              {
                width: ACTION_WIDTH,
                backgroundColor: action.backgroundColor ?? theme.danger,
              },
            ]}
          >
            {action.icon && (
              <Ionicons
                name={action.icon}
                size={20}
                color={action.color ?? '#fff'}
              />
            )}
            {action.label && (
              <Text
                variant="caption"
                style={{
                  color: action.color ?? '#fff',
                  fontWeight: '600',
                  marginTop: 2,
                }}
              >
                {action.label}
              </Text>
            )}
          </Pressable>
        ))}
      </View>

      {/* Foreground content row */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.foreground,
            { backgroundColor: theme.background },
            rowAnimatedStyle,
          ]}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
  },
  actionsContainer: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    zIndex: 1,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  foreground: {
    zIndex: 2,
    width: '100%',
  },
});
