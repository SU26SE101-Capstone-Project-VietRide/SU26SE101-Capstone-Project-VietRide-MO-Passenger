import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import type { StationSearchResult } from '../types';

export const stationKeys = {
  all: ['stations'] as const,
  search: (locationId: string) =>
    [...stationKeys.all, 'search', locationId] as const,
};

export async function searchStations(
  locationId: string,
): Promise<StationSearchResult[]> {
  const response = await apiClient.get<ApiEnvelope<StationSearchResult[]>>(
    '/stations/search',
    {
      params: {
        locationId: locationId.trim(),
      },
    },
  );

  return unwrapApiResponse(response.data);
}
