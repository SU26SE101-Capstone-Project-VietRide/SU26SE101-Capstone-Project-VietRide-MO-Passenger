import { apiClient } from '@shared/api/axiosInstance';
import {
  ApiRequestError,
  unwrapApiResponse,
  type ApiEnvelope,
} from '@shared/api/errors';
import { encodeUuidPathSegment } from '@shared/utils/pathSegment';
import type { StationDetail, StationSearchResult } from '../types';

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
  detail: (stationId: string) =>
    [...stationKeys.all, 'detail', stationId] as const,
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

export async function getStation(
  stationId: string,
  signal?: AbortSignal,
): Promise<StationDetail> {
  const stationIdSegment = encodeUuidPathSegment(stationId, 'stationId');
  const path = `/stations/${stationIdSegment}`;
  const response = signal
    ? await apiClient.get<ApiEnvelope<StationDetail>>(path, { signal })
    : await apiClient.get<ApiEnvelope<StationDetail>>(path);
  const station = unwrapApiResponse(response.data);

  if (
    typeof station.id !== 'string'
    || station.id.toLowerCase() !== stationId.toLowerCase()
  ) {
    throw new ApiRequestError({
      message: 'Station data does not match the requested station.',
      code: 'INVALID_API_RESPONSE',
    });
  }

  return station;
}
