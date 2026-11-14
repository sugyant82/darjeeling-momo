import type { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Expo app config. Reads EXPO_PUBLIC_* env (populated by `pnpm setup:local`).
 * Icons/splash come from ./assets, copied from brand/ by scripts/copy-brand.mjs.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const appName = process.env.EXPO_PUBLIC_APP_NAME || 'Darjeeling Momo';
  const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const appleAuth = process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED === 'true';

  return {
    ...config,
    name: appName,
    slug: 'darjeeling-momo',
    scheme: 'darjeelingmomo',
    version: '0.1.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    icon: './assets/icon.png',
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'nz.co.darjeelingmomo.app',
      usesAppleSignIn: appleAuth,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'nz.co.darjeelingmomo.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#1F2A44',
      },
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-font',
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          backgroundColor: '#1F2A44',
          imageWidth: 200,
        },
      ],
      ...(appleAuth ? ['expo-apple-authentication'] : []),
    ],
    extra: {
      ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
    },
    experiments: {
      typedRoutes: false,
    },
  };
};
