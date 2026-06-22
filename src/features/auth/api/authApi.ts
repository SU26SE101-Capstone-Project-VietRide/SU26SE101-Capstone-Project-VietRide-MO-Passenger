import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import type {
  AuthSession,
  AuthUserDto,
  GoogleLoginPayload,
  LoginCredentials,
  PasswordResetPayload,
  PasswordResetResponse,
  RegisterPayload,
  RegisterResponse,
  TokenBundleDto,
  VerifyEmailPayload,
  VerifyEmailResponse,
} from '../types';
import { mapAuthUser, mapTokenBundle, type User } from '../types';

const AUTH_REFRESH_DISABLED = { skipAuthRefresh: true } as const;

export const authKeys = {
  all: ['auth'] as const,
  me: ['auth', 'me'] as const,
};

export async function login(payload: LoginCredentials): Promise<AuthSession> {
  const response = await apiClient.post<ApiEnvelope<TokenBundleDto>>(
    '/auth/login',
    {
      email: payload.email.trim().toLowerCase(),
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
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      displayName: payload.displayName.trim(),
      phone: payload.phone.trim(),
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
      email: payload.email.trim().toLowerCase(),
      code: payload.code,
      purpose: payload.purpose,
    },
    AUTH_REFRESH_DISABLED,
  );

  return unwrapApiResponse(response.data);
}

export async function refreshSession(refreshToken: string): Promise<AuthSession> {
  const response = await apiClient.post<ApiEnvelope<TokenBundleDto>>(
    '/auth/refresh',
    { refreshToken },
    AUTH_REFRESH_DISABLED,
  );

  return mapTokenBundle(unwrapApiResponse(response.data));
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
  const response = await apiClient.post<ApiEnvelope<PasswordResetResponse>>(
    '/auth/forgot-password',
    { emailOrPhone: payload.emailOrPhone.trim() },
    AUTH_REFRESH_DISABLED,
  );

  return unwrapApiResponse(response.data);
}

export async function googleLogin(payload: GoogleLoginPayload): Promise<AuthSession> {
  const response = await apiClient.post<ApiEnvelope<TokenBundleDto>>(
    '/auth/google',
    payload,
    AUTH_REFRESH_DISABLED,
  );

  return mapTokenBundle(unwrapApiResponse(response.data));
}
