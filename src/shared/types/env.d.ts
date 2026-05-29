/**
 * Type declarations for react-native-config environment variables.
 * Ensures type safety when accessing Config.XXX.
 */

declare module 'react-native-config' {
  export interface NativeConfig {
    API_BASE_URL?: string;
    WS_URL?: string;
    GOOGLE_MAPS_API_KEY?: string;
    ENV?: string;
  }

  export const Config: NativeConfig;
  export default Config;
}
