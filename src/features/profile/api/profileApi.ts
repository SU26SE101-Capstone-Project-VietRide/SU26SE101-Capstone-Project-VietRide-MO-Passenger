import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import type { User, AuthUserDto } from '@features/auth/types';
import { mapAuthUser } from '@features/auth/types';
import {
  normalizeDisplayName,
  normalizeVietnamPhone,
} from '@features/auth/validation/authValidation';
import {
  AvatarValidationError,
  validateAvatarAsset,
  type AvatarUploadFile,
} from '../validation/avatarUploadValidation';

export type { AvatarUploadFile } from '../validation/avatarUploadValidation';

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

  const updatedUser = await getProfile();
  return updatedUser;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  const response = await apiClient.patch<ApiEnvelope<AuthUserDto>>(
    PROFILE_ENDPOINTS.updateProfile,
    {
      displayName: payload.displayName
        ? normalizeDisplayName(payload.displayName)
        : undefined,
    },
  );

  return userFromEnvelope(response.data);
}

export async function uploadAvatar(file: AvatarUploadFile): Promise<User> {
  // Keep validation at the API boundary too so future callers cannot bypass
  // the picker-level checks. The server remains responsible for byte sniffing.
  const validation = validateAvatarAsset({
    uri: file.uri,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    width: file.width,
    height: file.height,
    type: 'image',
  });

  if (!validation.success) {
    throw new AvatarValidationError(validation.code, validation.message);
  }

  const safeFile = validation.file;
  const formData = new FormData();

  formData.append(
    'avatar',
    {
      uri: safeFile.uri,
      name: safeFile.name,
      type: safeFile.type,
    } as unknown as Blob,
  );

  // Let Axios/native networking provide the multipart boundary.
  const response = await apiClient.post<ApiEnvelope<AuthUserDto>>(
    PROFILE_ENDPOINTS.uploadAvatar,
    formData,
  );

  return userFromEnvelope(response.data);
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
