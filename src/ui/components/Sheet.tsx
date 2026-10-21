/**
 * Sheet — fluid bottom sheet modal.
 *
 * Built with react-native-reanimated and react-native-gesture-handler.
 * Features:
 *   - Drag-down gesture to dismiss
 *   - Dimmed backdrop tap-to-dismiss
 *   - Grabber handle pill
 *   - Header with title and close button
 *   - Safe area bottom padding
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  type ViewStyle,
  Platform,
  Dimensions,
  AccessibilityInfo,
  Keyboard,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../typography/Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radii, motion } from '../theme/tokens';
import { lightImpact } from '../../lib/haptics';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  rightAction?: React.ReactNode;
  maxHeight?: number;
  containerStyle?: ViewStyle;
  scrollable?: boolean;
}

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  rightAction,
  maxHeight = SCREEN_HEIGHT * 0.85,
  containerStyle,
  scrollable = false,
}: SheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [reduceMotion, setReduceMotion] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  // Detect system reduce-motion setting
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  // Keyboard listeners for Android edge-to-edge & iOS
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const closeSheet = () => {
    if (reduceMotion) {
      translateY.value = SCREEN_HEIGHT;
      backdropOpacity.value = 0;
      onClose();
      return;
    }
    // Fast close (180ms) with matching backdrop fade
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: motion.sheetCloseDuration }, () => {
      runOnJS(onClose)();
    });
    backdropOpacity.value = withTiming(0, { duration: motion.sheetCloseDuration });
  };

  useEffect(() => {
    if (visible) {
      if (reduceMotion) {
        translateY.value = 0;
        backdropOpacity.value = 0.6;
      } else {
        // Fast open (firm spring, well-damped, no wobble)
        translateY.value = withSpring(0, motion.sheetOpen);
        backdropOpacity.value = withTiming(0.6, { duration: 200 });
      }
    } else {
      translateY.value = SCREEN_HEIGHT;
      backdropOpacity.value = 0;
      setKeyboardHeight(0);
    }
  }, [visible, reduceMotion]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 120 || event.velocityY > 500) {
        runOnJS(closeSheet)();
      } else {
        translateY.value = withSpring(0, motion.fast);
      }
    });

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) return null;

  const effectiveMaxHeight = keyboardHeight > 0
    ? Math.max(260, SCREEN_HEIGHT - keyboardHeight - insets.top - 20)
    : maxHeight;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={closeSheet}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            lightImpact();
            closeSheet();
          }}
        >
          <Animated.View
            style={[
              styles.backdrop,
              { backgroundColor: 'rgba(0, 0, 0, 0.6)' },
              backdropAnimatedStyle,
            ]}
          />
        </Pressable>

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.elevated,
                borderColor: theme.border,
                maxHeight: effectiveMaxHeight,
                marginBottom: keyboardHeight > 0 ? keyboardHeight : 0,
                paddingBottom: keyboardHeight > 0 ? spacing.sm : footer ? 0 : Math.max(insets.bottom, spacing.base),
              },
              sheetAnimatedStyle,
              containerStyle,
            ]}
          >
            {/* Grabber handle */}
            <View style={styles.handleContainer}>
              <View
                style={[
                  styles.handle,
                  { backgroundColor: theme.border },
                ]}
              />
            </View>

            {/* Header */}
            {(title || subtitle || rightAction) && (
              <View style={styles.header}>
                <View style={styles.headerTitles}>
                  {title && (
                    <Text variant="headingSm" color="text">
                      {title}
                    </Text>
                  )}
                  {subtitle && (
                    <Text variant="caption" color="textMuted">
                      {subtitle}
                    </Text>
                  )}
                </View>

                <View style={styles.headerActions}>
                  {rightAction}
                  <Pressable
                    onPress={() => {
                      lightImpact();
                      closeSheet();
                    }}
                    hitSlop={12}
                    style={styles.closeButton}
                    accessibilityLabel="Close sheet"
                  >
                    <Ionicons name="close" size={22} color={theme.textMuted} />
                  </Pressable>
                </View>
              </View>
            )}

            {/* Content Body */}
            {scrollable ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={{ flexShrink: 1 }}
                contentContainerStyle={[styles.content, { paddingBottom: spacing.lg }]}
              >
                {children}
              </ScrollView>
            ) : (
              <View
                style={[
                  styles.content,
                  (containerStyle as any)?.height ? { flex: 1, minHeight: 0 } : { flexShrink: 1 },
                ]}
              >
                {children}
              </View>
            )}

            {/* Pinned Footer */}
            {footer && (
              <View
                style={[
                  styles.sheetFooter,
                  {
                    borderTopColor: theme.border,
                    backgroundColor: theme.elevated,
                    paddingBottom: Math.max(insets.bottom, spacing.base),
                    flexShrink: 0,
                  },
                ]}
              >
                {footer}
              </View>
            )}
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    flexShrink: 0,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radii.full,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    flexShrink: 0,
  },
  headerTitles: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
  },
  sheetFooter: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
});
