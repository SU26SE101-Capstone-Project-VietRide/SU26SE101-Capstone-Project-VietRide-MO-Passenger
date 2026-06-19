const { getDefaultConfig } = require('expo/metro-config');

const nativeBuildOutputFolders = [
  /[/\\]node_modules[/\\]expo-modules-autolinking[/\\]android[/\\]expo-gradle-plugin[/\\](?:\.gradle|bin|build)(?:[/\\].*)?$/,
  /[/\\]node_modules[/\\]expo-modules-core[/\\]expo-module-gradle-plugin[/\\](?:\.gradle|bin|build)(?:[/\\].*)?$/,
];

/**
 * Metro configuration
 * https://docs.expo.dev/guides/customizing-metro/
 *
 * @type {import('expo/metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);
const defaultBlockList = config.resolver.blockList;

config.resolver.blockList = [
  ...(Array.isArray(defaultBlockList)
    ? defaultBlockList
    : defaultBlockList
      ? [defaultBlockList]
      : []),
  ...nativeBuildOutputFolders,
];

module.exports = config;
