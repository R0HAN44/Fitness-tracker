/**
 * DraggableList — list component with reordering capabilities.
 *
 * Supports intuitive reordering with up/down controls and drag handles,
 * layout animations, and haptic feedback.
 */

import React, { useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  type ViewStyle,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Text } from '../typography/Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radii, layout } from '../theme/tokens';
import { lightImpact } from '../../lib/haptics';
import { Ionicons } from '@expo/vector-icons';

export interface DraggableListItem {
  id: string;
}

export interface DraggableListProps<T extends DraggableListItem> {
  data: T[];
  onReorder: (newData: T[]) => void;
  renderItem: (item: T, index: number, isEditing: boolean) => React.ReactNode;
  keyExtractor?: (item: T) => string;
  isEditing?: boolean;
  onToggleEditing?: () => void;
  containerStyle?: ViewStyle;
}

export function DraggableList<T extends DraggableListItem>({
  data,
  onReorder,
  renderItem,
  keyExtractor = (item) => item.id,
  isEditing = false,
  containerStyle,
}: DraggableListProps<T>) {
  const { theme } = useTheme();

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= data.length) return;

    lightImpact();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const updated = [...data];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    onReorder(updated);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {data.map((item, index) => {
        const isFirst = index === 0;
        const isLast = index === data.length - 1;

        return (
          <View key={keyExtractor(item)} style={styles.itemWrapper}>
            <View style={styles.content}>{renderItem(item, index, isEditing)}</View>

            {isEditing && (
              <View style={styles.controlsRow}>
                <Pressable
                  onPress={() => moveItem(index, index - 1)}
                  disabled={isFirst}
                  style={({ pressed }) => [
                    styles.moveButton,
                    {
                      backgroundColor: pressed ? theme.elevated : theme.surface,
                      borderColor: theme.border,
                      opacity: isFirst ? 0.3 : 1,
                    },
                  ]}
                  hitSlop={layout.minTouchTarget - 36}
                >
                  <Ionicons name="chevron-up" size={18} color={theme.text} />
                </Pressable>

                <Pressable
                  onPress={() => moveItem(index, index + 1)}
                  disabled={isLast}
                  style={({ pressed }) => [
                    styles.moveButton,
                    {
                      backgroundColor: pressed ? theme.elevated : theme.surface,
                      borderColor: theme.border,
                      opacity: isLast ? 0.3 : 1,
                    },
                  ]}
                  hitSlop={layout.minTouchTarget - 36}
                >
                  <Ionicons name="chevron-down" size={18} color={theme.text} />
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  itemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  content: {
    flex: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
    gap: spacing.xs,
  },
  moveButton: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
