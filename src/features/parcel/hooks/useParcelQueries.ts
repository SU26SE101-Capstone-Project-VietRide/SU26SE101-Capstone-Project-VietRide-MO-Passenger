import { useRef } from 'react';
import {
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { ApiRequestError, toApiError } from '@shared/api/errors';
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

const PARCEL_TRIP_STALE_TIME_MS = 30 * 1000;
const PARCEL_VOUCHER_STALE_TIME_MS = 60 * 1000;
const PARCEL_DETAIL_STALE_TIME_MS = 30 * 1000;
const PARCEL_PAYMENT_REFETCH_INTERVAL_MS = 2_500;
const AVAILABLE_PARCEL_TRIPS_PAGE_SIZE = 20;

type IdempotentParcelSubmitter<TInput, TResult> = (
  input: TInput,
  idempotencyKey: string,
) => Promise<TResult>;

interface InFlightParcelSubmission<TResult> {
  sessionEpoch: number;
  promise: Promise<TResult>;
}

const isAmbiguousParcelSubmissionError = (error: unknown): boolean => {
  const apiError = toApiError(error);
  const statusCode = apiError.statusCode;

  return (
    apiError.isNetworkError ||
    apiError.code === 'SESSION_INVALIDATED' ||
    statusCode === undefined ||
    statusCode === 408 ||
    statusCode === 429 ||
    statusCode >= 500
  );
};

/**
 * Owns one idempotency key and single-flight promise per parcel command.
 * Ambiguous failures retain their key so a timeout can be retried safely.
 * Confirmed success and definitive 4xx rejection release the key.
 */
class ParcelSubmissionCoordinator<TInput, TResult> {
  private readonly tracker: IdempotencyKeyTracker;
  private inFlight: InFlightParcelSubmission<TResult> | null = null;

  constructor(
    scope: string,
    private readonly submitter: IdempotentParcelSubmitter<TInput, TResult>,
  ) {
    this.tracker = new IdempotencyKeyTracker(scope);
  }

  submit(input: TInput): Promise<TResult> {
    const sessionEpoch = getTokenSessionEpoch();
    if (this.inFlight?.sessionEpoch === sessionEpoch) {
      return this.inFlight.promise;
    }

    const idempotencyKey = this.tracker.getOrCreate({
      sessionEpoch,
      input,
    });
    const submission = (async (): Promise<TResult> => {
      const result = await this.submitter(input, idempotencyKey);

      if (!isTokenSessionEpochCurrent(sessionEpoch)) {
        throw new ApiRequestError({
          message: 'Phiên đăng nhập đã thay đổi.',
          code: 'SESSION_INVALIDATED',
        });
      }

      return result;
    })();
    const activeSubmission = { sessionEpoch, promise: submission };
    this.inFlight = activeSubmission;

    submission.then(
      () => {
        if (this.inFlight === activeSubmission) {
          this.inFlight = null;
          this.tracker.reset();
        }
      },
      (error: unknown) => {
        if (this.inFlight === activeSubmission) {
          this.inFlight = null;
          if (!isAmbiguousParcelSubmissionError(error)) {
            this.tracker.reset();
          }
        }
      },
    );

    return submission;
  }
}

function useIdempotentParcelMutation<TInput, TResult>(
  scope: string,
  submitter: IdempotentParcelSubmitter<TInput, TResult>,
) {
  const coordinatorRef = useRef<ParcelSubmissionCoordinator<
    TInput,
    TResult
  > | null>(null);

  if (!coordinatorRef.current) {
    coordinatorRef.current = new ParcelSubmissionCoordinator(scope, submitter);
  }

  return useMutation({
    mutationFn: (input: TInput) => coordinatorRef.current!.submit(input),
    retry: 0,
  });
}

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
  return useIdempotentParcelMutation<CreateParcelPayload, CreateParcelResult>(
    'parcel-mobile',
    createParcel,
  );
}

export function useStartParcelDepositPayment() {
  return useIdempotentParcelMutation<
    StartParcelPaymentInput,
    ParcelDepositPaymentResult
  >('parcel-deposit-payment-mobile', startParcelDepositPayment);
}

export function useStartParcelFinalPayment() {
  return useIdempotentParcelMutation<
    StartParcelPaymentInput,
    ParcelFinalPaymentResult
  >('parcel-final-payment-mobile', startParcelFinalPayment);
}
