import * as Location from 'expo-location';

import {
  DeviceLocationError,
  formatGeocodedAddress,
  formatStreetAddressForPlaceSearch,
  geocodeAddress,
  getCurrentCoordinates,
  requestForegroundLocationPermission,
  reverseGeocodeCoordinates,
} from './deviceLocation';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
  requestForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  geocodeAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

const requestPermission = jest.mocked(Location.requestForegroundPermissionsAsync);
const getLastKnownPosition = jest.mocked(Location.getLastKnownPositionAsync);
const getCurrentPosition = jest.mocked(Location.getCurrentPositionAsync);
const nativeGeocode = jest.mocked(Location.geocodeAsync);
const nativeReverseGeocode = jest.mocked(Location.reverseGeocodeAsync);

const locationPosition = (
  latitude: number,
  longitude: number,
): Location.LocationObject => ({
  coords: {
    latitude,
    longitude,
    altitude: null,
    accuracy: 20,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
});

describe('deviceLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests foreground permission only when explicitly called', async () => {
    requestPermission.mockResolvedValue({
      granted: true,
      status: Location.PermissionStatus.GRANTED,
      canAskAgain: true,
      expires: 'never',
    });

    await expect(requestForegroundLocationPermission()).resolves.toEqual({
      granted: true,
      canAskAgain: true,
    });
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it('returns a typed safe permission error without exposing native details', async () => {
    requestPermission.mockRejectedValue(new Error('native provider secret detail'));

    await expect(requestForegroundLocationPermission()).rejects.toEqual(
      new DeviceLocationError('permission-denied'),
    );
  });

  it('emits recent coordinates before resolving a fresh Balanced location', async () => {
    getLastKnownPosition.mockResolvedValue(locationPosition(10.776, 106.701));
    getCurrentPosition.mockResolvedValue(locationPosition(10.778, 106.703));
    const onLastKnownCoordinates = jest.fn();

    await expect(getCurrentCoordinates({ onLastKnownCoordinates })).resolves.toEqual({
      latitude: 10.778,
      longitude: 106.703,
    });

    expect(getLastKnownPosition).toHaveBeenCalledWith({ maxAge: 5 * 60 * 1000 });
    expect(onLastKnownCoordinates).toHaveBeenCalledWith({
      latitude: 10.776,
      longitude: 106.701,
    });
    expect(getCurrentPosition).toHaveBeenCalledWith({
      accuracy: Location.Accuracy.Balanced,
    });
  });

  it('does not invent coordinates when the native position is unavailable', async () => {
    getLastKnownPosition.mockResolvedValue(null);
    getCurrentPosition.mockRejectedValue(new Error('GPS unavailable at 10.1, 106.1'));

    await expect(getCurrentCoordinates()).rejects.toMatchObject({
      code: 'position-unavailable',
      message: 'Your current location is unavailable. Please try again.',
    });
  });

  it('forward geocodes a normalized address and rejects an empty result', async () => {
    nativeGeocode.mockResolvedValueOnce([{ latitude: 10.8, longitude: 106.7 }]);

    await expect(geocodeAddress('  Bến xe Miền Đông  ')).resolves.toEqual({
      latitude: 10.8,
      longitude: 106.7,
    });
    expect(nativeGeocode).toHaveBeenCalledWith('Bến xe Miền Đông');

    nativeGeocode.mockResolvedValueOnce([]);
    await expect(geocodeAddress('Không tồn tại')).rejects.toMatchObject({
      code: 'address-not-found',
    });
  });

  it('rejects an empty or oversized address before calling the native geocoder', async () => {
    await expect(geocodeAddress('   ')).rejects.toMatchObject({
      code: 'invalid-address',
    });
    await expect(geocodeAddress('a'.repeat(501))).rejects.toMatchObject({
      code: 'invalid-address',
    });
    expect(nativeGeocode).not.toHaveBeenCalled();
  });

  it('reverse geocodes valid coordinates and formats a portable address', async () => {
    nativeReverseGeocode.mockResolvedValue([{
      city: 'Thành phố Hồ Chí Minh',
      district: 'Quận 1',
      streetNumber: '1',
      street: 'Lê Lợi',
      region: 'Thành phố Hồ Chí Minh',
      subregion: null,
      country: 'Việt Nam',
      postalCode: null,
      name: null,
      isoCountryCode: 'VN',
      timezone: null,
      formattedAddress: null,
    }]);

    const address = await reverseGeocodeCoordinates({
      latitude: 10.773,
      longitude: 106.7,
    });

    expect(nativeReverseGeocode).toHaveBeenCalledWith({
      latitude: 10.773,
      longitude: 106.7,
    });
    expect(formatGeocodedAddress(address)).toBe(
      '1 Lê Lợi, Quận 1, Thành phố Hồ Chí Minh, Việt Nam',
    );
  });

  it('builds a precise Places query without using the native POI name', () => {
    expect(
      formatStreetAddressForPlaceSearch({
        city: 'Thành phố Hồ Chí Minh',
        district: 'Phường Bến Thành',
        streetNumber: '87',
        street: 'Lý Tự Trọng',
        region: 'Thành phố Hồ Chí Minh',
        subregion: 'Quận 1',
        country: 'Việt Nam',
        postalCode: '700000',
        name: 'Cửa hàng gần vị trí hiện tại',
        isoCountryCode: 'VN',
        formattedAddress:
          'Cửa hàng gần vị trí hiện tại, 87 Lý Tự Trọng, Quận 1',
      }),
    ).toBe(
      '87 Lý Tự Trọng, Phường Bến Thành, Quận 1, Thành phố Hồ Chí Minh, 700000, Việt Nam',
    );
  });

  it('removes the native POI name from a formatted-address fallback', () => {
    expect(
      formatStreetAddressForPlaceSearch({
        city: null,
        district: null,
        streetNumber: null,
        street: null,
        region: null,
        subregion: null,
        country: null,
        postalCode: null,
        name: 'VietRide Coffee',
        isoCountryCode: 'VN',
        formattedAddress: 'VietRide Coffee, 12 Nguyễn Huệ, Quận 1, Hồ Chí Minh',
      }),
    ).toBe('12 Nguyễn Huệ, Quận 1, Hồ Chí Minh');
  });

  it('fails before native reverse geocoding for out-of-range coordinates', async () => {
    await expect(reverseGeocodeCoordinates({
      latitude: 91,
      longitude: 106.7,
    })).rejects.toMatchObject({ code: 'invalid-coordinates' });
    expect(nativeReverseGeocode).not.toHaveBeenCalled();
  });
});
