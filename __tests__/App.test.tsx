/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../src/app/App';

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('react-native-config', () => ({
  ENV: 'development',
  API_BASE_URL: 'https://api.vietride.dev/v1',
  WS_URL: 'wss://ws.vietride.dev',
  GOOGLE_MAPS_API_KEY: '',
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
