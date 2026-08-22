module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|@expo|expo|expo-.*|expo-modules-core|react-native-.*|@react-native-community)/)',
  ],
  moduleNameMapper: {
    '\\.(ttf|otf|png|jpg|jpeg|webp)$': '<rootDir>/__mocks__/assetMock.js',
    '^@notifee/react-native$': '<rootDir>/__mocks__/@notifee/react-native.js',
    '^@react-native-firebase/app$':
      '<rootDir>/__mocks__/@react-native-firebase/app.js',
    '^@react-native-firebase/messaging$':
      '<rootDir>/__mocks__/@react-native-firebase/messaging.js',
    '^@shared/notifications$': '<rootDir>/__mocks__/shared-notifications.js',
    '^expo-secure-store$': '<rootDir>/__mocks__/expo-secure-store.js',
    '^react-native-keyboard-controller$':
      'react-native-keyboard-controller/jest',
    '^@react-native-async-storage/async-storage$':
      '@react-native-async-storage/async-storage/jest/async-storage-mock',
  },
};
