const withMapsModule = require('react-native-maps/app.plugin');

const {
  resolveGoogleMapsNativeConfig,
} = require('../config/googleMapsConfig');

const withMaps = withMapsModule.default ?? withMapsModule;

/**
 * Keeps Google Maps credentials inside generated native configuration. The
 * Android placeholder fallback preserves the checked-in bare Gradle setup;
 * Gradle injects its value without exposing the key to the JavaScript bundle.
 */
module.exports = (config) => {
  const { androidApiKey, iosApiKey } = resolveGoogleMapsNativeConfig();

  return withMaps(config, {
    androidGoogleMapsApiKey:
      androidApiKey ?? '${GOOGLE_MAPS_ANDROID_API_KEY}',
    iosGoogleMapsApiKey: iosApiKey ?? undefined,
  });
};
