import { useRef } from 'react';
import {
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { ApiRequestError } from '@shared/api/errors';
import { IdempotencyKeyTracker } from '@shared/api/idempotency';
import {
  getTokenSessionEpoch,
  isTokenSessionEpochCurrent,
} from '@shared/utils/storage';
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
  CreateParcelResult,
  GetParcelVouchersParams,
} from '../types';
import { isParcelPaymentPending } from '../utils/parcelPayment';

const PARCEL_TRIP_STALE_TIME_MS = 30 * 1000;
const PARCEL_VOUCHER_STALE_TIME_MS = 60 * 1000;
const PARCEL_DETAIL_STALE_TIME_MS = 30 * 1000;
const PARCEL_PAYMENT_REFETCH_INTERVAL_MS = 2_500;
const AVAILABLE_PARCEL_TRIPS_PAGE_SIZE = 20;

const getNextAvailableParcelTripsPage = (
  lastPage: Awaited<ReturnType<typeof getAvailableParcelTrips>>,
): number | undefined => (lastPage.hasNextPage ? lastPage.page + 1 : undefined);

export function useAvailableParcelTrips(
  params: AvailableParcelTripsParams | null,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: params
      ? parcelKeys.availableTrips(params)
      : [...parcelKeys.all, 'available-trips', 'none'],
    queryFn: ({ pageParam, signal }) => {
      if (!params) {
        throw new Error('Missing parcel trip search parameters.');
      }

      return getAvailableParcelTrips(
        {
          ...params,
          page: pageParam,
          pageSize: params.pageSize ?? AVAILABLE_PARCEL_TRIPS_PAGE_SIZE,
        },
        signal,
      );
    },
    initialPageParam: 1,
    getNextPageParam: getNextAvailableParcelTripsPage,
    enabled: enabled && Boolean(params),
    staleTime: PARCEL_TRIP_STALE_TIME_MS,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useAvailableParcelVouchers(
  params: GetParcelVouchersParams | null,
  enabled = true,
) {
  const userId = useAuthStore(state => state.user?.id);
  return useQuery({
    queryKey: params
      ? parcelKeys.vouchers(userId ?? 'none', params)
      : [...parcelKeys.all, userId ?? 'none', 'vouchers', 'none'],
    queryFn: ({ signal }) => {
      if (!params) {
        throw new Error('Missing parcel voucher parameters.');
      }

      return getAvailableParcelVouchers(params, signal);
    },
    enabled: enabled && Boolean(userId) && Boolean(params?.tripId),
    staleTime: PARCEL_VOUCHER_STALE_TIME_MS,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export const parcelDetailQueryOptions = (
  userId: string | undefined,
  parcelId: string,
) =>
  queryOptions({
    queryKey: parcelKeys.detail(userId ?? 'none', parcelId),
    queryFn: ({ signal }) => getParcelDetail(parcelId, signal),
    enabled: Boolean(userId && parcelId),
    staleTime: PARCEL_DETAIL_STALE_TIME_MS,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

export function useParcelDetail(parcelId: string, reconcilePayment = false) {
  const userId = useAuthStore(state => state.user?.id);
  return useQuery({
    ...parcelDetailQueryOptions(userId, parcelId),
    refetchInterval: query =>
      reconcilePayment && isParcelPaymentPending(query.state.data?.status)
        ? PARCEL_PAYMENT_REFETCH_INTERVAL_MS
        : false,
    refetchIntervalInBackground: false,
  });
}

export function useReceivedParcels(page = 1, pageSize = 20) {
  const userId = useAuthStore(state => state.user?.id);

  return useQuery({
    queryKey: parcelKeys.received(userId ?? 'none', page, pageSize),
    queryFn: ({ signal }) => getReceivedParcels(page, pageSize, signal),
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useCreateParcel() {
  const trackerRef = useRef<IdempotencyKeyTracker | null>(null);
  const inFlightRef = useRef<Promise<CreateParcelResult> | null>(null);
  if (!trackerRef.current) {
    trackerRef.current = new IdempotencyKeyTracker('parcel-mobile');
  }

  return useMutation({
    mutationFn: (payload: CreateParcelPayload) => {
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      const submission = (async (): Promise<CreateParcelResult> => {
        const sessionEpoch = getTokenSessionEpoch();
        const idempotencyKey = trackerRef.current!.getOrCreate(payload);
        const result = await createParcel(payload, idempotencyKey);

        if (!isTokenSessionEpochCurrent(sessionEpoch)) {
          throw new ApiRequestError({
            message: 'Phiên đăng nhập đã thay đổi.',
            code: 'SESSION_INVALIDATED',
          });
        }

        return result;
      })();

      inFlightRef.current = submission;
      submission.then(
        () => {
          if (inFlightRef.current === submission) {
            inFlightRef.current = null;
            trackerRef.current?.reset();
          }
        },
        () => {
          if (inFlightRef.current === submission) {
            inFlightRef.current = null;
          }
        },
      );
      return submission;
    },
    retry: 0,
  });
}
