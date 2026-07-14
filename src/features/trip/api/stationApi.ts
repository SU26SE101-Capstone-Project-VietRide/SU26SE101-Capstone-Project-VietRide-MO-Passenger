import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import type { StationSearchResult } from '../types';

type StationSearchPayload =
  | StationSearchResult[]
  | {
      items?: StationSearchResult[];
      data?: StationSearchResult[];
    };

export const stationKeys = {
  all: ['stations'] as const,
  search: (locationId: string) =>
    [...stationKeys.all, 'search', locationId] as const,
};

const normalizeStationSearchResult = (
  payload: StationSearchPayload,
): StationSearchResult[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
};

export async function searchStations(
  locationId: string,
  signal?: AbortSignal,
): Promise<StationSearchResult[]> {
  const response = await apiClient.get<ApiEnvelope<StationSearchPayload>>(
    '/stations/search',
    {
      params: {
        locationId: locationId.trim(),
      },
      ...(signal ? { signal } : {}),
    },
  );

  return normalizeStationSearchResult(unwrapApiResponse(response.data));
}
