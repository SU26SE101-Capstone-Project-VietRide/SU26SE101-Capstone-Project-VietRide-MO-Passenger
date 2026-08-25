const fs = require('fs');
const path = require('path');
const {
  isProductionBuild,
  resolveGoongPlacesRuntimeConfig,
} = require('./config/goongConfig');
const { resolveMapboxRuntimeConfig } = require('./config/mapboxConfig');
const { version: appVersion } = require('./package.json');

const baseConfig = {
  name: 'VietRide',
  slug: 'viet-ride-passenger',
  owner: 'vitoomac116s-team',
  version: appVersion,
  scheme: 'vietride',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './src/assets/images/app_logo_placeholder.png',
  notification: {
    icon: './src/assets/images/app_logo_placeholder.png',
    color: '#007D78',
  },
  splash: {
    image: './src/assets/images/app_icon_adaptive_foreground.png',
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
    icon: './src/assets/images/app_logo_placeholder.png',
  },
  android: {
    package: 'com.vietride.passenger',
    softwareKeyboardLayoutMode: 'resize',
    icon: './src/assets/images/app_logo_placeholder.png',
    adaptiveIcon: {
      foregroundImage: './src/assets/images/app_logo_placeholder.png',
      backgroundColor: '#EFF7F8',
    },
    allowBackup: false,
    permissions: ['android.permission.POST_NOTIFICATIONS'],
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
  },
};

const { enabled: mapboxEnabledForBuild } = resolveMapboxRuntimeConfig();
const buildPlatform = process.env.EAS_BUILD_PLATFORM;
const configuredAndroidFirebaseFile = process.env.GOOGLE_SERVICES_ANDROID_FILE?.trim();
const configuredIosFirebaseFile = process.env.GOOGLE_SERVICE_INFO_PLIST?.trim();
const fileExists = (filePath) => Boolean(
  filePath && fs.existsSync(path.resolve(__dirname, filePath)),
);
const hasManagedAndroidFirebaseConfig = fileExists(configuredAndroidFirebaseFile);
const hasManagedIosFirebaseConfig = fileExists(configuredIosFirebaseFile);
const hasNativeAndroidFirebaseConfig = fs.existsSync(
  path.resolve(__dirname, 'android/app/google-services.json'),
);
const hasAndroidFirebaseConfig =
  hasManagedAndroidFirebaseConfig || hasNativeAndroidFirebaseConfig;
const hasIosFirebaseConfig = hasManagedIosFirebaseConfig;
const androidFirebaseConfigPath = hasManagedAndroidFirebaseConfig
  ? path.resolve(__dirname, configuredAndroidFirebaseFile)
  : path.resolve(__dirname, 'android/app/google-services.json');
const validateAndroidFirebaseConfig = (filePath) => {
  let config;
  try {
    config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    throw new Error('[Push] Android Firebase client config must be valid JSON.');
  }

  const clients = Array.isArray(config.client) ? config.client : [];
  const matchingClient = clients.find(
    (client) => client?.client_info?.android_client_info?.package_name
      === baseConfig.android.package,
  );
  if (!matchingClient?.client_info?.mobilesdk_app_id) {
    throw new Error(
      `[Push] Firebase Android config must contain package ${baseConfig.android.package}.`,
    );
  }

  const projectId = config?.project_info?.project_id;
  const expectedProjectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId || (expectedProjectId && projectId !== expectedProjectId)) {
    throw new Error(
      '[Push] Firebase Android project_id does not match EXPO_PUBLIC_FIREBASE_PROJECT_ID.',
    );
  }
};
if (hasAndroidFirebaseConfig) {
  validateAndroidFirebaseConfig(androidFirebaseConfigPath);
}
const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID?.trim();
const googleSignInPlugins = googleIosUrlScheme
  ? [['react-native-nitro-google-signin', { iosUrlScheme: googleIosUrlScheme }]]
  : [];
const isProduction = isProductionBuild(process.env);
const { enabled: goongPlacesEnabledForBuild } = resolveGoongPlacesRuntimeConfig(
  process.env,
  { productionRequired: isProduction },
);
const firebaseNativePlugins =
  hasManagedAndroidFirebaseConfig || hasManagedIosFirebaseConfig
    ? ['@react-native-firebase/app', '@react-native-firebase/messaging']
    : [];

// Capability flags contain no credential. Keep them in Expo's embedded config
// so release bundles see the same capabilities that app.config.js validated.
// Mutating process.env here is insufficient because Metro only inlines public
// variables that existed in its own bundling environment.
const serviceCapabilities = {
  goongPlaces: goongPlacesEnabledForBuild,
};
const nativeCapabilities = {
  mapbox: {
    android: mapboxEnabledForBuild,
    ios: mapboxEnabledForBuild,
  },
  pushNotifications: {
    android: hasAndroidFirebaseConfig,
    ios: hasIosFirebaseConfig,
  },
};

if (isProduction && buildPlatform === 'android' && !hasAndroidFirebaseConfig) {
  throw new Error(
    '[Push] GOOGLE_SERVICES_ANDROID_FILE is required for a production Android build.',
  );
}

if (isProduction && buildPlatform === 'ios' && !hasIosFirebaseConfig) {
  throw new Error(
    '[Push] GOOGLE_SERVICE_INFO_PLIST is required for a production iOS build.',
  );
}

if (isProduction && !mapboxEnabledForBuild) {
  throw new Error(
    '[Mapbox] EXPO_PUBLIC_MAPBOX_TOKEN (pk.*) is required for production tracking maps.',
  );
}

module.exports = {
  ...baseConfig,
  extra: {
    eas: {
      projectId: 'dd7171b6-f140-4564-ba91-0ee0567d00a1',
    },
    serviceCapabilities,
    nativeCapabilities,
  },
  ios: {
    ...baseConfig.ios,
    ...(configuredIosFirebaseFile
      ? { googleServicesFile: configuredIosFirebaseFile }
      : {}),
    entitlements: {
      'aps-environment': isProduction ? 'production' : 'development',
    },
  },
  android: {
    ...baseConfig.android,
    ...(configuredAndroidFirebaseFile
      ? { googleServicesFile: configuredAndroidFirebaseFile }
      : {}),
  },
  plugins: [
    ...baseConfig.plugins,
    '@rnmapbox/maps',
    ...googleSignInPlugins,
    ...firebaseNativePlugins,
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
