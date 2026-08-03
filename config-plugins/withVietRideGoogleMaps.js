const {
  AndroidConfig,
  createRunOncePlugin,
  withAppBuildGradle,
  withAndroidManifest,
  withAppDelegate,
  withInfoPlist,
  withMainApplication,
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
const ANDROID_API_KEY_PLACEHOLDER = '${GOOGLE_MAPS_ANDROID_API_KEY}';
const IOS_PODFILE_TAG = 'vietride-react-native-google-maps';
const IOS_IMPORT_TAG = 'vietride-google-maps-import';
const IOS_INIT_TAG = 'vietride-google-maps-init';
const ANDROID_DEPENDENCY_TAG = 'vietride-google-maps-sdk';
const ANDROID_API_KEY_ENV_TAG = 'vietride-google-maps-api-key-env';
const ANDROID_API_KEY_PLACEHOLDER_TAG = 'vietride-google-maps-api-key-placeholder';
const ANDROID_IMPORT_TAG = 'vietride-google-maps-import';
const ANDROID_INIT_TAG = 'vietride-google-maps-init';
const IOS_APP_DELEGATE_INIT = /\bsuper\.application\(\w+?, didFinishLaunchingWithOptions: \w+?\)/g;
const GOOGLE_MAPS_API_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;
const GOOGLE_MAPS_ANDROID_SDK_VERSION = '19.2.0';
const GOOGLE_MAPS_USAGE_ATTRIBUTION_ID = 'gmp_git_agentskills_v1';
const GOOGLE_MAPS_IOS_URL_SCHEMES = ['googlechromes', 'comgooglemaps'];
const LEGACY_ANDROID_MANIFEST_PLACEHOLDER = /^\s*manifestPlaceholders = \[GOOGLE_MAPS_ANDROID_API_KEY: googleMapsApiKey \?: ''\]\r?\n/m;
const LEGACY_ANDROID_API_KEY_SETUP_START = '\ndef localProperties = new Properties()';
const LEGACY_ANDROID_API_KEY_SETUP_END = ')?.trim()';

const removeLegacyAndroidApiKeySetup = (contents) => {
  const startIndex = contents.indexOf(LEGACY_ANDROID_API_KEY_SETUP_START);
  const endIndex = contents.indexOf(
    LEGACY_ANDROID_API_KEY_SETUP_END,
    startIndex + LEGACY_ANDROID_API_KEY_SETUP_START.length,
  );
  const candidate = startIndex >= 0 && endIndex >= 0
    ? contents.slice(startIndex, endIndex)
    : '';
  const withoutLegacySetup = candidate.includes('def googleMapsApiKey = (')
    ? contents.slice(0, startIndex) + contents.slice(
      endIndex + LEGACY_ANDROID_API_KEY_SETUP_END.length,
    )
    : contents;

  return withoutLegacySetup.replace(LEGACY_ANDROID_MANIFEST_PLACEHOLDER, '');
};

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
        ANDROID_API_KEY_PLACEHOLDER,
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

const withGoogleMapsAndroidDependency = (config, enabled) => withAppBuildGradle(
  config,
  (buildGradleConfig) => {
    // One-time migration for native projects generated before this plugin
    // became the single owner of Maps key injection.
    const migratedContents = removeLegacyAndroidApiKeySetup(
      buildGradleConfig.modResults.contents,
    );
    let contents = removeContents({
      tag: ANDROID_DEPENDENCY_TAG,
      src: migratedContents,
    }).contents;
    contents = removeContents({
      tag: ANDROID_API_KEY_ENV_TAG,
      src: contents,
    }).contents;
    contents = removeContents({
      tag: ANDROID_API_KEY_PLACEHOLDER_TAG,
      src: contents,
    }).contents;

    if (!enabled) {
      buildGradleConfig.modResults.contents = contents;
      return buildGradleConfig;
    }

    const apiKeyEnvironmentResult = mergeContents({
      tag: ANDROID_API_KEY_ENV_TAG,
      src: contents,
      newSrc: [
        'def googleMapsAndroidApiKey = (System.getenv("GOOGLE_MAPS_ANDROID_API_KEY") ?: findProperty("GOOGLE_MAPS_ANDROID_API_KEY"))?.toString()?.trim()',
        'if (!googleMapsAndroidApiKey) {',
        '    throw new GradleException("GOOGLE_MAPS_ANDROID_API_KEY is required for this Maps-enabled build.")',
        '}',
      ].join('\n'),
      anchor: /android\s*\{/,
      offset: 0,
      comment: '//',
    });
    const apiKeyPlaceholderResult = mergeContents({
      tag: ANDROID_API_KEY_PLACEHOLDER_TAG,
      src: apiKeyEnvironmentResult.contents,
      newSrc: '        manifestPlaceholders["GOOGLE_MAPS_ANDROID_API_KEY"] = googleMapsAndroidApiKey',
      anchor: /defaultConfig\s*\{/,
      offset: 1,
      comment: '//',
    });
    const dependencyResult = mergeContents({
      tag: ANDROID_DEPENDENCY_TAG,
      src: apiKeyPlaceholderResult.contents,
      newSrc: `    implementation "com.google.android.gms:play-services-maps:${GOOGLE_MAPS_ANDROID_SDK_VERSION}"`,
      anchor: /dependencies\s*\{/,
      offset: 1,
      comment: '//',
    });

    buildGradleConfig.modResults.contents = dependencyResult.contents;
    return buildGradleConfig;
  },
);

const removeGoogleMapsMainApplicationCode = (contents) => {
  const withoutImport = removeContents({
    tag: ANDROID_IMPORT_TAG,
    src: contents,
  }).contents;

  return removeContents({
    tag: ANDROID_INIT_TAG,
    src: withoutImport,
  }).contents;
};

const withGoogleMapsMainApplication = (config, enabled) => withMainApplication(
  config,
  (mainApplicationConfig) => {
    const contents = removeGoogleMapsMainApplicationCode(
      mainApplicationConfig.modResults.contents,
    );

    if (!enabled) {
      mainApplicationConfig.modResults.contents = contents;
      return mainApplicationConfig;
    }

    if (mainApplicationConfig.modResults.language !== 'kt') {
      throw new Error('[Maps] Google Maps Android setup requires a Kotlin MainApplication.');
    }

    const importResult = mergeContents({
      tag: ANDROID_IMPORT_TAG,
      src: contents,
      newSrc: [
        'import com.google.android.gms.maps.MapsApiSettings',
        'import com.google.android.gms.maps.MapsInitializer',
      ].join('\n'),
      anchor: /import com\.facebook\.react/,
      offset: 0,
      comment: '//',
    });
    const initResult = mergeContents({
      tag: ANDROID_INIT_TAG,
      src: importResult.contents,
      newSrc: [
        `    MapsApiSettings.addInternalUsageAttributionId(applicationContext, "${GOOGLE_MAPS_USAGE_ATTRIBUTION_ID}")`,
        '    MapsInitializer.initialize(applicationContext, MapsInitializer.Renderer.LATEST, null)',
      ].join('\n'),
      anchor: /super\.onCreate\(\)/,
      offset: 1,
      comment: '//',
    });

    mainApplicationConfig.modResults.contents = initResult.contents;
    return mainApplicationConfig;
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
        `GMSServices.addInternalUsageAttributionID("${GOOGLE_MAPS_USAGE_ATTRIBUTION_ID}")`,
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
    // AppDelegate owns SDK initialization. Keeping a second copy in Info.plist
    // adds no value and can leave stale credentials after key rotation.
    delete infoPlistConfig.modResults.GMSApiKey;

    if (apiKey) {
      const existingSchemes = infoPlistConfig.modResults.LSApplicationQueriesSchemes ?? [];
      infoPlistConfig.modResults.LSApplicationQueriesSchemes = [
        ...new Set([...existingSchemes, ...GOOGLE_MAPS_IOS_URL_SCHEMES]),
      ];
    } else if (Array.isArray(infoPlistConfig.modResults.LSApplicationQueriesSchemes)) {
      const remainingSchemes = infoPlistConfig
        .modResults
        .LSApplicationQueriesSchemes
        .filter((scheme) => !GOOGLE_MAPS_IOS_URL_SCHEMES.includes(scheme));

      if (remainingSchemes.length > 0) {
        infoPlistConfig.modResults.LSApplicationQueriesSchemes = remainingSchemes;
      } else {
        delete infoPlistConfig.modResults.LSApplicationQueriesSchemes;
      }
    }
    return infoPlistConfig;
  });

  nextConfig = withGoogleMapsPod(nextConfig, Boolean(apiKey));
  return withGoogleMapsAppDelegate(nextConfig, apiKey);
};

const withVietRideGoogleMaps = (config, options = {}) => {
  const { androidApiKey, iosApiKey } = resolveGoogleMapsNativeConfig(
    process.env,
    options.enabled !== false,
  );

  assertValidApiKey(androidApiKey, 'Android');
  assertValidApiKey(iosApiKey, 'iOS');

  let nextConfig = withGoogleMapsAndroid(config, androidApiKey);
  nextConfig = withGoogleMapsAndroidDependency(nextConfig, Boolean(androidApiKey));
  nextConfig = withGoogleMapsMainApplication(nextConfig, Boolean(androidApiKey));
  nextConfig = withGoogleMapsIOS(nextConfig, iosApiKey);
  return nextConfig;
};

module.exports = createRunOncePlugin(
  withVietRideGoogleMaps,
  PLUGIN_NAME,
  PLUGIN_VERSION,
);
