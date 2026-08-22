/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

process.env.EXPO_PUBLIC_APP_ENV = 'development';
process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.vietride.online/v1';
process.env.EXPO_PUBLIC_WS_URL = 'wss://ws.vietride.online';
process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_ENABLED = 'false';
process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_ENABLED = 'false';

jest.mock('react-native-gesture-handler', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const ReactNative = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    GestureHandlerRootView: ({
      children,
      style,
    }: {
      children?: React.ReactNode;
      style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
    }) => ReactModule.createElement(ReactNative.View, { style }, children),
  };
});

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

// The app-shell smoke test verifies provider composition. Navigator contracts
// and screens have focused suites; loading the full route graph here made this
// single assertion spend most of its time transforming unrelated screens.
jest.mock('@app/navigation/RootNavigator', () => ({
  RootNavigator: () => null,
}));

jest.mock('react-native-config', () => ({
  ENV: 'development',
  API_BASE_URL: 'https://api.vietride.online/v1',
  WS_URL: 'wss://ws.vietride.online',
}), { virtual: true });

// Resolve the module during suite setup so Metro/Jest transform time is not
// charged to this tiny render assertion on slower Windows runners.
const App = require('../src/app/App').default as typeof import('../src/app/App').default;

test('renders correctly', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });

  expect(renderer?.toJSON()).toBeDefined();

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
});
