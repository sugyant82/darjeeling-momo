import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { registerPushToken } from '@darjeeling/shared';
import { supabase } from './supabase';
import { integrations } from './env';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Register an Expo push token for the user — ONLY when an EAS project id is set.
 * In local placeholder mode this is a no-op (we rely on the in-app realtime banner).
 */
export async function registerForPush(userId: string): Promise<void> {
  if (!integrations.push.connected) return;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    await registerPushToken(supabase, userId, {
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
  } catch {
    /* push is best-effort */
  }
}
