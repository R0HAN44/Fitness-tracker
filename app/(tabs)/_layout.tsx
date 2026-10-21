/**
 * Tab layout — bottom tab navigation with 5 tabs.
 * Center "Workout" tab is prominent with the accent color.
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/ui/theme/ThemeProvider';
import { layout, spacing, radii, typography } from '../../src/ui/theme/tokens';

export default function TabLayout() {
  const { theme, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? layout.tabBarHeight + 34 : layout.tabBarHeight + 8,
          paddingTop: spacing.xs,
          paddingBottom: Platform.OS === 'ios' ? 34 : spacing.sm,
        },
        tabBarLabelStyle: {
          fontFamily: typography.caption.fontFamily,
          fontSize: typography.caption.fontSize,
          letterSpacing: typography.caption.letterSpacing,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.workoutButton,
                {
                  backgroundColor: theme.accent,
                  shadowColor: theme.accent,
                },
              ]}
            >
              <Ionicons
                name="add"
                size={28}
                color={theme.onAccent}
              />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercises',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  workoutButton: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});
