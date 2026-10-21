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

import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  type ViewStyle,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
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
  maxHeight?: number;
  containerStyle?: ViewStyle;
}

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = SCREEN_HEIGHT * 0.85,
  containerStyle,
}: SheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const closeSheet = () => {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }, () => {
      runOnJS(onClose)();
    });
    backdropOpacity.value = withTiming(0, { duration: 200 });
  };

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, motion.normal);
      backdropOpacity.value = withTiming(0.6, { duration: 250 });
    } else {
      translateY.value = SCREEN_HEIGHT;
      backdropOpacity.value = 0;
    }
  }, [visible]);

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

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={closeSheet}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
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
                maxHeight,
                paddingBottom: Math.max(insets.bottom, spacing.base),
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
            {(title || subtitle) && (
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

                <Pressable
                  onPress={() => {
                    lightImpact();
                    closeSheet();
                  }}
                  hitSlop={12}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={22} color={theme.textMuted} />
                </Pressable>
              </View>
            )}

            {/* Content */}
            <View style={styles.content}>{children}</View>
          </Animated.View>
        </GestureDetector>
      </KeyboardAvoidingView>
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
  },
  headerTitles: {
    flex: 1,
  },
  closeButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
  },
});
