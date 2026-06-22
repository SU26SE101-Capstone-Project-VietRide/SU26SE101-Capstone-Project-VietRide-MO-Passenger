/**
 * Type-safe wrapper around native and Metro/Expo environment values.
 */

import Config from 'react-native-config';
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

type EnvRecord = Record<string, string | undefined>;

const nativeEnv = Config as EnvRecord;
const runtimeEnv = ((globalThis as unknown as { process?: { env?: EnvRecord } }).process?.env ?? {}) as EnvRecord;

const getEnvValue = (...keys: string[]) => {
  for (const key of keys) {
    const value = nativeEnv[key] ?? runtimeEnv[key];

    if (value && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
};

const normalizeEnv = (value?: string): Environment => {
  if (value === 'staging' || value === 'production') {
    return value;
  }

  return 'development';
};

const env = normalizeEnv(getEnvValue('EXPO_PUBLIC_APP_ENV', 'APP_ENV', 'ENV'));

const requireEnvValue = (name: string, ...keys: string[]): string => {
  const value = getEnvValue(...keys);

  if (!value) {
    throw new Error(`[Config] Missing ${name}. Set one of: ${keys.join(', ')}`);
  }

  return value;
};

export const appConfig: AppConfig = {
  apiBaseUrl: normalizeUrlBase(requireEnvValue('API_BASE_URL', 'EXPO_PUBLIC_API_BASE_URL', 'API_BASE_URL')),
  wsUrl: normalizeUrlBase(requireEnvValue('WS_URL', 'EXPO_PUBLIC_WS_URL', 'WS_URL')),
  googleMapsApiKey: getEnvValue('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY', 'GOOGLE_MAPS_API_KEY') ?? '',
  env,
  isDev: env === 'development',
  isStaging: env === 'staging',
  isProd: env === 'production',
} as const;
