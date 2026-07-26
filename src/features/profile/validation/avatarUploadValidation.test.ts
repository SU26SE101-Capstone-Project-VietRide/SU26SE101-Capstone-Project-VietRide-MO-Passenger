import { validateAvatarAsset, type AvatarPickerAsset } from './avatarUploadValidation';

const makeAsset = (overrides: Partial<AvatarPickerAsset> = {}): AvatarPickerAsset => ({
  uri: 'file:///tmp/avatar-source',
  fileName: 'profile.source',
  mimeType: 'image/heic',
  fileSize: 8 * 1024 * 1024,
  width: 5000,
  height: 4000,
  type: 'image',
  ...overrides,
});

describe('validateAvatarAsset', () => {
  it('accepts source formats and dimensions that the preparation service normalizes', () => {
    expect(validateAvatarAsset(makeAsset())).toMatchObject({
      success: true,
      file: { name: 'profile.jpg', type: 'image/jpeg' },
    });
  });

  it('allows unavailable source MIME and size metadata because output is verified after conversion', () => {
    expect(validateAvatarAsset(makeAsset({ mimeType: null, fileSize: null }))).toMatchObject({
      success: true,
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

  it('rejects non-image picker assets', () => {
    expect(validateAvatarAsset(makeAsset({ type: 'video' }))).toMatchObject({
      success: false,
      code: 'AVATAR_INVALID_ASSET',
    });
  });
});
