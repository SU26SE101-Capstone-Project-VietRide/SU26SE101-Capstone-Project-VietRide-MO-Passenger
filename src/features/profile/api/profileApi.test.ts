const mockPost = jest.fn();

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import { changePassword, uploadAvatar } from './profileApi';
import { validateAvatarAsset } from '../validation/avatarUploadValidation';

const makeValidatedAvatar = () => {
  const result = validateAvatarAsset({
    uri: 'file:///tmp/avatar.jpg',
    fileName: 'avatar.jpg',
    mimeType: 'image/jpeg',
    fileSize: 128 * 1024,
    width: 512,
    height: 512,
    type: 'image',
  });

  if (!result.success) {
    throw new Error(`Invalid test fixture: ${result.code}`);
  }

  return result.file;
};

describe('profileApi error propagation', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('propagates change-password API failures without returning fake success', async () => {
    const apiFailure = Object.assign(new Error('backend unavailable'), {
      code: 'ERR_NETWORK',
    });
    mockPost.mockRejectedValueOnce(apiFailure);

    await expect(changePassword({
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
    })).rejects.toBe(apiFailure);

    expect(mockPost).toHaveBeenCalledWith('/auth/change-password', {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
    });
  });

  it('propagates avatar upload API failures without returning a local fallback user', async () => {
    const apiFailure = Object.assign(new Error('upload rejected'), {
      response: { status: 413 },
    });
    mockPost.mockRejectedValueOnce(apiFailure);

    await expect(uploadAvatar(makeValidatedAvatar())).rejects.toBe(apiFailure);

    expect(mockPost).toHaveBeenCalledWith(
      '/users/me/avatar',
      expect.any(FormData),
    );
  });

  it('revalidates prepared metadata before creating the upload request', async () => {
    const file = makeValidatedAvatar();

    await expect(uploadAvatar({
      ...file,
      type: 'image/png',
      size: 0,
    })).rejects.toMatchObject({
      name: 'AvatarValidationError',
      code: 'AVATAR_SIZE_UNAVAILABLE',
    });

    expect(mockPost).not.toHaveBeenCalled();
  });
});
