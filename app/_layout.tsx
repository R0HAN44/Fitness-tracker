/**
 * Root layout — initializes the database, loads fonts, resolves the
 * theme before first render, and wraps the app in ThemeProvider.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemeProvider, useTheme } from '../src/ui/theme/ThemeProvider';
import type { ThemeState } from '../src/ui/theme/ThemeProvider';
import { DEFAULT_PALETTE_ID, DEFAULT_APPEARANCE, palettes } from '../src/ui/theme/palettes';
import { initializeDatabase } from '../src/db/init';
import { loadThemeState, saveThemeState } from '../src/db/queries/settings';
import { seedExercises } from '../src/db/seed';
import { seedStarterRoutines } from '../src/db/queries/routines';
import { requestNotificationPermissions } from '../src/lib/notifications';

// Keep the splash screen visible until we're ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [themeState, setThemeState] = useState<ThemeState>({
    paletteId: DEFAULT_PALETTE_ID,
    appearance: DEFAULT_APPEARANCE,
  });

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    async function init() {
      try {
        // Initialize database (creates tables if needed)
        await initializeDatabase();

        // Seed built-in exercises (idempotent)
        await seedExercises();

        // Seed starter routines: PPL, Upper/Lower, Full Body, 5x5
        seedStarterRoutines();

        // Request local notification permissions for rest timer
        requestNotificationPermissions().catch(() => {});

        // Load saved theme state
        const savedTheme = loadThemeState();
        setThemeState(savedTheme);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setAppReady(true);
      }
    }

    init();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appReady && fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [appReady, fontsLoaded]);

  const handleThemeStateChange = useCallback((state: ThemeState) => {
    saveThemeState(state);
  }, []);

  if (!appReady || !fontsLoaded) {
    // Show a themed loading screen matching the default palette
    const bg = palettes[DEFAULT_PALETTE_ID].dark.background;
    return (
      <View style={[styles.loading, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={palettes[DEFAULT_PALETTE_ID].dark.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex} onLayout={onLayoutRootView}>
      <ThemeProvider initial={themeState} onStateChange={handleThemeStateChange}>
        <RootNavigator />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/** Inner navigator that has access to the theme context. */
function RootNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/appearance" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
