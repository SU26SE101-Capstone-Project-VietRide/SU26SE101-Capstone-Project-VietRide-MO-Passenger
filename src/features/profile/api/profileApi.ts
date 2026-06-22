import { apiClient } from '@shared/api/axiosInstance';
import { toApiError, unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import type { User, AuthUserDto } from '@features/auth/types';
import { mapAuthUser } from '@features/auth/types';
import {
  normalizeDisplayName,
  normalizeVietnamPhone,
} from '@features/auth/validation/authValidation';

export interface UpdateProfilePayload {
  displayName?: string;
}

export interface CompleteProfilePayload {
  phone: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface AvatarUploadFile {
  uri: string;
  name: string;
  type: string;
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
  updateProfile: '/users/me',
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

export async function completeProfile(payload: CompleteProfilePayload): Promise<User> {
  const response = await apiClient.post<ApiEnvelope<AuthUserDto>>(
    PROFILE_ENDPOINTS.completeProfile,
    {
      phone: normalizeVietnamPhone(payload.phone),
    },
  );

  return userFromEnvelope(response.data);
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  const response = await apiClient.patch<ApiEnvelope<AuthUserDto>>(
    PROFILE_ENDPOINTS.updateProfile,
    {
      displayName: payload.displayName ? normalizeDisplayName(payload.displayName) : undefined,
    },
  );

  return userFromEnvelope(response.data);
}

export async function uploadAvatar(file: AvatarUploadFile): Promise<User> {
  const formData = new FormData();

  formData.append(
    'avatar',
    {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob,
  );

  const response = await apiClient.post<ApiEnvelope<AuthUserDto>>(
    PROFILE_ENDPOINTS.uploadAvatar,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return userFromEnvelope(response.data);
}

export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<ChangePasswordResponse> {
  try {
    const response = await apiClient.post<ApiEnvelope<ChangePasswordResponse>>(
      PROFILE_ENDPOINTS.changePassword,
      payload,
    );

    return unwrapApiResponse(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function listLoginSessions(): Promise<LoginSession[]> {
  try {
    const response = await apiClient.get<ApiEnvelope<LoginSessionDto[]>>(
      PROFILE_ENDPOINTS.sessions,
    );

    return unwrapApiResponse(response.data).map(mapLoginSession);
  } catch (error) {
    throw toApiError(error);
  }
}
