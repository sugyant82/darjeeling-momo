/**
 * App-wide configuration. The working business name lives here (and is fed by
 * NEXT_PUBLIC_APP_NAME / EXPO_PUBLIC_APP_NAME) so it can be renamed in one place.
 */

export const DEFAULT_APP_NAME = 'Darjeeling Momo';

export const brand = {
  tagline: 'Himalayan street dumplings · South Auckland',
  heroHeadline: 'Steamed fresh, the Darjeeling way',
} as const;

/** GST rate for New Zealand (15%, inclusive). */
export const GST_RATE = 0.15;

/** All hours, slots and dates use this zone. */
export const TIME_ZONE = 'Pacific/Auckland';

export const CURRENCY = 'nzd';
export const CURRENCY_DISPLAY = 'NZD';

/**
 * Store links for "Get the app". Placeholders (#) until the apps are live —
 * swap for real App Store / Google Play URLs (see INTEGRATIONS.md §8).
 */
export const storeLinks = {
  ios: '#', // PLACEHOLDER — App Store URL
  android: '#', // PLACEHOLDER — Google Play URL
  get appsLive(): boolean {
    return this.ios !== '#' && this.android !== '#';
  },
} as const;

export function appName(env?: Record<string, string | undefined>): string {
  return (
    env?.NEXT_PUBLIC_APP_NAME ||
    env?.EXPO_PUBLIC_APP_NAME ||
    DEFAULT_APP_NAME
  );
}
