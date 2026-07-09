import { apiClient } from '@shared/api/axiosInstance';
import { toApiError, unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import { refreshStoredTokenBundle } from '@shared/api/tokenRefresh';
import type {
  AuthSession,
  AuthUserDto,
  ConfirmPasswordResetOtpPayload,
  ConfirmPasswordResetOtpResponse,
  GoogleLoginPayload,
  LoginCredentials,
  PasswordResetPayload,
  PasswordResetResponse,
  RegisterPayload,
  RegisterResponse,
  ResendVerificationEmailPayload,
  ResendVerificationEmailResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
  TokenBundleDto,
  VerifyEmailPayload,
  VerifyEmailResponse,
} from '../types';
import { mapAuthUser, mapTokenBundle, type User } from '../types';
import {
  normalizeDisplayName,
  normalizeEmail,
  normalizeVietnamPhone,
} from '../validation/authValidation';
import {
  mockConfirmPasswordResetOtp,
  mockRequestPasswordReset,
  mockResetPassword,
} from './passwordResetMockApi';

const AUTH_REFRESH_DISABLED = { skipAuthRefresh: true } as const;

export const authKeys = {
  all: ['auth'] as const,
  me: ['auth', 'me'] as const,
};

const canUsePasswordResetMock = (error: unknown): boolean => {
  const apiError = toApiError(error);

  return (
    apiError.code === 'RESOURCE_NOT_FOUND' ||
    apiError.statusCode === 401 ||
    apiError.statusCode === 404 ||
    apiError.isNetworkError ||
    apiError.code === 'REQUEST_TIMEOUT'
  );
};

export async function login(payload: LoginCredentials): Promise<AuthSession> {
  const response = await apiClient.post<ApiEnvelope<TokenBundleDto>>(
    '/auth/login',
    {
      email: normalizeEmail(payload.email),
      password: payload.password,
    },
    AUTH_REFRESH_DISABLED,
  );

  return mapTokenBundle(unwrapApiResponse(response.data));
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const response = await apiClient.post<ApiEnvelope<RegisterResponse>>(
    '/auth/register',
    {
      email: normalizeEmail(payload.email),
      password: payload.password,
      displayName: normalizeDisplayName(payload.displayName),
      phone: normalizeVietnamPhone(payload.phone),
    },
    AUTH_REFRESH_DISABLED,
  );

  return unwrapApiResponse(response.data);
}

export async function verifyEmail(
  payload: VerifyEmailPayload,
): Promise<VerifyEmailResponse> {
  const response = await apiClient.post<ApiEnvelope<VerifyEmailResponse>>(
    '/auth/verify-email',
    {
      email: normalizeEmail(payload.email),
      code: payload.code,
      purpose: payload.purpose,
    },
    AUTH_REFRESH_DISABLED,
  );

  return unwrapApiResponse(response.data);
}

export async function refreshSession(_refreshToken?: string): Promise<AuthSession> {
  const refreshResult = await refreshStoredTokenBundle();

  if (!refreshResult.success) {
    throw refreshResult.error ?? new Error('Không thể làm mới phiên đăng nhập.');
  }

  const { accessToken, refreshToken, expiresInSeconds, user } = refreshResult.data;
  const mappedUser = user
    ? mapAuthUser(user as AuthUserDto)
    : await getCurrentUser();

  return {
    accessToken,
    refreshToken,
    expiresInSeconds,
    user: mappedUser,
  };
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', { refreshToken }, AUTH_REFRESH_DISABLED);
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<ApiEnvelope<AuthUserDto>>('/users/me');
  return mapAuthUser(unwrapApiResponse(response.data));
}

export async function requestPasswordReset(
  payload: PasswordResetPayload,
): Promise<PasswordResetResponse> {
  try {
    const response = await apiClient.post<ApiEnvelope<PasswordResetResponse>>(
      '/auth/forgot-password',
      { email: normalizeEmail(payload.email) },
      AUTH_REFRESH_DISABLED,
    );

    return unwrapApiResponse(response.data);
  } catch (error) {
    if (canUsePasswordResetMock(error)) {
      return mockRequestPasswordReset(payload);
    }

    throw toApiError(error);
  }
}

export async function confirmPasswordResetOtp(
  payload: ConfirmPasswordResetOtpPayload,
): Promise<ConfirmPasswordResetOtpResponse> {
  try {
    const response = await apiClient.post<ApiEnvelope<ConfirmPasswordResetOtpResponse>>(
      '/auth/confirm-password-reset-otp',
      {
        email: normalizeEmail(payload.email),
        code: payload.code,
      },
      AUTH_REFRESH_DISABLED,
    );

    return unwrapApiResponse(response.data);
  } catch (error) {
    if (canUsePasswordResetMock(error)) {
      return mockConfirmPasswordResetOtp(payload);
    }

    throw toApiError(error);
  }
}

export async function resetPassword(
  payload: ResetPasswordPayload,
): Promise<ResetPasswordResponse> {
  try {
    const response = await apiClient.post<ApiEnvelope<ResetPasswordResponse>>(
      '/auth/reset-password',
      {
        resetToken: payload.resetToken,
        newPassword: payload.newPassword,
      },
      AUTH_REFRESH_DISABLED,
    );

    return unwrapApiResponse(response.data);
  } catch (error) {
    if (canUsePasswordResetMock(error)) {
      return mockResetPassword(payload);
    }

    throw toApiError(error);
  }
}

export async function googleLogin(payload: GoogleLoginPayload): Promise<AuthSession> {
  const response = await apiClient.post<ApiEnvelope<TokenBundleDto>>(
    '/auth/google',
    payload,
    AUTH_REFRESH_DISABLED,
  );

  return mapTokenBundle(unwrapApiResponse(response.data));
}

export async function resendVerificationEmail(
  payload: ResendVerificationEmailPayload,
): Promise<ResendVerificationEmailResponse> {
  const response = await apiClient.post<ApiEnvelope<ResendVerificationEmailResponse>>(
    '/auth/resend-verification-email',
    {
      email: normalizeEmail(payload.email),
      purpose: payload.purpose,
    },
    AUTH_REFRESH_DISABLED,
  );

  return unwrapApiResponse(response.data);
}
