/**
 * App Lock service — biometric authentication via expo-local-authentication
 * with fallback to device PIN/Pattern/Password.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { getSettings, updateSettings } from '../db/queries/settings';

/**
 * Check if the device has biometric hardware and enrolled credentials.
 */
export async function isBiometricsSupported(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

/**
 * Prompt user for biometric unlock with OS fallback to PIN/Pattern.
 */
export async function authenticateAppLock(reason: string = 'Unlock Ironlog'): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Use Device Passcode',
      disableDeviceFallback: false,
      cancelLabel: 'Cancel',
    });
    return result.success;
  } catch (e) {
    console.error('App lock authentication error:', e);
    return false;
  }
}

/**
 * Check if app lock is enabled in user settings.
 */
export function isAppLockConfigured(): boolean {
  try {
    const s = getSettings();
    return !!s.appLockEnabled;
  } catch {
    return false;
  }
}

/**
 * Update app lock state in settings.
 */
export function setAppLockConfigured(enabled: boolean): void {
  updateSettings({ appLockEnabled: enabled });
}
