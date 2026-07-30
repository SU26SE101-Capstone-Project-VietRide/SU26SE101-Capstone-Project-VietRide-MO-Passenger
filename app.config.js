const { resolveGoogleMapsNativeConfig } = require('./config/googleMapsConfig');

const baseConfig = {
  name: 'VietRide',
  slug: 'viet-ride-passenger',
  version: '0.0.1',
  scheme: 'vietride',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './src/assets/images/app_logo_placeholder.png',
    resizeMode: 'contain',
    backgroundColor: '#EFF7F8',
  },
  plugins: [
    [
      'expo-image-picker',
      {
        photosPermission:
          'VietRide cần quyền mở thư viện ảnh để chọn ảnh đại diện hoặc xem trước ảnh kiện hàng.',
        cameraPermission:
          'VietRide cần quyền dùng camera để chụp ảnh kiện hàng.',
        microphonePermission: false,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'VietRide dùng vị trí của bạn để hiển thị trạm gửi hàng gần đây và, khi bạn chọn, đặt điểm đón Trung chuyển tùy chọn.',
      },
    ],
    [
      'expo-secure-store',
      {
        configureAndroidBackup: false,
      },
    ],
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.vietride.passenger',
  },
  android: {
    package: 'com.vietride.passenger',
    icon: './src/assets/images/app_icon.png',
    adaptiveIcon: {
      foregroundImage: './src/assets/images/app_icon_adaptive_foreground.png',
      backgroundColor: '#EFF7F8',
    },
    allowBackup: false,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: false,
        data: [
          {
            scheme: 'vietride',
            host: 'payments',
            path: '/return',
          },
        ],
        category: ['DEFAULT', 'BROWSABLE'],
      },
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: 'app.vietride.online',
            path: '/payments/return',
          },
        ],
        category: ['DEFAULT', 'BROWSABLE'],
      },
    ],
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
  },
};

const { androidApiKey, iosApiKey } = resolveGoogleMapsNativeConfig();
const buildPlatform = process.env.EAS_BUILD_PLATFORM;
const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID?.trim();
const googleSignInPlugins = googleIosUrlScheme
  ? [['react-native-nitro-google-signin', { iosUrlScheme: googleIosUrlScheme }]]
  : [];
const isProduction =
  process.env.EXPO_PUBLIC_APP_ENV === 'production' ||
  process.env.EAS_BUILD_PROFILE === 'production';
const isGoogleMapsProductionEligible =
  process.env.GOOGLE_MAPS_PRODUCTION_ELIGIBLE === 'true';
const googleMapsEnabledForBuild =
  !isProduction || isGoogleMapsProductionEligible;

if (
  isProduction &&
  !isGoogleMapsProductionEligible &&
  (androidApiKey || iosApiKey)
) {
  throw new Error(
    '[Maps] Production Maps keys require GOOGLE_MAPS_PRODUCTION_ELIGIBLE=true after legal and regional review.',
  );
}

if (
  isProduction &&
  isGoogleMapsProductionEligible &&
  buildPlatform === 'android' &&
  !androidApiKey
) {
  throw new Error(
    '[Maps] GOOGLE_MAPS_ANDROID_API_KEY is required for an eligible production Android build.',
  );
}

if (
  isProduction &&
  isGoogleMapsProductionEligible &&
  buildPlatform === 'ios' &&
  !iosApiKey
) {
  throw new Error(
    '[Maps] GOOGLE_MAPS_IOS_API_KEY is required for an eligible production iOS build.',
  );
}

// These flags contain no credential. Expo inlines them so the UI can fail
// closed instead of mounting a native map with a missing/placeholder key.
process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_ENABLED = String(
  googleMapsEnabledForBuild && Boolean(androidApiKey),
);
process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_ENABLED = String(
  googleMapsEnabledForBuild && Boolean(iosApiKey),
);

module.exports = {
  ...baseConfig,
  plugins: [
    ...baseConfig.plugins,
    [
      './config-plugins/withVietRideGoogleMaps',
      { enabled: googleMapsEnabledForBuild },
    ],
    ...googleSignInPlugins,
  ],
};

const isStaging =
  process.env.EXPO_PUBLIC_APP_ENV === 'staging' ||
  process.env.EAS_BUILD_PROFILE === 'preview';

// Validator for Google Login & Firebase Config
if (isProduction || isStaging) {
  const requiredPublicConfig = [
    'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
    'EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID',
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_WEB_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID',
  ];
  const missing = requiredPublicConfig.filter((name) => !process.env[name]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `[Auth/Firebase] Missing ${process.env.EXPO_PUBLIC_APP_ENV || 'release'} config: ${missing.join(', ')}.`,
    );
  }
}
