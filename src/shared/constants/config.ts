/**
 * Type-safe wrapper around Expo's built-in environment variables.
 *
 * Expo inlines EXPO_PUBLIC_* env vars from .env at build time via
 * process.env.EXPO_PUBLIC_XXX.  No native modules needed.
 */

import { normalizeUrlBase } from '@shared/utils/url';

export type Environment = 'development' | 'staging' | 'production';

interface AppConfig {
  readonly apiBaseUrl: string;
  readonly wsUrl: string;
  readonly googleMapsApiKey: string;
  readonly env: Environment;
  readonly isDev: boolean;
  readonly isStaging: boolean;
  readonly isProd: boolean;
}

const normalizeEnv = (
  value: string | undefined,
  isDevelopmentBuild: boolean,
): Environment => {
  if (value === 'staging' || value === 'production') {
    return value;
  }

  if (value === 'development') {
    return value;
  }

  // A missing value is convenient in a development bundle, while malformed
  // values and release builds fail closed to production semantics.
  return value == null || value.trim() === ''
    ? (isDevelopmentBuild ? 'development' : 'production')
    : 'production';
};

const env = normalizeEnv(process.env.EXPO_PUBLIC_APP_ENV, __DEV__);

const requireEnvValue = (name: string, value: string | undefined): string => {
  if (!value || value.trim().length === 0) {
    throw new Error(`[Config] Missing environment variable: ${name}`);
  }

  return value;
};

const requireServiceUrl = (
  name: string,
  value: string | undefined,
  allowedProtocols: readonly string[],
): string => {
  const normalized = normalizeUrlBase(requireEnvValue(name, value));

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`[Config] Invalid URL in environment variable: ${name}`);
  }

  if (!allowedProtocols.includes(parsed.protocol)) {
    throw new Error(`[Config] Insecure or unsupported protocol in: ${name}`);
  }

  return normalized;
};

// Expo replaces public variables only when accessed through static dot notation.
const apiBaseUrlValue = process.env.EXPO_PUBLIC_API_BASE_URL;
const wsUrlValue = process.env.EXPO_PUBLIC_WS_URL;
const secureTransportRequired = env !== 'development';
const googleMapsApiKeyValue = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';

const resolveGoogleMapsApiKey = (): string => {
  const isPlaceholder = googleMapsApiKeyValue.toUpperCase().includes('YOUR_KEY');
  if (env === 'production' && (!googleMapsApiKeyValue || isPlaceholder)) {
    throw new Error(
      '[Config] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is required in production.',
    );
  }

  return isPlaceholder ? '' : googleMapsApiKeyValue;
};

export const appConfig: AppConfig = {
  apiBaseUrl: requireServiceUrl(
    'EXPO_PUBLIC_API_BASE_URL',
    apiBaseUrlValue,
    secureTransportRequired ? ['https:'] : ['http:', 'https:'],
  ),
  wsUrl: requireServiceUrl(
    'EXPO_PUBLIC_WS_URL',
    wsUrlValue,
    secureTransportRequired ? ['wss:'] : ['ws:', 'wss:'],
  ),
  googleMapsApiKey: resolveGoogleMapsApiKey(),
  env,
  isDev: env === 'development',
  isStaging: env === 'staging',
  isProd: env === 'production',
} as const;
