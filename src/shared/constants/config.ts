/**
 * Type-safe wrapper around Expo's built-in environment variables.
 *
 * Expo inlines EXPO_PUBLIC_* env vars from .env at build time via
 * process.env.EXPO_PUBLIC_XXX.  No native modules needed.
 */

import { normalizeUrlBase } from '@shared/utils/url';

type Environment = 'development' | 'staging' | 'production';

interface AppConfig {
  readonly apiBaseUrl: string;
  readonly wsUrl: string;
  readonly googleMapsApiKey: string;
  readonly env: Environment;
  readonly isDev: boolean;
  readonly isStaging: boolean;
  readonly isProd: boolean;
}

const normalizeEnv = (value?: string): Environment => {
  if (value === 'staging' || value === 'production') {
    return value;
  }

  return 'development';
};

const env = normalizeEnv(process.env.EXPO_PUBLIC_APP_ENV);

const requireEnvValue = (name: string): string => {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`[Config] Missing environment variable: ${name}`);
  }

  return value;
};

export const appConfig: AppConfig = {
  apiBaseUrl: normalizeUrlBase(requireEnvValue('EXPO_PUBLIC_API_BASE_URL')),
  wsUrl: normalizeUrlBase(requireEnvValue('EXPO_PUBLIC_WS_URL')),
  googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  env,
  isDev: env === 'development',
  isStaging: env === 'staging',
  isProd: env === 'production',
} as const;
