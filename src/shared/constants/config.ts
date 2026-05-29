/**
 * Type-safe wrapper around react-native-config environment variables.
 * Ensures all env vars are accessed through typed properties.
 */

import Config from 'react-native-config';

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

const env = (Config.ENV ?? 'development') as Environment;

export const appConfig: AppConfig = {
  apiBaseUrl: Config.API_BASE_URL ?? 'https://api.vietride.dev/v1',
  wsUrl: Config.WS_URL ?? 'wss://ws.vietride.dev',
  googleMapsApiKey: Config.GOOGLE_MAPS_API_KEY ?? '',
  env,
  isDev: env === 'development',
  isStaging: env === 'staging',
  isProd: env === 'production',
} as const;
