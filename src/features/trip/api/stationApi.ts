import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import type { LocationType } from '@features/location/types/location';
import type { StationSearchResult } from '../types';

export const stationKeys = {
  all: ['stations'] as const,
  search: (q: string, locationName: string, locationType: LocationType) =>
    [...stationKeys.all, 'search', q, locationName, locationType] as const,
};

export async function searchStations(
  q: string,
  locationName: string,
  locationType: LocationType,
): Promise<StationSearchResult[]> {
  const response = await apiClient.get<ApiEnvelope<StationSearchResult[]>>(
    '/stations/search',
    {
      params: {
        q: q.trim(),
        ...(locationType === 'MUNICIPALITY'
          ? { city: locationName.trim() }
          : { province: locationName.trim() }),
      },
    },
  );

  return unwrapApiResponse(response.data);
}
