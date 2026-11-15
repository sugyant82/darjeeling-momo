import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** Haptic feedback, best-effort: silently does nothing on web or unsupported devices. */
const enabled = Platform.OS === 'ios' || Platform.OS === 'android';
const run = (fn: () => Promise<void>) => {
  if (enabled) fn().catch(() => {});
};

export const haptics = {
  /** Picking something: tabs, chips, options. */
  select: () => run(() => Haptics.selectionAsync()),
  /** A light tap: buttons, steppers. */
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
