const mockPost = jest.fn();
const mockPatch = jest.fn();

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

import { changePassword, updateAvatarUrl } from './profileApi';

describe('profileApi error propagation', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPatch.mockReset();
  });

  it('propagates change-password API failures without returning fake success', async () => {
    const apiFailure = Object.assign(new Error('backend unavailable'), { code: 'ERR_NETWORK' });
    mockPost.mockRejectedValueOnce(apiFailure);

    await expect(changePassword({
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
    })).rejects.toBe(apiFailure);
  });

  it('sends avatar URL with the required idempotency header', async () => {
    const apiFailure = Object.assign(new Error('upload rejected'), { response: { status: 413 } });
    mockPatch.mockRejectedValueOnce(apiFailure);

    await expect(updateAvatarUrl(
      'https://storage.example/avatar.jpg',
      '9f4b8a60-0e23-4b7e-9b28-8f8a51f3d12a',
    )).rejects.toBe(apiFailure);

    expect(mockPatch).toHaveBeenCalledWith(
      '/users/me/avatar',
      { avatarUrl: 'https://storage.example/avatar.jpg' },
      { headers: { 'Idempotency-Key': '9f4b8a60-0e23-4b7e-9b28-8f8a51f3d12a' } },
    );
  });
});
