export const AVATAR_UPLOAD_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  maxDimensionPixels: 4096,
} as const;

const MIME_EXTENSION_MAP = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export type AllowedAvatarMimeType = keyof typeof MIME_EXTENSION_MAP;

interface WebFileMetadata {
  name?: string;
  size?: number;
  type?: string;
}

/**
 * The metadata exposed by Expo ImagePicker that is required to safely prepare
 * an avatar. Kept framework-independent so validation stays cheap and testable.
 * The API must still validate the uploaded bytes server-side.
 */
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
  | 'AVATAR_MIME_UNAVAILABLE'
  | 'AVATAR_UNSUPPORTED_MIME'
  | 'AVATAR_MIME_MISMATCH'
  | 'AVATAR_SIZE_UNAVAILABLE'
  | 'AVATAR_FILE_TOO_LARGE'
  | 'AVATAR_DIMENSIONS_UNAVAILABLE'
  | 'AVATAR_DIMENSIONS_TOO_LARGE';

export type AvatarValidationResult =
  | { success: true; file: AvatarUploadFile }
  | {
      success: false;
      code: AvatarValidationErrorCode;
      message: string;
    };

export class AvatarValidationError extends Error {
  readonly code: AvatarValidationErrorCode;

  constructor(code: AvatarValidationErrorCode, message: string) {
    super(message);
    this.name = 'AvatarValidationError';
    this.code = code;
  }
}

const failure = (
  code: AvatarValidationErrorCode,
  message: string,
): AvatarValidationResult => ({ success: false, code, message });

const normalizeMimeType = (value?: string | null): string | null => {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
};

const isAllowedMimeType = (value: string): value is AllowedAvatarMimeType =>
  Object.prototype.hasOwnProperty.call(MIME_EXTENSION_MAP, value);

const sanitizeAvatarBaseName = (fileName?: string | null): string => {
  const leafName = fileName?.trim().split(/[\\/]/).pop() || '';
  const withoutLastExtension = leafName.replace(/\.[^.]*$/, '');
  const asciiName = withoutLastExtension
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
  const safeName = asciiName
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/[-_]{2,}/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 48);

  return safeName || 'vietride-avatar';
};

/**
 * Validates picker metadata without reading or decoding the image on the JS
 * thread. The filename extension is deliberately ignored and regenerated from
 * the allowlisted MIME type.
 */
export const validateAvatarAsset = (
  asset: AvatarPickerAsset,
): AvatarValidationResult => {
  const uri = asset.uri?.trim();

  if (!uri || (asset.type != null && asset.type !== 'image')) {
    return failure('AVATAR_INVALID_ASSET', 'Vui lòng chọn một tệp ảnh hợp lệ.');
  }

  const pickerMimeType = normalizeMimeType(asset.mimeType);
  const webFileMimeType = normalizeMimeType(asset.file?.type);

  if (pickerMimeType && webFileMimeType && pickerMimeType !== webFileMimeType) {
    return failure(
      'AVATAR_MIME_MISMATCH',
      'Không thể xác minh định dạng ảnh đã chọn. Vui lòng chọn ảnh khác.',
    );
  }

  const mimeType = pickerMimeType || webFileMimeType;

  if (!mimeType) {
    return failure(
      'AVATAR_MIME_UNAVAILABLE',
      'Không thể xác định định dạng ảnh. Vui lòng chọn ảnh JPEG, PNG hoặc WebP khác.',
    );
  }

  if (!isAllowedMimeType(mimeType)) {
    return failure(
      'AVATAR_UNSUPPORTED_MIME',
      'Ảnh đại diện chỉ hỗ trợ định dạng JPEG, PNG hoặc WebP.',
    );
  }

  const fileSize = asset.fileSize ?? asset.file?.size;

  if (!Number.isFinite(fileSize) || !fileSize || fileSize <= 0) {
    return failure(
      'AVATAR_SIZE_UNAVAILABLE',
      'Không thể xác định dung lượng ảnh. Vui lòng chọn ảnh khác.',
    );
  }

  if (fileSize > AVATAR_UPLOAD_LIMITS.maxBytes) {
    return failure(
      'AVATAR_FILE_TOO_LARGE',
      'Ảnh đại diện không được vượt quá 5 MB.',
    );
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

  if (
    asset.width > AVATAR_UPLOAD_LIMITS.maxDimensionPixels
    || asset.height > AVATAR_UPLOAD_LIMITS.maxDimensionPixels
  ) {
    return failure(
      'AVATAR_DIMENSIONS_TOO_LARGE',
      'Mỗi chiều của ảnh đại diện không được vượt quá 4096 px.',
    );
  }

  const sourceName = asset.fileName || asset.file?.name;
  const extension = MIME_EXTENSION_MAP[mimeType];

  return {
    success: true,
    file: {
      uri,
      name: `${sanitizeAvatarBaseName(sourceName)}.${extension}`,
      type: mimeType,
      size: fileSize,
      width: asset.width,
      height: asset.height,
    },
  };
};
