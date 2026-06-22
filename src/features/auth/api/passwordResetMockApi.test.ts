import { ApiRequestError } from '@shared/api/errors';
import {
  mockConfirmPasswordResetOtp,
  mockRequestPasswordReset,
  mockResetPassword,
} from './passwordResetMockApi';

describe('passwordResetMockApi', () => {
  it('supports the full reset-password mock flow', async () => {
    const request = await mockRequestPasswordReset({
      email: ' USER@example.COM ',
    });

    expect(request.success).toBe(true);
    expect(request.debugOtpCode).toBe('123456');
    expect(request.mocked).toBe(true);

    const confirmation = await mockConfirmPasswordResetOtp({
      email: 'user@example.com',
      code: '123456',
    });

    expect(confirmation.resetToken).toContain('mock-reset-user@example.com');
    expect(confirmation.mocked).toBe(true);

    const reset = await mockResetPassword({
      resetToken: confirmation.resetToken,
      newPassword: 'pass1234',
    });

    expect(reset.status).toBe('ACTIVE');
  });

  it('rejects invalid reset OTP codes', async () => {
    await mockRequestPasswordReset({
      email: 'otp-user@example.com',
    });

    await expect(mockConfirmPasswordResetOtp({
      email: 'otp-user@example.com',
      code: '000000',
    })).rejects.toBeInstanceOf(ApiRequestError);
  });
});
