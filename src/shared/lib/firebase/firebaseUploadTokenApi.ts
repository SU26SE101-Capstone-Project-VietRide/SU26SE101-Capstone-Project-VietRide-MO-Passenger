import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';

export type FirebaseUploadPurpose = 'USER_AVATAR' | 'PARCEL_PHOTO';

export interface FirebaseCustomTokenRequest {
  purpose: FirebaseUploadPurpose;
  // Có thể thêm parcelId trong tương lai nếu BE yêu cầu
}

export interface FirebaseCustomTokenResponse {
  token: string;
  purpose: FirebaseUploadPurpose;
  /** A server-authorized storage prefix, not a complete object path. */
  uploadPath: string;
}

const FIREBASE_ENDPOINTS = {
  customToken: '/firebase/custom-token',
} as const;

export async function getFirebaseCustomToken(
  payload: FirebaseCustomTokenRequest,
): Promise<FirebaseCustomTokenResponse> {
  const response = await apiClient.post<ApiEnvelope<FirebaseCustomTokenResponse>>(
    FIREBASE_ENDPOINTS.customToken,
    payload,
  );
  return unwrapApiResponse(response.data);
}
