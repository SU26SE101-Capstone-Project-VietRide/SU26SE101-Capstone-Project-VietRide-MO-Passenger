import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import { encodeUuidPathSegment } from '@shared/utils/pathSegment';
import {
  type BusTrip,
  type SeatRow,
  type TripDetail,
  type TripSearchParams,
  type TripSearchDto,
  type TripDetailDto,
  type SeatDto,
  mapBusTrip,
  mapTripDetail,
  mapSeatMap,
} from '../types';

export const tripKeys = {
  all: ['trips'] as const,
  search: (params: TripSearchParams) => [...tripKeys.all, 'search', params] as const,
  detail: (tripId: string) => [...tripKeys.all, tripId, 'detail'] as const,
  seats: (tripId: string) => [...tripKeys.all, tripId, 'seats'] as const,
};

/** Serialize only non-empty preferred BE SearchTripsQuery fields. */
export function toTripSearchQuery(
  params: TripSearchParams,
): Record<string, string | number | boolean> {
  const q: Record<string, string | number | boolean> = {
    departureDate: params.departureDate,
    passengerCount: params.passengerCount,
  };

  const set = (key: keyof TripSearchParams, value: string | number | boolean | undefined) => {
    if (value === undefined || value === '') return;
    q[key] = value;
  };

  set('originStationId', params.originStationId?.trim());
  set('destinationStationId', params.destinationStationId?.trim());
  set('originProvinceCode', params.originProvinceCode?.trim());
  set('destinationProvinceCode', params.destinationProvinceCode?.trim());
  set('originLocationCode', params.originLocationCode?.trim());
  set('destinationLocationCode', params.destinationLocationCode?.trim());
  if (params.allowAlongRoutePickup !== undefined) {
    q.allowAlongRoutePickup = params.allowAlongRoutePickup;
  }

  return q;
}

export async function searchTrips(
  params: TripSearchParams,
  signal?: AbortSignal,
): Promise<BusTrip[]> {
  const response = await apiClient.get<ApiEnvelope<{
    items: TripSearchDto[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }>>('/trips/search', {
    params: toTripSearchQuery(params),
    ...(signal ? { signal } : {}),
  });

  return unwrapApiResponse(response.data).items.map(mapBusTrip);
}

export async function getTripDetail(
  tripId: string,
  signal?: AbortSignal,
): Promise<TripDetail> {
  const tripIdSegment = encodeUuidPathSegment(tripId, 'tripId');
  const path = `/trips/${tripIdSegment}`;
  const response = signal
    ? await apiClient.get<ApiEnvelope<TripDetailDto>>(path, { signal })
    : await apiClient.get<ApiEnvelope<TripDetailDto>>(path);
  return mapTripDetail(unwrapApiResponse(response.data));
}

export async function getSeatMap(
  tripId: string,
  signal?: AbortSignal,
): Promise<SeatRow[]> {
  const tripIdSegment = encodeUuidPathSegment(tripId, 'tripId');
  const path = `/trips/${tripIdSegment}/seat-map`;
  const response = signal
    ? await apiClient.get<ApiEnvelope<{ tripId: string; vehicleType: string; seats: SeatDto[] }>>(path, { signal })
    : await apiClient.get<ApiEnvelope<{ tripId: string; vehicleType: string; seats: SeatDto[] }>>(path);
  return mapSeatMap(unwrapApiResponse(response.data).seats);
}
