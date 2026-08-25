const ORIGINAL_ENV = process.env;

const loadConfig = (extra: Record<string, unknown> = {}) => {
  jest.resetModules();
  jest.doMock(
    'expo-constants',
    () => ({
      __esModule: true,
      default: {
        expoConfig: {
          extra,
        },
      },
    }),
  );

  return require('./config').appConfig as typeof import('./config').appConfig;
};

describe('appConfig embedded capabilities', () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      EXPO_PUBLIC_API_BASE_URL: 'https://api.vietride.online/v1',
      EXPO_PUBLIC_APP_ENV: 'staging',
      EXPO_PUBLIC_GOONG_PLACES_ENABLED: 'false',
      EXPO_PUBLIC_MAPBOX_ENABLED: 'false',
      EXPO_PUBLIC_NATIVE_PUSH_ANDROID_ENABLED: 'false',
      EXPO_PUBLIC_NATIVE_PUSH_IOS_ENABLED: 'false',
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('uses embedded Expo capabilities in release bundles', () => {
    const config = loadConfig({
      serviceCapabilities: { goongPlaces: true },
      nativeCapabilities: {
        mapbox: { android: true, ios: true },
        pushNotifications: { android: true, ios: false },
      },
    });

    expect(config.goongPlacesEnabled).toBe(true);
    expect(config.nativeMapboxEnabled).toEqual({ android: true, ios: true });
    expect(config.nativePushNotificationsEnabled).toEqual({
      android: true,
      ios: false,
    });
  });

  it('falls back to legacy native flags when embedded capabilities are absent', () => {
    process.env.EXPO_PUBLIC_NATIVE_PUSH_ANDROID_ENABLED = 'true';
    process.env.EXPO_PUBLIC_MAPBOX_ENABLED = 'true';
    const config = loadConfig();

    expect(config.goongPlacesEnabled).toBe(false);
    expect(config.nativePushNotificationsEnabled.android).toBe(true);
    expect(config.nativePushNotificationsEnabled.ios).toBe(false);
    expect(config.nativeMapboxEnabled).toEqual({ android: true, ios: true });
  });

  it('does not let a Metro flag bypass the embedded service capability', () => {
    process.env.EXPO_PUBLIC_GOONG_PLACES_ENABLED = 'true';

    const config = loadConfig({
      serviceCapabilities: { goongPlaces: false },
    });

    expect(config.goongPlacesEnabled).toBe(false);
  });
});
