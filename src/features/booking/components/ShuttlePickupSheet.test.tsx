import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockRequestPermission = jest.fn();
const mockGetCurrentCoordinates = jest.fn();
const mockGeocodeAddress = jest.fn();
const mockReverseGeocode = jest.fn();
const mockFormatAddress = jest.fn();

const mockTheme = {
  colors: {
    background: '#eff7f8',
    divider: '#d8e3e2',
    error: '#b42318',
    primary: '#007d78',
    primaryFaded: '#e3f5f3',
    success: '#138a5b',
    textDisabled: '#aaa',
    textInverse: '#fff',
    textPrimary: '#13211f',
    textSecondary: '#435a57',
    textTertiary: '#70817f',
    transparent: 'transparent',
  },
  effects: {
    isLiquid: false,
    fieldBorder: '#ddd',
    fieldSurface: '#fff',
    glassBorder: '#ddd',
    glassBorderStrong: '#ddd',
    glassSurfaceSoft: '#f4f7f7',
    scrim: 'rgba(0,0,0,.4)',
  },
  components: {
    field: {},
    primaryButton: {},
    secondaryButton: {},
  },
};

jest.mock('@shared/contexts/ThemeContext', () => ({ useTheme: () => mockTheme }));
jest.mock('@shared/hooks', () => ({
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) => factory(mockTheme),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 12, left: 0 }),
}));
jest.mock('phosphor-react-native', () => ({
  CheckCircle: () => null,
  Crosshair: () => null,
  MapPinLine: () => null,
  ShieldCheck: () => null,
  X: () => null,
}));
jest.mock('@shared/services/deviceLocation', () => ({
  requestForegroundLocationPermission: () => mockRequestPermission(),
  getCurrentCoordinates: () => mockGetCurrentCoordinates(),
  geocodeAddress: (address: string) => mockGeocodeAddress(address),
  reverseGeocodeCoordinates: (coordinates: unknown) => mockReverseGeocode(coordinates),
  formatGeocodedAddress: (address: unknown) => mockFormatAddress(address),
  isDeviceLocationError: (error: unknown) => Boolean(
    error && typeof error === 'object' && 'code' in error,
  ),
}));

import { ShuttlePickupSheet } from './ShuttlePickupSheet';

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('ShuttlePickupSheet', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  const onSave = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestPermission.mockResolvedValue({ granted: true, canAskAgain: true });
    mockGeocodeAddress.mockResolvedValue({ latitude: 10.7769, longitude: 106.7009 });
  });

  afterEach(async () => {
    if (renderer) await act(async () => renderer?.unmount());
    renderer = undefined;
  });

  const renderSheet = async (): Promise<void> => {
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <ShuttlePickupSheet
          visible
          stationId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
          stationName="Mien Tay Station"
          initialValue={null}
          onClose={onClose}
          onSave={onSave}
        />,
      );
      await flush();
    });
  };

  it('verifies a manual address before committing coordinates to booking state', async () => {
    await renderSheet();

    act(() => renderer!.root.findByProps({
      accessibilityLabel: 'Shuttle pickup address',
    }).props.onChangeText('12 Nguyen Hue, District 1'));

    await act(async () => {
      await renderer!.root.findByProps({
        accessibilityLabel: 'Verify this address',
      }).props.onPress();
      await flush();
    });

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(mockGeocodeAddress).toHaveBeenCalledWith('12 Nguyen Hue, District 1');

    act(() => renderer!.root.findByProps({
      accessibilityLabel: 'Save pickup',
    }).props.onPress());

    expect(onSave).toHaveBeenCalledWith({
      stationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      address: '12 Nguyen Hue, District 1',
      latitude: 10.7769,
      longitude: 106.7009,
    });
  });

  it('does not invent a location after permission is denied', async () => {
    mockRequestPermission.mockRejectedValue({
      code: 'permission-denied',
      message: 'Location access was not granted.',
    });
    await renderSheet();

    await act(async () => {
      await renderer!.root.findByProps({
        accessibilityLabel: 'Use current location for Shuttle pickup',
      }).props.onPress();
      await flush();
    });

    expect(mockGetCurrentCoordinates).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer!.toJSON())).toContain('Location access was not granted');
  });
});
