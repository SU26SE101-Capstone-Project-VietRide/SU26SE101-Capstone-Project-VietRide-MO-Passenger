/**
 * Type declarations for Expo environment variables.
 *
 * Expo inlines EXPO_PUBLIC_* variables from .env into process.env at build
 * time.  This declaration enables type-safe access.
 */

declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_BASE_URL?: string;
    EXPO_PUBLIC_GOONG_API_KEY?: string;
    EXPO_PUBLIC_GOONG_PLACES_ENABLED?: 'true' | 'false';
    EXPO_PUBLIC_NATIVE_PUSH_ANDROID_ENABLED?: 'true' | 'false';
    EXPO_PUBLIC_NATIVE_PUSH_IOS_ENABLED?: 'true' | 'false';
    EXPO_PUBLIC_APP_ENV?: 'development' | 'staging' | 'production';
    EXPO_PUBLIC_DEMO_MODE?: 'true' | 'false';
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?: string;
    EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID?: string;
    EXPO_PUBLIC_FIREBASE_API_KEY?: string;
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
    EXPO_PUBLIC_FIREBASE_PROJECT_ID?: string;
    EXPO_PUBLIC_FIREBASE_WEB_STORAGE_BUCKET?: string;
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?: string;
    EXPO_PUBLIC_FIREBASE_APP_ID?: string;
  }
}
