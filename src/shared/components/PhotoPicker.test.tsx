import React from 'react';
import { Alert, type AlertButton } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import * as ImagePicker from 'expo-image-picker';

import { PhotoPicker } from './PhotoPicker';

const mockTheme = {
  colors: {
    border: '#ddd',
    divider: '#ddd',
    primary: '#087f5b',
    primaryFaded: '#e6fcf5',
    surfaceAlt: '#f5f5f5',
    textInverse: '#fff',
    textPrimary: '#111',
    textTertiary: '#777',
  },
  effects: {
    glassBorder: '#ddd',
    glassSurfaceSoft: '#fff',
    isLiquid: false,
    scrim: 'rgba(0,0,0,0.5)',
  },
};

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@shared/hooks', () => ({
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) => factory(mockTheme),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const labels: Record<string, string> = {
        'common.cancel': 'Cancel',
        'common.notNow': 'Not now',
        'common.ok': 'OK',
        'common.openSettings': 'Open settings',
        'shared.photoPicker.add': 'Add',
        'shared.photoPicker.addDescription': 'Choose a photo source',
        'shared.photoPicker.addErrorDescription': 'Unable to add photo',
        'shared.photoPicker.addErrorTitle': 'Photo unavailable',
        'shared.photoPicker.camera': 'Camera',
        'shared.photoPicker.cameraUnavailableDescription': 'Camera unavailable',
        'shared.photoPicker.cameraUnavailableTitle': 'Camera unavailable',
        'shared.photoPicker.defaultPhotoLabel': 'photo',
        'shared.photoPicker.defaultTitle': 'Photos',
        'shared.photoPicker.emptyTitle': 'No photos selected',
        'shared.photoPicker.photoLibrary': 'Photo library',
        'shared.photoPicker.supportedFormats': 'Supported image formats',
      };
      if (key === 'shared.photoPicker.addPhotos') {
        return `Add ${String(params?.label ?? 'photo')}s`;
      }
      if (key === 'shared.photoPicker.addTitle') {
        return `Add ${String(params?.label ?? 'photo')}`;
      }
      if (key === 'shared.photoPicker.removePhoto') {
        return `Remove ${String(params?.label ?? 'photo')} ${String(params?.position ?? '')}`;
      }
      if (key === 'shared.photoPicker.permissionTitle') {
        return `${String(params?.source ?? 'Photo')} permission needed`;
      }
      return labels[key] ?? key;
    },
  }),
}));

jest.mock('phosphor-react-native', () => ({
  Camera: () => null,
  ImageSquare: () => null,
  Plus: () => null,
  X: () => null,
}));

jest.mock('expo-image', () => ({
  Image: () => null,
}));

jest.mock('expo-image-picker', () => ({
  CameraType: { back: 'back' },
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
}));

jest.mock('@shopify/flash-list', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const ReactNative = jest.requireActual<typeof import('react-native')>('react-native');

  interface MockFlashListProps {
    data?: readonly unknown[];
    ListFooterComponent?: React.ReactElement | null;
    renderItem: (info: { item: unknown; index: number }) => React.ReactElement | null;
  }

  return {
    FlashList: ({
      data = [],
      ListFooterComponent,
      renderItem,
    }: MockFlashListProps) => ReactModule.createElement(
      ReactNative.View,
      null,
      ...data.map((item, index) => ReactModule.createElement(
        ReactNative.View,
        { key: String(index) },
        renderItem({ item, index }),
      )),
      ListFooterComponent ?? null,
    ),
  };
});

const cameraPermission = (
  granted: boolean,
  canAskAgain = true,
): ImagePicker.CameraPermissionResponse => ({
  canAskAgain,
  expires: 'never',
  granted,
  status: (granted ? 'granted' : 'denied') as ImagePicker.CameraPermissionResponse['status'],
});

const libraryPermission = (
  granted: boolean,
  canAskAgain = true,
): ImagePicker.MediaLibraryPermissionResponse => ({
  accessPrivileges: granted ? 'all' : 'none',
  canAskAgain,
  expires: 'never',
  granted,
  status: (granted ? 'granted' : 'denied') as ImagePicker.MediaLibraryPermissionResponse['status'],
});

