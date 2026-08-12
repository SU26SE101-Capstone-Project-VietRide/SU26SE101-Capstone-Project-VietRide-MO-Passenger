import { apiClient } from '@shared/api/axiosInstance';
import {
  ApiRequestError,
  unwrapApiResponse,
  type ApiEnvelope,
} from '@shared/api/errors';
import { encodeUuidPathSegment } from '@shared/utils/pathSegment';
import type { StationDetail, StationSearchResult } from '../types';

/**
 * Exact = single locationId (Booking).
 * Hierarchy = locationScopeCode (Parcel root/leaf expansion on BE).
 * Never send both params on the wire.
 */
export type StationSearchScope =
  | { mode: 'exact'; locationId: string }
  | { mode: 'hierarchy'; locationScopeCode: string };

export const normalizeStationSearchScope = (
  scope: StationSearchScope,
): StationSearchScope => {
  if (scope.mode === 'exact') {
    return { mode: 'exact', locationId: scope.locationId.trim() };
  }
  return {
    mode: 'hierarchy',
    locationScopeCode: scope.locationScopeCode.trim(),
  };
};

export const stationKeys = {
  all: ['stations'] as const,
  search: (scope: StationSearchScope) => {
    const normalized = normalizeStationSearchScope(scope);
    if (normalized.mode === 'exact') {
      return [
        ...stationKeys.all,
        'search',
        'exact',
        normalized.locationId,
      ] as const;
    }
    return [
      ...stationKeys.all,
      'search',
      'hierarchy',
      normalized.locationScopeCode,
    ] as const;
  },
  detail: (stationId: string) =>
    [...stationKeys.all, 'detail', stationId] as const,
};

const normalizeStationSearchResult = (
  payload: unknown,
): StationSearchResult[] => {
  if (!Array.isArray(payload)) {
    throw new ApiRequestError({
      message: 'Station search returned an invalid response.',
      code: 'INVALID_API_RESPONSE',
    });
  }

  return payload as StationSearchResult[];
};

export async function searchStations(
  scope: StationSearchScope,
  signal?: AbortSignal,
): Promise<StationSearchResult[]> {
  const normalized = normalizeStationSearchScope(scope);
  if (normalized.mode === 'exact' && !normalized.locationId) {
    throw new ApiRequestError({
      message: 'locationId is required for exact station search.',
      code: 'VALIDATION_ERROR',
    });
  }
  if (normalized.mode === 'hierarchy' && !normalized.locationScopeCode) {
    throw new ApiRequestError({
      message: 'locationScopeCode is required for hierarchy station search.',
      code: 'VALIDATION_ERROR',
    });
  }

  const params =
    normalized.mode === 'exact'
      ? { locationId: normalized.locationId }
      : { locationScopeCode: normalized.locationScopeCode };

  const response = await apiClient.get<ApiEnvelope<unknown>>(
    '/stations/search',
    {
      params,
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
