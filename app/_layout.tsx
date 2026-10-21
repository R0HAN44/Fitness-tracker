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
import { seedBuiltinMeasurements } from '../src/db/queries/measurements';
import { requestNotificationPermissions } from '../src/lib/notifications';
import { AppState, type AppStateStatus } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isAppLockConfigured, authenticateAppLock } from '../src/lib/appLock';
import { Button } from '../src/ui/components/Button';
import { Text } from '../src/ui/typography/Text';
import { spacing, radii } from '../src/ui/theme/tokens';

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

        // Seed built-in body measurements (idempotent)
        seedBuiltinMeasurements();

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
  const [isLocked, setIsLocked] = useState(() => isAppLockConfigured());

  const triggerAuth = useCallback(async () => {
    if (!isAppLockConfigured()) {
      setIsLocked(false);
      return;
    }
    const success = await authenticateAppLock();
    if (success) {
      setIsLocked(false);
    }
  }, []);

  useEffect(() => {
    if (isAppLockConfigured()) {
      triggerAuth();
    }

    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        if (isAppLockConfigured()) {
          setIsLocked(true);
          triggerAuth();
        }
      }
    });

    return () => sub.remove();
  }, [triggerAuth]);

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
        <Stack.Screen name="workout/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="records/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="measurements/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="measurements/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/appearance" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/import-export" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/backup-restore" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="reports/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="reports/monthly" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="reports/yearly" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="reports/ranking" options={{ animation: 'slide_from_right' }} />
      </Stack>

      {isLocked && (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.lockOverlay,
            { backgroundColor: theme.background },
          ]}
        >
          <View
            style={[
              styles.lockIconWrap,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Ionicons name="lock-closed" size={36} color={theme.accent} />
          </View>
          <Text variant="headingLg" style={{ fontWeight: '800', marginBottom: spacing.xs }}>
            Ironlog is Locked
          </Text>
          <Text
            variant="body"
            color="textMuted"
            center
            style={{ marginBottom: spacing['3xl'], paddingHorizontal: spacing.xl }}
          >
            Biometric verification is required to access your workouts.
          </Text>
          <Button
            title="Unlock with Biometrics"
            variant="primary"
            size="lg"
            icon={<Ionicons name="finger-print-outline" size={20} color={theme.onAccent} />}
            onPress={triggerAuth}
          />
        </View>
      )}
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
  lockOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  lockIconWrap: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
});
