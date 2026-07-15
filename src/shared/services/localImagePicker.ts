import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type LocalImagePickerSource = 'camera' | 'library';
export type LocalImageAsset = ImagePicker.ImagePickerAsset;

export interface PickLocalImagesOptions {
  source: LocalImagePickerSource;
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  selectionLimit?: number;
}

export type PickLocalImagesResult =
  | { status: 'selected'; assets: readonly LocalImageAsset[] }
  | { status: 'cancelled' }
  | {
      status: 'permission-denied';
      source: LocalImagePickerSource;
      canAskAgain: boolean;
    }
  | {
      status: 'unavailable';
      source: LocalImagePickerSource;
      reason: 'legacy-android-camera-storage';
    };

const normalizeQuality = (quality: number | undefined): number => {
  if (!Number.isFinite(quality)) {
    return 0.8;
  }

  return Math.min(1, Math.max(0, quality ?? 0.8));
};

const normalizeSelectionLimit = (selectionLimit: number | undefined): number => {
  if (!Number.isFinite(selectionLimit)) {
    return 1;
  }

  return Math.max(1, Math.floor(selectionLimit ?? 1));
};

/**
 * Single typed boundary for Expo ImagePicker permissions and native launch.
 * Feature UIs remain responsible for their own copy and asset validation.
 */
export const pickLocalImages = async ({
  source,
  allowsEditing = false,
  aspect,
  quality,
  selectionLimit,
}: PickLocalImagesOptions): Promise<PickLocalImagesResult> => {
  if (
    source === 'camera'
    && Platform.OS === 'android'
    && typeof Platform.Version === 'number'
    && Platform.Version < 29
  ) {
    return {
      status: 'unavailable',
      source,
      reason: 'legacy-android-camera-storage',
    };
  }

  // Android's system photo picker does not require storage permission. Asking
  // for it breaks API <= 32 when READ/WRITE_EXTERNAL_STORAGE are deliberately
  // absent from the manifest.
  const permission = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : Platform.OS === 'android'
      ? null
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (permission && !permission.granted) {
    return {
      status: 'permission-denied',
      source,
      canAskAgain: permission.canAskAgain,
    };
  }

  const safeQuality = normalizeQuality(quality);
  const safeSelectionLimit = normalizeSelectionLimit(selectionLimit);
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync({
        allowsEditing,
        ...(aspect ? { aspect } : {}),
        base64: false,
        cameraType: ImagePicker.CameraType.back,
        exif: false,
        mediaTypes: ['images'],
        quality: safeQuality,
      })
    : await ImagePicker.launchImageLibraryAsync({
        allowsEditing,
        ...(aspect ? { aspect } : {}),
        allowsMultipleSelection: !allowsEditing && safeSelectionLimit > 1,
        base64: false,
        exif: false,
        mediaTypes: ['images'],
        orderedSelection: !allowsEditing && safeSelectionLimit > 1,
        quality: safeQuality,
        selectionLimit: safeSelectionLimit,
      });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return { status: 'cancelled' };
  }

  return { status: 'selected', assets: result.assets };
};
