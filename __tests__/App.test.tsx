/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

process.env.EXPO_PUBLIC_APP_ENV = 'development';
process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.vietride.online/v1';
process.env.EXPO_PUBLIC_WS_URL = 'wss://ws.vietride.online';
process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = '';

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: null })),
}));

jest.mock('expo-location', () => ({
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
  Accuracy: {
    Balanced: 3,
  },
  requestForegroundPermissionsAsync: jest.fn(async () => ({
    granted: false,
    status: 'denied',
  })),
  getLastKnownPositionAsync: jest.fn(async () => null),
  getCurrentPositionAsync: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('@features/location/hooks/useLocations', () => ({
  useLocations: jest.fn(() => ({
    data: [],
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: jest.fn(),
  })),
}));

jest.mock('react-native-config', () => ({
  ENV: 'development',
  API_BASE_URL: 'https://api.vietride.online/v1',
  WS_URL: 'wss://ws.vietride.online',
  GOOGLE_MAPS_API_KEY: '',
}), { virtual: true });

test('renders correctly', async () => {
  const App = require('../src/app/App').default as typeof import('../src/app/App').default;

  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
  });
}, 15_000);
