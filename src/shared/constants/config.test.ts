const ORIGINAL_ENV = process.env;

const loadConfig = (nativeCapabilities?: unknown) => {
  jest.resetModules();
  jest.doMock('expo-constants', () => ({
    __esModule: true,
    default: {
      expoConfig: {
        extra: nativeCapabilities === undefined
          ? {}
          : { nativeCapabilities },
      },
    },
  }));

  return require('./config').appConfig as typeof import('./config').appConfig;
};

describe('appConfig native capabilities', () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      EXPO_PUBLIC_API_BASE_URL: 'https://api.vietride.online/v1',
      EXPO_PUBLIC_APP_ENV: 'staging',
      EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_ENABLED: 'false',
      EXPO_PUBLIC_GOOGLE_MAPS_IOS_ENABLED: 'false',
      EXPO_PUBLIC_NATIVE_PUSH_ANDROID_ENABLED: 'false',
      EXPO_PUBLIC_NATIVE_PUSH_IOS_ENABLED: 'false',
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('uses embedded Expo capabilities in release bundles', () => {
    const config = loadConfig({
      googleMaps: { android: true, ios: false },
      pushNotifications: { android: true, ios: false },
    });

    expect(config.nativeGoogleMapsEnabled).toEqual({ android: true, ios: false });
    expect(config.nativePushNotificationsEnabled).toEqual({ android: true, ios: false });
  });

  it('falls back to legacy public flags when embedded capabilities are absent', () => {
    process.env.EXPO_PUBLIC_NATIVE_PUSH_ANDROID_ENABLED = 'true';
    const config = loadConfig();

    expect(config.nativePushNotificationsEnabled.android).toBe(true);
    expect(config.nativePushNotificationsEnabled.ios).toBe(false);
  });
});
