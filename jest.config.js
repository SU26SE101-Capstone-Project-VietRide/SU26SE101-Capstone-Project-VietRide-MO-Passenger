module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|@expo|expo|expo-font|expo-modules-core|react-native-.*|@react-native-community)/)',
  ],
  moduleNameMapper: {
    '\\.(ttf|otf|png|jpg|jpeg|webp)$': '<rootDir>/__mocks__/assetMock.js',
  },
};
