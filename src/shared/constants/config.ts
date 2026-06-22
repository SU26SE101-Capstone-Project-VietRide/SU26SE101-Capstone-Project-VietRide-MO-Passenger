/**
 * Type-safe wrapper around optional Metro/Expo environment values.
 * Keep this file free of native-module imports so the app can boot in Expo runtimes.
 */

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

const runtimeEnv = ((globalThis as unknown as { process?: { env?: EnvRecord } }).process?.env ?? {}) as EnvRecord;

const getEnvValue = (...keys: string[]) => {
  for (const key of keys) {
    const value = runtimeEnv[key];

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

export const appConfig: AppConfig = {
  apiBaseUrl: getEnvValue('EXPO_PUBLIC_API_BASE_URL', 'API_BASE_URL') ?? 'https://api.vietride.dev/v1',
  wsUrl: getEnvValue('EXPO_PUBLIC_WS_URL', 'WS_URL') ?? 'wss://ws.vietride.dev',
  googleMapsApiKey: getEnvValue('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY', 'GOOGLE_MAPS_API_KEY') ?? '',
  env,
  isDev: env === 'development',
  isStaging: env === 'staging',
  isProd: env === 'production',
} as const;
