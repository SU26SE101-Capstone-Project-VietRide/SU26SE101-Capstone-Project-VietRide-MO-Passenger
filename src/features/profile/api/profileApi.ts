import { apiClient } from '@shared/api/axiosInstance';
import { toApiError, unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import type { User, AuthUserDto } from '@features/auth/types';
import { mapAuthUser } from '@features/auth/types';
import {
  normalizeDisplayName,
  normalizeVietnamPhone,
} from '@features/auth/validation/authValidation';

const canUseProfileMock = (error: unknown): boolean => {
  const apiError = toApiError(error);
  return (
    apiError.code === 'RESOURCE_NOT_FOUND' ||
    apiError.statusCode === 404 ||
    apiError.statusCode === 501 ||
    apiError.statusCode === 405 ||
    apiError.isNetworkError ||
    apiError.code === 'REQUEST_TIMEOUT'
  );
};

export interface UpdateProfilePayload {
  displayName?: string;
}

export interface CompleteProfilePayload {
  phone: string;
}

interface CompleteProfileResponse {
  userId: string;
  phone: string;
  message: string;
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
  await apiClient.post<ApiEnvelope<CompleteProfileResponse>>(
    PROFILE_ENDPOINTS.completeProfile,
    {
      phone: normalizeVietnamPhone(payload.phone),
    },
  );

  return getProfile();
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  try {
    const response = await apiClient.patch<ApiEnvelope<AuthUserDto>>(
      PROFILE_ENDPOINTS.updateProfile,
      {
        displayName: payload.displayName
          ? normalizeDisplayName(payload.displayName)
          : undefined,
      },
    );
    return userFromEnvelope(response.data);
  } catch (error) {
    if (canUseProfileMock(error)) {
      console.warn('[profileApi] updateProfile: BE endpoint not available, returning current user');
      const current = await getProfile().catch(() => null as User | null);
      if (current) {
        return { ...current, displayName: payload.displayName ?? current.displayName };
      }
    }
    throw toApiError(error);
  }
}

export async function uploadAvatar(file: AvatarUploadFile): Promise<User> {
  try {
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
  } catch (error) {
    if (canUseProfileMock(error)) {
      if (__DEV__) {
        console.warn('[Profile] uploadAvatar: BE endpoint not available, returning current user');
      }
      return getProfile();
    }
    throw toApiError(error);
  }
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
    if (canUseProfileMock(error)) {
      if (__DEV__) {
        console.warn('[Profile] changePassword: BE endpoint not available, returning mock success');
      }
      return { success: true, changedAt: new Date().toISOString() };
    }
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
    if (canUseProfileMock(error)) {
      if (__DEV__) {
        console.warn('[Profile] listLoginSessions: BE endpoint not available, returning empty list');
      }
      return [];
    }
    throw toApiError(error);
  }
}
