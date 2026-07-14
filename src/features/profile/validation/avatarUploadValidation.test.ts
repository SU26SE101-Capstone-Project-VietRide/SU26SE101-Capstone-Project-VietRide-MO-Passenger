import {
  AVATAR_UPLOAD_LIMITS,
  validateAvatarAsset,
  type AvatarPickerAsset,
} from './avatarUploadValidation';

const makeAsset = (
  overrides: Partial<AvatarPickerAsset> = {},
): AvatarPickerAsset => ({
  uri: 'file:///tmp/avatar-source',
  fileName: 'profile.source',
  mimeType: 'image/jpeg',
  fileSize: 256 * 1024,
  width: 1024,
  height: 1024,
  type: 'image',
  ...overrides,
});

describe('validateAvatarAsset', () => {
  it.each([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
  ] as const)('accepts allowlisted %s images and derives the extension from MIME', (
    mimeType,
    extension,
  ) => {
    const result = validateAvatarAsset(makeAsset({
      fileName: 'avatar.untrusted-extension',
      mimeType,
    }));

    expect(result).toEqual({
      success: true,
      file: {
        uri: 'file:///tmp/avatar-source',
        name: `avatar.${extension}`,
        type: mimeType,
        size: 256 * 1024,
        width: 1024,
        height: 1024,
      },
    });
  });

  it('sanitizes paths, control characters, and unsafe filename characters', () => {
    const result = validateAvatarAsset(makeAsset({
      fileName: '../../evil\r\n"name.PNG',
      mimeType: 'image/webp',
    }));

    expect(result).toMatchObject({
      success: true,
      file: { name: 'evil-name.webp' },
    });
  });

  it('does not infer a valid MIME type from a trusted-looking extension', () => {
    expect(validateAvatarAsset(makeAsset({
      fileName: 'avatar.jpg',
      mimeType: 'application/pdf',
    }))).toMatchObject({
      success: false,
      code: 'AVATAR_UNSUPPORTED_MIME',
    });
  });

  it('fails closed when MIME metadata is unavailable', () => {
    expect(validateAvatarAsset(makeAsset({
      fileName: 'avatar.jpg',
      mimeType: null,
    }))).toMatchObject({
      success: false,
      code: 'AVATAR_MIME_UNAVAILABLE',
    });
  });

  it('rejects conflicting native and web MIME metadata', () => {
    expect(validateAvatarAsset(makeAsset({
      mimeType: 'image/png',
      file: {
        name: 'avatar.png',
        size: 256 * 1024,
        type: 'image/jpeg',
      },
    }))).toMatchObject({
      success: false,
      code: 'AVATAR_MIME_MISMATCH',
    });
  });

  it('fails closed when file size metadata is unavailable', () => {
    expect(validateAvatarAsset(makeAsset({ fileSize: null }))).toMatchObject({
      success: false,
      code: 'AVATAR_SIZE_UNAVAILABLE',
    });
  });

  it('rejects images larger than the upload limit', () => {
    expect(validateAvatarAsset(makeAsset({
      fileSize: AVATAR_UPLOAD_LIMITS.maxBytes + 1,
    }))).toMatchObject({
      success: false,
      code: 'AVATAR_FILE_TOO_LARGE',
    });
  });

  it.each([
    { width: 0, height: 1024 },
    { width: 1024, height: Number.NaN },
  ])('rejects unavailable dimensions: %o', ({ width, height }) => {
    expect(validateAvatarAsset(makeAsset({ width, height }))).toMatchObject({
      success: false,
      code: 'AVATAR_DIMENSIONS_UNAVAILABLE',
    });
  });

  it.each([
    { width: AVATAR_UPLOAD_LIMITS.maxDimensionPixels + 1, height: 1024 },
    { width: 1024, height: AVATAR_UPLOAD_LIMITS.maxDimensionPixels + 1 },
  ])('rejects dimensions above the per-side limit: %o', ({ width, height }) => {
    expect(validateAvatarAsset(makeAsset({ width, height }))).toMatchObject({
      success: false,
      code: 'AVATAR_DIMENSIONS_TOO_LARGE',
    });
  });

  it('rejects non-image picker assets', () => {
    expect(validateAvatarAsset(makeAsset({ type: 'video' }))).toMatchObject({
      success: false,
      code: 'AVATAR_INVALID_ASSET',
    });
  });
});
