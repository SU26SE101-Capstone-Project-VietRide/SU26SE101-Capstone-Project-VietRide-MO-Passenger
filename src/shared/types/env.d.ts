/**
 * Type declarations for Expo environment variables.
 *
 * Expo inlines EXPO_PUBLIC_* variables from .env into process.env at build
 * time.  This declaration enables type-safe access.
 */

declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_BASE_URL?: string;
    EXPO_PUBLIC_WS_URL?: string;
    EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_ENABLED?: 'true' | 'false';
    EXPO_PUBLIC_GOOGLE_MAPS_IOS_ENABLED?: 'true' | 'false';
    EXPO_PUBLIC_APP_ENV?: 'development' | 'staging' | 'production';
    EXPO_PUBLIC_DEMO_MODE?: 'true' | 'false';
  }
}
