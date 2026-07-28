import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'react-native';

export interface ImagePreparationAsset {
  uri: string;
  width?: number;
  height?: number;
}

export const IMAGE_UPLOAD_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  maxDimensionPixels: 1024,
} as const;

export interface PreparedImage {
  uri: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  size: number;
}

const getImageDimensions = (
  uri: string,
  asset: ImagePreparationAsset,
): Promise<{ width: number; height: number }> => {
  if (
    typeof asset.width === 'number'
    && Number.isFinite(asset.width)
    && asset.width > 0
    && typeof asset.height === 'number'
    && Number.isFinite(asset.height)
    && asset.height > 0
  ) {
    return Promise.resolve({ width: asset.width, height: asset.height });
  }

  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => reject(new Error('Failed to read image dimensions')),
    );
  });
};

/**
 * Prepares an image for upload by fulfilling shared policy rules:
 * - Strip EXIF/location metadata
 * - Resize down to maxDimensionPixels (1024x1024)
 * - Convert to JPEG or WebP (including from HEIC)
 * - Ensure file size is strictly < 5MiB.
 */
export async function prepareImageUpload(
  asset: ImagePreparationAsset,
): Promise<PreparedImage> {
  const uri = asset.uri?.trim();
  if (!uri) {
    throw new Error('Invalid asset URI');
  }

  const sourceDimensions = await getImageDimensions(uri, asset);

  // 1. Resize if it exceeds dimensions
  let { width, height } = sourceDimensions;

  if (
    width > IMAGE_UPLOAD_LIMITS.maxDimensionPixels
    || height > IMAGE_UPLOAD_LIMITS.maxDimensionPixels
  ) {
    if (width > height) {
      height = Math.round(
        (height * IMAGE_UPLOAD_LIMITS.maxDimensionPixels) / width,
      );
      width = IMAGE_UPLOAD_LIMITS.maxDimensionPixels;
    } else {
      width = Math.round(
        (width * IMAGE_UPLOAD_LIMITS.maxDimensionPixels) / height,
      );
      height = IMAGE_UPLOAD_LIMITS.maxDimensionPixels;
    }
  }

  // JPEG normalizes HEIC/PNG/WebP input and removes source metadata on write.
  const format = SaveFormat.JPEG;
  const mimeType = 'image/jpeg' as const;

  // 2. Manipulate: Resize & Strip EXIF
  // Passing empty actions if no resize needed to just force format conversion & EXIF stripping.
  const actions =
    width !== sourceDimensions.width || height !== sourceDimensions.height
    ? [{ resize: { width, height } }]
    : [];

  const result = await manipulateAsync(uri, actions, {
    compress: 0.78,
    format,
  });

  const fileInfo = await FileSystem.getInfoAsync(result.uri);
  if (
    !fileInfo.exists
    || typeof fileInfo.size !== 'number'
    || fileInfo.size <= 0
  ) {
    throw new Error('Failed to read prepared file information');
  }

  // The condition fixes the bug: strictly < 5MiB, meaning >= 5MiB should reject.
  if (fileInfo.size >= IMAGE_UPLOAD_LIMITS.maxBytes) {
    throw new Error(`Kích thước ảnh sau xử lý vẫn quá lớn (${(fileInfo.size / 1024 / 1024).toFixed(2)} MB). Vui lòng chọn ảnh khác.`);
  }

  return {
    uri: result.uri,
    mimeType,
    size: fileInfo.size,
  };
}
