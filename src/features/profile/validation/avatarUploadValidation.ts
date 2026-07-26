export type AllowedAvatarMimeType = 'image/jpeg';

interface WebFileMetadata {
  name?: string;
  size?: number;
  type?: string;
}

/** Framework-neutral metadata required before local image normalization. */
export interface AvatarPickerAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  width: number;
  height: number;
  type?: 'image' | 'video' | 'livePhoto' | 'pairedVideo' | null;
  file?: WebFileMetadata | null;
}

export interface AvatarUploadFile {
  uri: string;
  name: string;
  type: AllowedAvatarMimeType;
  size: number;
  width: number;
  height: number;
}

export type AvatarValidationErrorCode =
  | 'AVATAR_INVALID_ASSET'
  | 'AVATAR_DIMENSIONS_UNAVAILABLE';

export type AvatarValidationResult =
  | { success: true; file: AvatarUploadFile }
  | { success: false; code: AvatarValidationErrorCode; message: string };

const failure = (
  code: AvatarValidationErrorCode,
  message: string,
): AvatarValidationResult => ({ code, message, success: false });

const sanitizeAvatarBaseName = (fileName?: string | null): string => {
  const leafName = fileName?.trim().split(/[\\/]/).pop() || '';
  const safeName = leafName
    .replace(/\.[^.]*$/, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/[-_]{2,}/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 48);

  return safeName || 'vietride-avatar';
};

/**
 * Validate only whether the local picker returned an image. MIME and source
 * size are not upload constraints: the shared preparation service re-encodes
 * HEIC/PNG/WebP, strips metadata, resizes, and enforces the final byte limit.
 */
export const validateAvatarAsset = (
  asset: AvatarPickerAsset,
): AvatarValidationResult => {
  const uri = asset.uri?.trim();
  if (!uri || (asset.type != null && asset.type !== 'image')) {
    return failure('AVATAR_INVALID_ASSET', 'Vui lòng chọn một ảnh hợp lệ.');
  }

  if (
    !Number.isFinite(asset.width)
    || !Number.isFinite(asset.height)
    || asset.width <= 0
    || asset.height <= 0
  ) {
    return failure(
      'AVATAR_DIMENSIONS_UNAVAILABLE',
      'Không thể xác định kích thước ảnh. Vui lòng chọn ảnh khác.',
    );
  }

  const sourceSize = asset.fileSize ?? asset.file?.size;
  return {
    success: true,
    file: {
      uri,
      name: `${sanitizeAvatarBaseName(asset.fileName || asset.file?.name)}.jpg`,
      type: 'image/jpeg',
      size: Number.isFinite(sourceSize) && sourceSize && sourceSize > 0 ? sourceSize : 0,
      width: asset.width,
      height: asset.height,
    },
  };
};
