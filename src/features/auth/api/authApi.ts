import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import {
  createIdempotencyKey,
  IdempotencyKeyTracker,
} from '@shared/api/idempotency';
import { refreshStoredTokenBundle } from '@shared/api/tokenRefresh';
import type {
  AuthSession,
  AuthUserDto,
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

const PUBLIC_AUTH_REQUEST = { skipAuthRefresh: true, skipAuth: true } as const;
const logoutIdempotency = new IdempotencyKeyTracker('auth-logout');
const publicAuthMutationRequest = (scope: string) => ({
  ...PUBLIC_AUTH_REQUEST,
  headers: { 'Idempotency-Key': createIdempotencyKey(scope) },
});

export const authKeys = {
  all: ['auth'] as const,
  me: ['auth', 'me'] as const,
};

export async function login(payload: LoginCredentials): Promise<AuthSession> {
  const response = await apiClient.post<ApiEnvelope<TokenBundleDto>>(
    '/auth/login',
    {
      email: normalizeEmail(payload.email),
      password: payload.password,
    },
    PUBLIC_AUTH_REQUEST,
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
    publicAuthMutationRequest('auth-register'),
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
    publicAuthMutationRequest('auth-verify-email'),
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

export async function logout(
  refreshToken: string,
  accessToken: string,
  sessionEpoch: number,
): Promise<void> {
  const idempotencyKey = logoutIdempotency.getOrCreate({ sessionEpoch });
  await apiClient.post(
    '/auth/logout',
    { refreshToken },
    {
      skipAuthRefresh: true,
      skipAuth: true,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Idempotency-Key': idempotencyKey,
      },
    },
  );
  logoutIdempotency.reset();
}

export async function getCurrentUser(signal?: AbortSignal): Promise<User> {
  const response = await apiClient.get<ApiEnvelope<AuthUserDto>>('/users/me', { signal });
  return mapAuthUser(unwrapApiResponse(response.data));
}

export async function requestPasswordReset(
  payload: PasswordResetPayload,
): Promise<PasswordResetResponse> {
  const response = await apiClient.post<ApiEnvelope<PasswordResetResponse>>(
    '/auth/forgot-password',
    { email: normalizeEmail(payload.email) },
    publicAuthMutationRequest('auth-forgot-password'),
  );

  return unwrapApiResponse(response.data);
}

export async function resetPassword(
  payload: ResetPasswordPayload,
): Promise<ResetPasswordResponse> {
  const response = await apiClient.post<ApiEnvelope<ResetPasswordResponse>>(
    '/auth/reset-password',
    {
      email: normalizeEmail(payload.email),
      code: payload.code,
      newPassword: payload.newPassword,
    },
    publicAuthMutationRequest('auth-reset-password'),
  );

  return unwrapApiResponse(response.data);
}

export async function googleLogin(payload: GoogleLoginPayload): Promise<AuthSession> {
  const response = await apiClient.post<ApiEnvelope<TokenBundleDto>>(
    '/auth/google',
    payload,
    PUBLIC_AUTH_REQUEST,
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
    publicAuthMutationRequest('auth-resend-verification'),
  );

  return unwrapApiResponse(response.data);
}
