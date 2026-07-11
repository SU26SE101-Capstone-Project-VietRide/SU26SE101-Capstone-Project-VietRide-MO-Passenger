import { ApiRequestError } from '@shared/api/errors';
import type {
  PasswordResetPayload,
  PasswordResetResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
} from '../types';
import { normalizeEmail } from '../validation/authValidation';

const MOCK_OTP_CODE = '123456';
const OTP_TTL_MINUTES = 5;

interface PasswordResetRecord {
  email: string;
  code: string;
  otpExpiresAt: number;
}

const resetRecords = new Map<string, PasswordResetRecord>();

const now = (): number => Date.now();

const otpInvalidError = (): ApiRequestError =>
  new ApiRequestError({
    message: 'Invalid verification code.',
    code: 'AUTH_OTP_INVALID',
    statusCode: 400,
    fields: [{ field: 'code', message: 'Invalid verification code.' }],
  });

const otpExpiredError = (): ApiRequestError =>
  new ApiRequestError({
    message: 'Verification code has expired.',
    code: 'AUTH_OTP_EXPIRED',
    statusCode: 400,
    fields: [{ field: 'code', message: 'Verification code has expired.' }],
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
    email,
    otpTtlMinutes: OTP_TTL_MINUTES,
  };
}

export async function mockResetPassword(
  payload: ResetPasswordPayload,
): Promise<ResetPasswordResponse> {
  const email = normalizeEmail(payload.email);
  const record = resetRecords.get(email);

  if (!record) {
    throw otpInvalidError();
  }

  if (record.otpExpiresAt <= now()) {
    resetRecords.delete(record.email);
    throw otpExpiredError();
  }

  if (payload.code !== record.code) {
    throw otpInvalidError();
  }

  resetRecords.delete(record.email);

  return {
    userId: `mock-user-${record.email}`,
    status: 'ACTIVE',
  };
}
