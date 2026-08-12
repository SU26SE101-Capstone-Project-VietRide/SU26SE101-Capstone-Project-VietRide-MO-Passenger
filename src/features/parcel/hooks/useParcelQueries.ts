import { useRef } from 'react';
import {
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { toApiError } from '@shared/api/errors';
import i18n from '@shared/i18n';
import {
  createParcel,
  getAvailableParcelTrips,
  getAvailableParcelVouchers,
  getParcelDetail,
  getReceivedParcels,
  parcelKeys,
  startParcelDepositPayment,
  startParcelFinalPayment,
} from '../api/parcelApi';
import type {
  AvailableParcelTripsParams,
  CreateParcelPayload,
  CreateParcelResult,
  GetParcelVouchersParams,
  ParcelDepositPaymentResult,
  ParcelFinalPaymentResult,
  StartParcelPaymentInput,
} from '../types';
import { isParcelPaymentPending } from '../utils/parcelPayment';
import { isParcelQuoteErrorCode } from '../utils/parcelQuote';
import {
  areParcelCreateIntentsEqual,
  areParcelPaymentIntentsEqual,
  ParcelSubmissionCoordinator,
  type IdempotentParcelSubmitter,
} from '../utils/parcelSubmissionCoordinator';

const PARCEL_TRIP_STALE_TIME_MS = 30 * 1000;
const PARCEL_VOUCHER_STALE_TIME_MS = 60 * 1000;
const PARCEL_DETAIL_STALE_TIME_MS = 30 * 1000;
const PARCEL_PAYMENT_REFETCH_INTERVAL_MS = 2_500;
const AVAILABLE_PARCEL_TRIPS_PAGE_SIZE = 20;

const shouldRetryParcelQuery = (
  failureCount: number,
  error: unknown,
): boolean =>
  !isParcelQuoteErrorCode(toApiError(error).code)
  && failureCount < 1;

function useIdempotentParcelMutation<TInput, TResult>(
  scope: string,
  submitter: IdempotentParcelSubmitter<TInput, TResult>,
  areSemanticallyEqual: (left: TInput, right: TInput) => boolean,
) {
  const coordinatorRef = useRef<ParcelSubmissionCoordinator<
    TInput,
    TResult
  > | null>(null);

  if (!coordinatorRef.current) {
    coordinatorRef.current = new ParcelSubmissionCoordinator(
      scope,
      submitter,
      areSemanticallyEqual,
    );
  }

  const mutation = useMutation({
    mutationFn: (input: TInput) => coordinatorRef.current!.submit(input),
    retry: 0,
  });

  return {
    ...mutation,
    hasRetainedAmbiguousSubmission: () =>
      coordinatorRef.current?.hasRetainedAmbiguousSubmission() ?? false,
    retryRetainedAsync: () => coordinatorRef.current!.retryRetainedAsync(),
  };
}

const getNextAvailableParcelTripsPage = (
  lastPage: Awaited<ReturnType<typeof getAvailableParcelTrips>>,
): number | undefined => (lastPage.hasNextPage ? lastPage.page + 1 : undefined);

export function useAvailableParcelTrips(
  params: AvailableParcelTripsParams | null,
  enabled = true,
) {
  const userId = useAuthStore(state => state.user?.id);
  return useInfiniteQuery({
    queryKey: params
      ? parcelKeys.availableTrips(userId ?? 'none', params)
      : [...parcelKeys.all, 'available-trips', userId ?? 'none', 'none'],
    queryFn: ({ pageParam, signal }) => {
      if (!params) {
        throw new Error(i18n.t('parcel.errors.missingTripSearchParameters'));
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
    enabled: enabled && Boolean(userId) && Boolean(params),
    staleTime: PARCEL_TRIP_STALE_TIME_MS,
    gcTime: 5 * 60 * 1000,
    retry: shouldRetryParcelQuery,
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
        throw new Error(i18n.t('parcel.errors.missingVoucherParameters'));
      }

      return getAvailableParcelVouchers(params, signal);
    },
    enabled: enabled && Boolean(userId) && Boolean(params?.tripId),
    staleTime: PARCEL_VOUCHER_STALE_TIME_MS,
    gcTime: 5 * 60 * 1000,
    retry: shouldRetryParcelQuery,
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
  return useIdempotentParcelMutation<CreateParcelPayload, CreateParcelResult>(
    'parcel-mobile',
    createParcel,
    areParcelCreateIntentsEqual,
  );
}

export function useStartParcelDepositPayment() {
  return useIdempotentParcelMutation<
    StartParcelPaymentInput,
    ParcelDepositPaymentResult
  >(
    'parcel-deposit-payment-mobile',
    startParcelDepositPayment,
    areParcelPaymentIntentsEqual,
  );
}

export function useStartParcelFinalPayment() {
  return useIdempotentParcelMutation<
    StartParcelPaymentInput,
    ParcelFinalPaymentResult
  >(
    'parcel-final-payment-mobile',
    startParcelFinalPayment,
    areParcelPaymentIntentsEqual,
  );
}
