import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
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

export async function searchTrips(params: TripSearchParams): Promise<BusTrip[]> {
  const response = await apiClient.get<ApiEnvelope<{
    items: TripSearchDto[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }>>('/trips/search', {
    params,
  });

  return unwrapApiResponse(response.data).items.map(mapBusTrip);
}

export async function getTripDetail(tripId: string): Promise<TripDetail> {
  const response = await apiClient.get<ApiEnvelope<TripDetailDto>>(`/trips/${tripId}`);
  return mapTripDetail(unwrapApiResponse(response.data));
}

export async function getSeatMap(tripId: string): Promise<SeatRow[]> {
  const response = await apiClient.get<ApiEnvelope<{ tripId: string; vehicleType: string; seats: SeatDto[] }>>(`/trips/${tripId}/seat-map`);
  return mapSeatMap(unwrapApiResponse(response.data).seats);
}
