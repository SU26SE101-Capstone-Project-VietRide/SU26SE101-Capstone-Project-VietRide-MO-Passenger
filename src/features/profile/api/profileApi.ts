import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import type { AuthUserDto, User } from '@features/auth/types';
import { mapAuthUser } from '@features/auth/types';
import { normalizeVietnamPhone } from '@features/auth/validation/authValidation';

export interface CompleteProfilePayload {
  phone: string;
}

export interface CompleteProfileResponse {
  userId: string;
  phone: string;
  message: string;
}

export interface UpdateAvatarResponse {
  userId: string;
  avatarUrl: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  changedAt?: string;
}

export interface LoginSessionDto {
  id: string;
  deviceName?: string | null;
  platform?: string | null;
  ipAddress?: string | null;
  location?: string | null;
  lastActiveAt?: string | null;
  createdAt?: string | null;
  current?: boolean;
}

export interface LoginSession {
  id: string;
  deviceName: string;
  platform: string | null;
  ipAddress: string | null;
  location: string | null;
  lastActiveAt: string | null;
  createdAt: string | null;
  current: boolean;
}

const PROFILE_ENDPOINTS = {
  me: '/users/me',
  completeProfile: '/users/me/complete-profile',
  uploadAvatar: '/users/me/avatar',
  changePassword: '/auth/change-password',
  sessions: '/auth/sessions',
} as const;

const mapLoginSession = (dto: LoginSessionDto): LoginSession => ({
  id: dto.id,
  deviceName: dto.deviceName?.trim() || 'Unknown device',
  platform: dto.platform ?? null,
  ipAddress: dto.ipAddress ?? null,
  location: dto.location ?? null,
  lastActiveAt: dto.lastActiveAt ?? null,
  createdAt: dto.createdAt ?? null,
  current: Boolean(dto.current),
});

const userFromEnvelope = (data: ApiEnvelope<AuthUserDto>): User =>
  mapAuthUser(unwrapApiResponse(data));

export async function getProfile(): Promise<User> {
  const response = await apiClient.get<ApiEnvelope<AuthUserDto>>(PROFILE_ENDPOINTS.me);
  return userFromEnvelope(response.data);
}

/** The BE permits this once; callers must refresh the JWT afterwards. */
export async function completeProfile(
  payload: CompleteProfilePayload,
): Promise<CompleteProfileResponse> {
  const response = await apiClient.post<ApiEnvelope<CompleteProfileResponse>>(
    PROFILE_ENDPOINTS.completeProfile,
    { phone: normalizeVietnamPhone(payload.phone) },
  );

  return unwrapApiResponse(response.data);
}

export async function updateAvatarUrl(
  avatarUrl: string,
  idempotencyKey: string,
): Promise<UpdateAvatarResponse> {
  const normalizedAvatarUrl = avatarUrl.trim();
  if (!normalizedAvatarUrl) {
    throw new Error('Avatar URL is required.');
  }

  const response = await apiClient.patch<ApiEnvelope<UpdateAvatarResponse>>(
    PROFILE_ENDPOINTS.uploadAvatar,
    { avatarUrl: normalizedAvatarUrl },
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );

  return unwrapApiResponse(response.data);
}

export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<ChangePasswordResponse> {
  const response = await apiClient.post<ApiEnvelope<ChangePasswordResponse>>(
    PROFILE_ENDPOINTS.changePassword,
    payload,
  );

  return unwrapApiResponse(response.data);
}

export async function listLoginSessions(): Promise<LoginSession[]> {
  const response = await apiClient.get<ApiEnvelope<LoginSessionDto[]>>(
    PROFILE_ENDPOINTS.sessions,
  );

  return unwrapApiResponse(response.data).map(mapLoginSession);
}
