const mockPost = jest.fn();

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

jest.mock('@shared/api/tokenRefresh', () => ({
  refreshStoredTokenBundle: jest.fn(),
}));

import { requestPasswordReset, resetPassword } from './authApi';

const expectPublicMutationConfig = () =>
  expect.objectContaining({
    skipAuth: true,
    skipAuthRefresh: true,
    headers: expect.objectContaining({
      'Idempotency-Key': expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ),
    }),
  });

describe('password reset auth API contract', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('requests a generic reset OTP response using the normalized email', async () => {
    const response = { email: 'passenger@example.com', otpTtlMinutes: 5 };
    mockPost.mockResolvedValueOnce({
      data: { success: true, statusCode: 200, data: response },
    });

    await expect(
      requestPasswordReset({
        email: ' Passenger@Example.COM ',
      }),
    ).resolves.toEqual(response);

    expect(mockPost).toHaveBeenCalledWith(
      '/auth/forgot-password',
      { email: 'passenger@example.com' },
      expectPublicMutationConfig(),
    );
  });

  it('submits the six-digit OTP and new password through the public reset endpoint', async () => {
    const response = {
      userId: '33333333-3333-4333-8333-333333333333',
      status: 'ACTIVE',
    };
    mockPost.mockResolvedValueOnce({
      data: { success: true, statusCode: 200, data: response },
    });

    await expect(
      resetPassword({
        email: ' Passenger@Example.COM ',
        code: '123456',
        newPassword: 'NewPassword123!',
      }),
    ).resolves.toEqual(response);

    expect(mockPost).toHaveBeenCalledWith(
      '/auth/reset-password',
      {
        email: 'passenger@example.com',
        code: '123456',
        newPassword: 'NewPassword123!',
      },
      expectPublicMutationConfig(),
    );
  });
});
