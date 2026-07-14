import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import type { Location } from '../types/location';

export const locationKeys = {
  all: ['locations'] as const,
  catalog: () => [...locationKeys.all, 'catalog'] as const,
};

export async function getLocations(signal?: AbortSignal): Promise<Location[]> {
  const response = signal
    ? await apiClient.get<ApiEnvelope<Location[]>>('/locations', { signal })
    : await apiClient.get<ApiEnvelope<Location[]>>('/locations');
  return unwrapApiResponse(response.data);
}
