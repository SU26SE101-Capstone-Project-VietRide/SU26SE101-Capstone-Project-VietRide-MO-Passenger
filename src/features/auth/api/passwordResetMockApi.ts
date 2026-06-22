import { ApiRequestError } from '@shared/api/errors';
import type {
  ConfirmPasswordResetOtpPayload,
  ConfirmPasswordResetOtpResponse,
  PasswordResetPayload,
  PasswordResetResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
} from '../types';
import { normalizeEmail } from '../validation/authValidation';

const MOCK_OTP_CODE = '123456';
const OTP_TTL_MINUTES = 5;
const RESET_TOKEN_TTL_MINUTES = 10;

interface PasswordResetRecord {
  email: string;
  code: string;
  otpExpiresAt: number;
  resetToken?: string;
  resetTokenExpiresAt?: number;
}

const resetRecords = new Map<string, PasswordResetRecord>();

const now = (): number => Date.now();

const createResetToken = (email: string): string =>
  `mock-reset-${email}-${now().toString(36)}`;

const otpInvalidError = (): ApiRequestError =>
  new ApiRequestError({
    message: 'Mã xác thực không đúng.',
    code: 'AUTH_OTP_INVALID',
    statusCode: 400,
    fields: [{ field: 'code', message: 'Invalid verification code.' }],
  });

const otpExpiredError = (): ApiRequestError =>
  new ApiRequestError({
    message: 'Mã xác thực đã hết hạn.',
    code: 'AUTH_OTP_EXPIRED',
    statusCode: 400,
    fields: [{ field: 'code', message: 'Verification code has expired.' }],
  });

const resetTokenInvalidError = (): ApiRequestError =>
  new ApiRequestError({
    message: 'Phiên đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu mã mới.',
    code: 'AUTH_PASSWORD_RESET_TOKEN_INVALID',
    statusCode: 400,
  });

const resetTokenExpiredError = (): ApiRequestError =>
  new ApiRequestError({
    message: 'Phiên đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu mã mới.',
    code: 'AUTH_PASSWORD_RESET_TOKEN_EXPIRED',
    statusCode: 400,
  });

export async function mockRequestPasswordReset(
  payload: PasswordResetPayload,
): Promise<PasswordResetResponse> {
  const email = normalizeEmail(payload.email);

  resetRecords.set(email, {
    email,
    code: MOCK_OTP_CODE,
    otpExpiresAt: now() + OTP_TTL_MINUTES * 60_000,
  });

  return {
    success: true,
    message: 'Mock reset code generated. Use 123456 to continue.',
    otpTtlMinutes: OTP_TTL_MINUTES,
    debugOtpCode: MOCK_OTP_CODE,
    mocked: true,
  };
}

export async function mockConfirmPasswordResetOtp(
  payload: ConfirmPasswordResetOtpPayload,
): Promise<ConfirmPasswordResetOtpResponse> {
  const email = normalizeEmail(payload.email);
  const record = resetRecords.get(email);

  if (!record) {
    throw otpInvalidError();
  }

  if (record.otpExpiresAt <= now()) {
    throw otpExpiredError();
  }

  if (payload.code !== record.code) {
    throw otpInvalidError();
  }

  const resetToken = createResetToken(email);
  resetRecords.set(email, {
    ...record,
    resetToken,
    resetTokenExpiresAt: now() + RESET_TOKEN_TTL_MINUTES * 60_000,
  });

  return {
    resetToken,
    resetTokenTtlMinutes: RESET_TOKEN_TTL_MINUTES,
    mocked: true,
  };
}

export async function mockResetPassword(
  payload: ResetPasswordPayload,
): Promise<ResetPasswordResponse> {
  const record = Array.from(resetRecords.values()).find(
    (item) => item.resetToken === payload.resetToken,
  );

  if (!record) {
    throw resetTokenInvalidError();
  }

  if (!record.resetTokenExpiresAt || record.resetTokenExpiresAt <= now()) {
    resetRecords.delete(record.email);
    throw resetTokenExpiredError();
  }

  resetRecords.delete(record.email);

  return {
    userId: `mock-user-${record.email}`,
    status: 'ACTIVE',
  };
}
