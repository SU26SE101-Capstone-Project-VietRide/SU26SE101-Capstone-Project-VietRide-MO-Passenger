import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import type { Location } from '../types/location';

export const locationKeys = {
  all: ['locations'] as const,
  catalog: () => [...locationKeys.all, 'catalog'] as const,
};

export async function getLocations(): Promise<Location[]> {
  const response = await apiClient.get<ApiEnvelope<Location[]>>('/locations');
  return unwrapApiResponse(response.data);
}