const imageAsset = (uri: string): ImagePicker.ImagePickerAsset => ({
  height: 100,
  type: 'image',
  uri,
  width: 100,
});

const getLatestAlertButtons = (
  alertSpy: jest.SpyInstance,
): AlertButton[] => (alertSpy.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];

const flushAsyncWork = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('PhotoPicker', () => {
  const requestCameraPermission = jest.mocked(ImagePicker.requestCameraPermissionsAsync);
  const requestLibraryPermission = jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync);
  const launchCamera = jest.mocked(ImagePicker.launchCameraAsync);
  const launchLibrary = jest.mocked(ImagePicker.launchImageLibraryAsync);
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('caps gallery results at the safe local preview limit', async () => {
    requestLibraryPermission.mockResolvedValue(libraryPermission(true));
    launchLibrary.mockResolvedValue({
      canceled: false,
      assets: [
        imageAsset('file:///one.jpg'),
        imageAsset('file:///two.jpg'),
        imageAsset('file:///three.jpg'),
        imageAsset('file:///four.jpg'),
      ],
    });
    const onChange = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <PhotoPicker value={[]} onChange={onChange} photoLabel="parcel photo" />,
      );
    });

    await act(async () => {
      renderer!.root.findByProps({ accessibilityLabel: 'Add parcel photos' }).props.onPress();
    });
    const libraryAction = getLatestAlertButtons(alertSpy)
      .find((button) => button.text === 'Photo library');

    await act(async () => {
      libraryAction?.onPress?.();
      await flushAsyncWork();
    });

    expect(launchLibrary).toHaveBeenCalledWith(expect.objectContaining({
      selectionLimit: 3,
    }));
    expect(onChange).toHaveBeenCalledWith([
      'file:///one.jpg',
      'file:///two.jpg',
      'file:///three.jpg',
    ]);

    await act(async () => renderer!.unmount());
  });

  it('does not change the draft when the native picker is cancelled', async () => {
    requestLibraryPermission.mockResolvedValue(libraryPermission(true));
    launchLibrary.mockResolvedValue({ canceled: true, assets: null });
    const onChange = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <PhotoPicker value={[]} onChange={onChange} photoLabel="parcel photo" />,
      );
    });
    await act(async () => {
      renderer!.root.findByProps({ accessibilityLabel: 'Add parcel photos' }).props.onPress();
    });
    const libraryAction = getLatestAlertButtons(alertSpy)
      .find((button) => button.text === 'Photo library');

    await act(async () => {
      libraryAction?.onPress?.();
      await flushAsyncWork();
    });

    expect(onChange).not.toHaveBeenCalled();

    await act(async () => renderer!.unmount());
  });

  it('reports denied camera permission without opening the camera', async () => {
    requestCameraPermission.mockResolvedValue(cameraPermission(false));
    const onChange = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <PhotoPicker value={[]} onChange={onChange} photoLabel="parcel photo" />,
      );
    });
    await act(async () => {
      renderer!.root.findByProps({ accessibilityLabel: 'Add parcel photos' }).props.onPress();
    });
    const cameraAction = getLatestAlertButtons(alertSpy)
      .find((button) => button.text === 'Camera');

    await act(async () => {
      cameraAction?.onPress?.();
      await flushAsyncWork();
    });

    expect(launchCamera).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenLastCalledWith(
      'Camera permission needed',
      expect.any(String),
      expect.any(Array),
    );
    expect(onChange).not.toHaveBeenCalled();

    await act(async () => renderer!.unmount());
  });

  it('removes a selected local URI without mutating the input array', async () => {
    const initialPhotos = ['file:///one.jpg', 'file:///two.jpg'];
    const onChange = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <PhotoPicker value={initialPhotos} onChange={onChange} photoLabel="parcel photo" />,
      );
    });
    const removeButton = renderer!.root.findByProps({
      accessibilityLabel: 'Remove parcel photo 1',
    });
    expect(removeButton.props.hitSlop).toBe(12);

    await act(async () => {
      removeButton.props.onPress();
    });

    expect(onChange).toHaveBeenCalledWith(['file:///two.jpg']);
    expect(initialPhotos).toEqual(['file:///one.jpg', 'file:///two.jpg']);

    await act(async () => renderer!.unmount());
  });
});
