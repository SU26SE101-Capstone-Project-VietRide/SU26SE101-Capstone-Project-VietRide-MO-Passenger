const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withAppDelegate,
  withInfoPlist,
  withPodfile,
} = require('@expo/config-plugins');
const {
  mergeContents,
  removeContents,
} = require('@expo/config-plugins/build/utils/generateCode');

const {
  resolveGoogleMapsNativeConfig,
} = require('../config/googleMapsConfig');

const PLUGIN_NAME = 'with-vietride-google-maps';
const PLUGIN_VERSION = '1.0.0';
const ANDROID_API_KEY_META_DATA = 'com.google.android.geo.API_KEY';
const IOS_PODFILE_TAG = 'vietride-react-native-google-maps';
const IOS_IMPORT_TAG = 'vietride-google-maps-import';
const IOS_INIT_TAG = 'vietride-google-maps-init';
const IOS_APP_DELEGATE_INIT = /\bsuper\.application\(\w+?, didFinishLaunchingWithOptions: \w+?\)/g;
const GOOGLE_MAPS_API_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;

const assertValidApiKey = (apiKey, platform) => {
  if (apiKey && !GOOGLE_MAPS_API_KEY_PATTERN.test(apiKey)) {
    throw new Error(`[Maps] Invalid ${platform} Google Maps API key format.`);
  }
};

const withGoogleMapsAndroid = (config, apiKey) => withAndroidManifest(
  config,
  (androidConfig) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      androidConfig.modResults,
    );

    if (apiKey) {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(
        mainApplication,
        ANDROID_API_KEY_META_DATA,
        apiKey,
      );
    } else {
      AndroidConfig.Manifest.removeMetaDataItemFromMainApplication(
        mainApplication,
        ANDROID_API_KEY_META_DATA,
      );
    }

    return androidConfig;
  },
);

const withGoogleMapsPod = (config, enabled) => withPodfile(
  config,
  (podfileConfig) => {
    if (!enabled) {
      podfileConfig.modResults.contents = removeContents({
        tag: IOS_PODFILE_TAG,
        src: podfileConfig.modResults.contents,
      }).contents;
      return podfileConfig;
    }

    const result = mergeContents({
      tag: IOS_PODFILE_TAG,
      src: podfileConfig.modResults.contents,
      newSrc: [
        '  rn_maps_path = File.dirname(`node --print "require.resolve(\'react-native-maps/package.json\')"`)',
        "  pod 'react-native-google-maps', :path => rn_maps_path",
      ].join('\n'),
      anchor: /use_native_modules!/,
      offset: 0,
      comment: '#',
    });

    podfileConfig.modResults.contents = result.contents;
    return podfileConfig;
  },
);

const removeGoogleMapsAppDelegateCode = (contents) => {
  const withoutImport = removeContents({
    tag: IOS_IMPORT_TAG,
    src: contents,
  }).contents;

  return removeContents({
    tag: IOS_INIT_TAG,
    src: withoutImport,
  }).contents;
};

const withGoogleMapsAppDelegate = (config, apiKey) => withAppDelegate(
  config,
  (appDelegateConfig) => {
    if (!apiKey) {
      appDelegateConfig.modResults.contents = removeGoogleMapsAppDelegateCode(
        appDelegateConfig.modResults.contents,
      );
      return appDelegateConfig;
    }

    if (appDelegateConfig.modResults.language !== 'swift') {
      throw new Error('[Maps] Google Maps iOS setup requires a Swift AppDelegate.');
    }

    const importResult = mergeContents({
      tag: IOS_IMPORT_TAG,
      src: appDelegateConfig.modResults.contents,
      newSrc: ['#if canImport(GoogleMaps)', 'import GoogleMaps', '#endif'].join('\n'),
      anchor: /(@main|@UIApplicationMain)/,
      offset: 0,
      comment: '//',
    });
    const initResult = mergeContents({
      tag: IOS_INIT_TAG,
      src: importResult.contents,
      newSrc: [
        '#if canImport(GoogleMaps)',
        `GMSServices.provideAPIKey("${apiKey}")`,
        '#endif',
      ].join('\n'),
      anchor: IOS_APP_DELEGATE_INIT,
      offset: 0,
      comment: '//',
    });

    appDelegateConfig.modResults.contents = initResult.contents;
    return appDelegateConfig;
  },
);

const withGoogleMapsIOS = (config, apiKey) => {
  let nextConfig = withInfoPlist(config, (infoPlistConfig) => {
    if (apiKey) {
      infoPlistConfig.modResults.GMSApiKey = apiKey;
    } else {
      delete infoPlistConfig.modResults.GMSApiKey;
    }
    return infoPlistConfig;
  });

  nextConfig = withGoogleMapsPod(nextConfig, Boolean(apiKey));
  return withGoogleMapsAppDelegate(nextConfig, apiKey);
};

const withVietRideGoogleMaps = (config) => {
  const { androidApiKey, iosApiKey } = resolveGoogleMapsNativeConfig();

  assertValidApiKey(androidApiKey, 'Android');
  assertValidApiKey(iosApiKey, 'iOS');

  let nextConfig = withGoogleMapsAndroid(config, androidApiKey);
  nextConfig = withGoogleMapsIOS(nextConfig, iosApiKey);
  return nextConfig;
};

module.exports = createRunOncePlugin(
  withVietRideGoogleMaps,
  PLUGIN_NAME,
  PLUGIN_VERSION,
);
