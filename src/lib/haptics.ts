/**
 * Haptics wrapper — centralizes haptic feedback calls
 * and respects the user's haptics-enabled setting.
 */

import * as Haptics from 'expo-haptics';

let _enabled = true;

/** Set whether haptics are globally enabled. */
export function setHapticsEnabled(enabled: boolean): void {
  _enabled = enabled;
}

/** Light impact — for tapping chips, toggling switches. */
export function lightImpact(): void {
  if (_enabled) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

/** Medium impact — for completing a set, selecting a palette. */
export function mediumImpact(): void {
  if (_enabled) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}

/** Heavy impact — for PR celebrations, destructive actions. */
export function heavyImpact(): void {
  if (_enabled) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
}

/** Success notification — for completing a workout. */
export function notificationSuccess(): void {
  if (_enabled) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

/** Warning notification — for rest timer finishing. */
export function notificationWarning(): void {
  if (_enabled) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
}

/** Selection feedback — for scrolling through pickers. */
export function selectionFeedback(): void {
  if (_enabled) {
    Haptics.selectionAsync();
  }
}
