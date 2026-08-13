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
    const apiFailure = Object.assign(new Error('backend unavailable'), {
      code: 'ERR_NETWORK',
    });
    mockPost.mockRejectedValueOnce(apiFailure);

    await expect(
      changePassword({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      }),
    ).rejects.toBe(apiFailure);
  });
  it('unwraps the BE session-revocation response and sends idempotency', async () => {
    const response = {
      userId: '33333333-3333-4333-8333-333333333333',
      sessionsRevoked: true,
    };
    mockPost.mockResolvedValueOnce({
      data: { success: true, statusCode: 200, data: response },
    });

    await expect(
      changePassword({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      }),
    ).resolves.toEqual(response);

    expect(mockPost).toHaveBeenCalledWith(
      '/auth/change-password',
      {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      },
      {
        headers: {
          'Idempotency-Key': expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          ),
        },
      },
    );
  });

  it('sends avatar URL with the required idempotency header', async () => {
    const apiFailure = Object.assign(new Error('upload rejected'), {
      response: { status: 413 },
    });
    mockPatch.mockRejectedValueOnce(apiFailure);

    await expect(
      updateAvatarUrl(
        'https://storage.example/avatar.jpg',
        '9f4b8a60-0e23-4b7e-9b28-8f8a51f3d12a',
      ),
    ).rejects.toBe(apiFailure);

    expect(mockPatch).toHaveBeenCalledWith(
      '/users/me/avatar',
      { avatarUrl: 'https://storage.example/avatar.jpg' },
      {
        headers: { 'Idempotency-Key': '9f4b8a60-0e23-4b7e-9b28-8f8a51f3d12a' },
      },
    );
  });
});
