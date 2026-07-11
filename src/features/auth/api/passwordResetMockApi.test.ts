import { ApiRequestError } from '@shared/api/errors';
import {
  mockRequestPasswordReset,
  mockResetPassword,
} from './passwordResetMockApi';

describe('passwordResetMockApi', () => {
  it('supports the full reset-password mock flow', async () => {
    const request = await mockRequestPasswordReset({
      email: ' USER@example.COM ',
    });

    expect(request.email).toBe('user@example.com');
    expect(request.otpTtlMinutes).toBe(5);

    const reset = await mockResetPassword({
      email: 'user@example.com',
      code: '123456',
      newPassword: 'pass1234',
    });

    expect(reset.status).toBe('ACTIVE');
  });

  it('rejects invalid reset OTP codes', async () => {
    await mockRequestPasswordReset({
      email: 'otp-user@example.com',
    });

    await expect(mockResetPassword({
      email: 'otp-user@example.com',
      code: '000000',
      newPassword: 'pass1234',
    })).rejects.toBeInstanceOf(ApiRequestError);
  });
});
