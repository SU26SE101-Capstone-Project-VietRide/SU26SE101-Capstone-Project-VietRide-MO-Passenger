import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { pickLocalImages } from './localImagePicker';

jest.mock('expo-image-picker', () => ({
  CameraType: { back: 'back' },
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
}));

const setAndroidVersion = (version: number): void => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  Object.defineProperty(Platform, 'Version', { configurable: true, value: version });
};

describe('local image picker Android permissions', () => {
  const originalOs = Platform.OS;
  const originalVersion = Platform.Version;
  const requestCamera = jest.mocked(ImagePicker.requestCameraPermissionsAsync);
  const requestLibrary = jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync);
  const launchCamera = jest.mocked(ImagePicker.launchCameraAsync);
  const launchLibrary = jest.mocked(ImagePicker.launchImageLibraryAsync);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOs });
    Object.defineProperty(Platform, 'Version', { configurable: true, value: originalVersion });
  });

  it('opens the Android system library without requesting legacy storage permission', async () => {
    setAndroidVersion(32);
    launchLibrary.mockResolvedValue({ canceled: true, assets: null });

    await expect(pickLocalImages({ source: 'library' })).resolves.toEqual({
      status: 'cancelled',
    });

    expect(requestLibrary).not.toHaveBeenCalled();
    expect(launchLibrary).toHaveBeenCalledTimes(1);
  });

  it('fails closed for legacy Android camera without requesting undeclared storage access', async () => {
    setAndroidVersion(28);

    await expect(pickLocalImages({ source: 'camera' })).resolves.toEqual({
      status: 'unavailable',
      source: 'camera',
      reason: 'legacy-android-camera-storage',
    });

    expect(requestCamera).not.toHaveBeenCalled();
    expect(launchCamera).not.toHaveBeenCalled();
  });
});
