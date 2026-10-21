/**
 * Notifications wrapper — scheduled local notifications for rest timer completion.
 *
 * Fires when rest countdown hits 0 even if the device screen is locked or app is backgrounded.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Set default notification presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let _currentNotificationId: string | null = null;

/**
 * Request notification permissions if not already granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('rest_timer', {
        name: 'Rest Timer',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C6FF3D',
        sound: 'default',
        enableVibrate: true,
      });
    }

    return true;
  } catch (err) {
    console.warn('Could not request notification permissions:', err);
    return false;
  }
}

/**
 * Schedule a local notification to fire after `seconds`.
 * Cancels any existing scheduled rest timer notification first.
 */
export async function scheduleRestTimerNotification(seconds: number): Promise<string | null> {
  if (Platform.OS === 'web' || seconds <= 0) return null;

  try {
    await cancelScheduledRestTimerNotification();

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rest Finished! ⏰',
        body: 'Time to crush your next set.',
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        channelId: 'rest_timer',
      },
    });

    _currentNotificationId = id;
    return id;
  } catch (err) {
    console.warn('Could not schedule rest timer notification:', err);
    return null;
  }
}

/**
 * Fire the rest-finished notification immediately with sound and banner.
 * Used when the countdown hits 0 in the foreground.
 */
export async function triggerRestFinishedNotification(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await cancelScheduledRestTimerNotification();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rest Finished! ⏰',
        body: 'Time to crush your next set.',
        sound: 'default',
      },
      trigger: {
        channelId: 'rest_timer',
      } as any,
    });
  } catch (err) {
    console.warn('Could not trigger immediate rest finished notification:', err);
  }
}

/**
 * Cancel the active scheduled rest timer notification (e.g. on skip or manual adjustment).
 */
export async function cancelScheduledRestTimerNotification(): Promise<void> {
  if (!_currentNotificationId) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(_currentNotificationId);
    _currentNotificationId = null;
  } catch (err) {
    console.warn('Could not cancel rest timer notification:', err);
  }
}
