const { resolveGoogleMapsNativeConfig } = require('./googleMapsConfig');

describe('resolveGoogleMapsNativeConfig', () => {
  it.each(['', 'YOUR_KEY_HERE', 'TEST_KEY_FOR_LOCAL_BUILD', 'placeholder-key'])(
    'rejects placeholder key %p',
    (placeholder) => {
      expect(resolveGoogleMapsNativeConfig({
        GOOGLE_MAPS_ANDROID_API_KEY: placeholder,
        GOOGLE_MAPS_IOS_API_KEY: placeholder,
      })).toEqual({ androidApiKey: null, iosApiKey: null });
    },
  );

  it('keeps valid native keys out of public environment variable names', () => {
    expect(resolveGoogleMapsNativeConfig({
      GOOGLE_MAPS_ANDROID_API_KEY: 'android-native-key',
      GOOGLE_MAPS_IOS_API_KEY: 'ios-native-key',
    })).toEqual({
      androidApiKey: 'android-native-key',
      iosApiKey: 'ios-native-key',
    });
  });

  it('removes native keys when the build is not eligible to use Google Maps', () => {
    expect(resolveGoogleMapsNativeConfig({
      GOOGLE_MAPS_ANDROID_API_KEY: 'android-native-key',
      GOOGLE_MAPS_IOS_API_KEY: 'ios-native-key',
    }, false)).toEqual({ androidApiKey: null, iosApiKey: null });
  });
});
