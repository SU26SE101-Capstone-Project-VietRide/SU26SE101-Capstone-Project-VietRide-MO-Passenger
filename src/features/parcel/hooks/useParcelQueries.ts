import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import {
  createParcel,
  getAvailableParcelTrips,
  getAvailableParcelVouchers,
  getParcelDetail,
  getReceivedParcels,
  parcelKeys,
} from '../api/parcelApi';
import type {
  AvailableParcelTripsParams,
  CreateParcelPayload,
  GetParcelVouchersParams,
} from '../types';

const PARCEL_TRIP_STALE_TIME_MS = 30 * 1000;
const PARCEL_VOUCHER_STALE_TIME_MS = 60 * 1000;
const PARCEL_DETAIL_STALE_TIME_MS = 30 * 1000;

export function useAvailableParcelTrips(
  params: AvailableParcelTripsParams | null,
  enabled = true,
) {
  return useQuery({
    queryKey: params ? parcelKeys.availableTrips(params) : [...parcelKeys.all, 'available-trips', 'none'],
    queryFn: () => {
      if (!params) {
        throw new Error('Missing parcel trip search parameters.');
      }

      return getAvailableParcelTrips(params);
    },
    enabled: enabled && Boolean(params),
    staleTime: PARCEL_TRIP_STALE_TIME_MS,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    networkMode: 'offlineFirst',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useAvailableParcelVouchers(
  params: GetParcelVouchersParams | null,
  enabled = true,
) {
  return useQuery({
    queryKey: params ? parcelKeys.vouchers(params) : [...parcelKeys.all, 'vouchers', 'none'],
    queryFn: () => {
      if (!params) {
        throw new Error('Missing parcel voucher parameters.');
      }

      return getAvailableParcelVouchers(params);
    },
    enabled: enabled && Boolean(params?.tripId),
    staleTime: PARCEL_VOUCHER_STALE_TIME_MS,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    networkMode: 'offlineFirst',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export const parcelDetailQueryOptions = (parcelId: string) =>
  queryOptions({
    queryKey: parcelKeys.detail(parcelId),
    queryFn: () => getParcelDetail(parcelId),
    enabled: Boolean(parcelId),
    staleTime: PARCEL_DETAIL_STALE_TIME_MS,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    networkMode: 'offlineFirst',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

export function useParcelDetail(parcelId: string) {
  return useQuery(parcelDetailQueryOptions(parcelId));
}

export function useReceivedParcels(page = 1, pageSize = 20) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: user ? parcelKeys.received(page, pageSize) : [...parcelKeys.all, 'received', 'none'],
    queryFn: () => getReceivedParcels(page, pageSize),
    enabled: Boolean(user),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    networkMode: 'offlineFirst',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useCreateParcel() {
  return useMutation({
    mutationFn: (payload: CreateParcelPayload) => createParcel(payload),
    retry: 0,
  });
}
