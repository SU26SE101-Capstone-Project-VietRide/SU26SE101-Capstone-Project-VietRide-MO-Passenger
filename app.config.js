const appJson = require('./app.json');
const {
  resolveGoogleMapsNativeConfig,
} = require('./config/googleMapsConfig');

const { androidApiKey, iosApiKey } = resolveGoogleMapsNativeConfig();
const buildPlatform = process.env.EAS_BUILD_PLATFORM;
const isProduction = process.env.EXPO_PUBLIC_APP_ENV === 'production'
  || process.env.EAS_BUILD_PROFILE === 'production';

if (isProduction && buildPlatform === 'android' && !androidApiKey) {
  throw new Error(
    '[Maps] GOOGLE_MAPS_ANDROID_API_KEY is required for production Android builds.',
  );
}

if (isProduction && buildPlatform === 'ios' && !iosApiKey) {
  throw new Error(
    '[Maps] GOOGLE_MAPS_IOS_API_KEY is required for production iOS builds.',
  );
}

// These flags contain no credential. Expo inlines them so the UI can fail
// closed instead of mounting a native map with a missing/placeholder key.
process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_ENABLED = String(Boolean(androidApiKey));
process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_ENABLED = String(Boolean(iosApiKey));

module.exports = {
  ...appJson.expo,
  plugins: [
    ...(appJson.expo.plugins ?? []),
    './config-plugins/withVietRideGoogleMaps',
  ],
};
