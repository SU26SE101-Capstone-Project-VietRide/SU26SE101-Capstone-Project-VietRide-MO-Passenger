import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import { ApiRequestError, getLocalizedApiErrorMessage } from '@shared/api/errors';
import { useIsAppActive, useNetworkStatus } from '@shared/hooks';
import { addVnPaySdkPaymentBackListener } from '@shared/payments';
import { bookingKeys, getBookingStatus } from '../api/bookingApi';
import {
  bookingHistoryKeys,
  getRecentBookingHistoryItemsByIds,
} from '../api/bookingHistoryApi';
import type { PassengerTicketHistoryItem } from '@features/profile/types';
import type {
  BookingResult,
  BookingStatus,
  BookingStatusResult,
  RoundTripResult,
} from '../types';
import {
  getBookingIds,
  isRetryableBookingStatusError,
  pollBookingPayment,
  reconcilePassengerHistoryBookingStatus,
  resolveBookingPayment,
} from '../utils/bookingPayment';
import {
  updateBookingHistoryTicketCaches,
  upsertBookingHistoryTicketEverywhere,
} from '../utils/bookingHistoryCache';

const BOOKING_STATUS_GC_TIME_MS = 10 * 60 * 1000;
const BOOKING_STATUS_STEADY_POLL_MS = 5_000;
const EMPTY_BOOKING_STATUSES: readonly BookingStatusResult[] = [];
const EMPTY_HISTORY_ITEMS: readonly PassengerTicketHistoryItem[] = [];
const BOOKING_PAYMENT_ERROR_KEYS: Readonly<Record<string, string>> = {
  BOOKING_STATUS_CONTRACT_MISMATCH: 'booking.paymentStatus.contractMismatch',
  BOOKING_STATUS_UNAVAILABLE: 'booking.paymentStatus.unavailable',
};

export interface BookingPaymentReconciliationState {
  phase: 'idle' | 'pending' | 'confirmed' | 'expired' | 'inactive' | 'unavailable';
  terminalStatus?: BookingStatus;
  statuses: readonly BookingStatusResult[];
  freshHistoryItems: readonly PassengerTicketHistoryItem[];
  isChecking: boolean;
  isOnline: boolean;
  errorMessage?: string;
  checkNow: () => Promise<void>;
}

interface BookingPaymentReconciliationTarget {
  bookingIds: readonly string[];
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | null;
}

function useBookingStatusReconciliation({
  bookingIds,
  status,
}: BookingPaymentReconciliationTarget): BookingPaymentReconciliationState {
  const { t } = useTranslation();
  const userId = useAuthStore((state) => state.user?.id);
  const isFocused = useIsFocused();
  const isOnline = useNetworkStatus();
  const isAppActive = useIsAppActive();
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => bookingKeys.paymentStatus(userId ?? 'none', bookingIds),
    [bookingIds, userId],
  );
  const [isChecking, setIsChecking] = useState(false);
  const runGenerationRef = useRef(0);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);

  const statusQuery = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const statuses = await Promise.all(
        bookingIds.map((bookingId) => getBookingStatus(bookingId, signal)),
      );

      statuses.forEach((returnedStatus, index) => {
        if (returnedStatus.bookingId.toLowerCase() !== bookingIds[index]?.toLowerCase()) {
          throw new ApiRequestError({
            message: 'Máy chủ trả về trạng thái của một booking khác.',
            code: 'BOOKING_STATUS_CONTRACT_MISMATCH',
          });
        }
      });

      return statuses;
    },
    enabled: false,
    staleTime: 0,
    gcTime: BOOKING_STATUS_GC_TIME_MS,
    retry: 0,
  });
  const refetchStatus = statusQuery.refetch;

  useEffect(() => {
    if (!userId || !statusQuery.data) return;
    statusQuery.data.forEach(statusResult => {
      // A confirmed payment must be replaced by the full BE history DTO below.
      // Do not stamp a synthetic CONFIRMED state into the shared detail cache
      // before that authoritative request finishes.
      if (statusResult.status === 'CONFIRMED') return;
      updateBookingHistoryTicketCaches(
        queryClient,
        userId,
        statusResult.bookingId,
        item => reconcilePassengerHistoryBookingStatus(item, statusResult),
      );
    });
  }, [queryClient, statusQuery.data, userId]);

  const resolution = useMemo(() => {
    if (!status) return { phase: 'idle' as const };
    if (status === 'CONFIRMED') return { phase: 'confirmed' as const };
    if (statusQuery.error && !isRetryableBookingStatusError(statusQuery.error)) {
      return { phase: 'unavailable' as const };
    }
    return resolveBookingPayment(statusQuery.data ?? []);
  }, [status, statusQuery.data, statusQuery.error]);

  const freshHistoryQuery = useQuery({
    queryKey: bookingHistoryKeys.paymentRefresh(userId ?? 'none', bookingIds),
    queryFn: ({ signal }) => getRecentBookingHistoryItemsByIds(bookingIds, signal),
    enabled: Boolean(
      userId
      && bookingIds.length > 0
      && resolution.phase === 'confirmed',
    ),
    staleTime: 5_000,
    gcTime: BOOKING_STATUS_GC_TIME_MS,
    retry: 1,
  });

  useEffect(() => {
    if (!userId || !freshHistoryQuery.isFetched) return;
    const freshItems = freshHistoryQuery.data ?? [];
    const freshIds = new Set(freshItems.map(item => item.id.toLowerCase()));
    freshItems.forEach(item => {
      upsertBookingHistoryTicketEverywhere(queryClient, userId, item);
    });

    // Fail safe: if the recent history page cannot contain a confirmed ID or
    // the detail refresh failed, preserve the status endpoint's truth instead
    // of leaving the old cache at PENDING_PAYMENT.
    statusQuery.data?.forEach(statusResult => {
      if (
        statusResult.status !== 'CONFIRMED'
        || freshIds.has(statusResult.bookingId.toLowerCase())
      ) {
        return;
      }
      updateBookingHistoryTicketCaches(
        queryClient,
        userId,
        statusResult.bookingId,
        item => reconcilePassengerHistoryBookingStatus(item, statusResult),
      );
    });
  }, [
    freshHistoryQuery.data,
    freshHistoryQuery.isFetched,
    queryClient,
    statusQuery.data,
    userId,
  ]);

  const canReconcile = Boolean(
    status === 'PENDING_PAYMENT'
    && bookingIds.length > 0
    && userId
    && isFocused
    && isAppActive
    && isOnline,
  );

  const cancelReconciliation = useCallback(() => {
    runGenerationRef.current += 1;
    inFlightRef.current = null;
    if (mountedRef.current) setIsChecking(false);
    queryClient.cancelQueries({ queryKey, exact: true }).catch(() => undefined);
  }, [queryClient, queryKey]);

  const checkNow = useCallback((): Promise<void> => {
    if (!canReconcile) return Promise.resolve();
    if (inFlightRef.current) return inFlightRef.current;

    const runGeneration = ++runGenerationRef.current;
    setIsChecking(true);

    const task = pollBookingPayment({
      fetchResolution: async () => {
        const result = await refetchStatus({ throwOnError: true });
        if (!result.data) {
          throw new ApiRequestError({
            message: 'Chưa nhận được trạng thái booking từ máy chủ.',
            code: 'BOOKING_STATUS_UNAVAILABLE',
          });
        }
        return resolveBookingPayment(result.data);
      },
      isCurrent: () => runGeneration === runGenerationRef.current,
      shouldRetryError: isRetryableBookingStatusError,
    })
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        if (inFlightRef.current === task) inFlightRef.current = null;
        if (mountedRef.current && runGeneration === runGenerationRef.current) {
          setIsChecking(false);
        }
      });

    inFlightRef.current = task;
    return task;
  }, [canReconcile, refetchStatus]);

  const restartCheck = useCallback(async (): Promise<void> => {
    if (!canReconcile || resolution.phase !== 'pending') return;
    runGenerationRef.current += 1;
    inFlightRef.current = null;
    if (mountedRef.current) setIsChecking(false);
    await queryClient.cancelQueries({ queryKey, exact: true });
    return checkNow();
  }, [canReconcile, checkNow, queryClient, queryKey, resolution.phase]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelReconciliation();
    };
  }, [cancelReconciliation]);

  useEffect(() => {
    if (!canReconcile || resolution.phase !== 'pending') return undefined;
    let cancelled = false;
    let steadyPollId: ReturnType<typeof setInterval> | undefined;

    checkNow()
      .then(() => {
        if (cancelled) return;
        const latestStatuses =
          queryClient.getQueryData<BookingStatusResult[]>(queryKey) ?? [];
        if (resolveBookingPayment(latestStatuses).phase !== 'pending') return;

        steadyPollId = setInterval(() => {
          if (inFlightRef.current) return;
          refetchStatus()
            .then(result => {
              if (
                result.data
                && resolveBookingPayment(result.data).phase !== 'pending'
                && steadyPollId
              ) {
                clearInterval(steadyPollId);
                steadyPollId = undefined;
              }
            })
            .catch(() => undefined);
        }, BOOKING_STATUS_STEADY_POLL_MS);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (steadyPollId) clearInterval(steadyPollId);
      cancelReconciliation();
    };
  }, [
    canReconcile,
    cancelReconciliation,
    checkNow,
    queryClient,
    queryKey,
    refetchStatus,
    resolution.phase,
  ]);

  useEffect(() => {
    const subscription = addVnPaySdkPaymentBackListener(() => {
      // The detail screen mounts before the VNPay SDK opens, so its initial
      // bounded poll may be nearly exhausted when PaymentBack arrives. Start
      // a fresh bounded window from the explicit return signal.
      restartCheck().catch(() => undefined);
    });
    return () => subscription?.remove();
  }, [restartCheck]);

  const errorMessage = !isOnline
    ? t('booking.paymentStatus.offline')
    : statusQuery.error
      ? getLocalizedApiErrorMessage(
        statusQuery.error,
        t,
        BOOKING_PAYMENT_ERROR_KEYS,
      )
      : undefined;

  return {
    phase: resolution.phase,
    terminalStatus: resolution.phase === 'expired' || resolution.phase === 'inactive'
      ? resolution.terminalStatus
      : undefined,
    statuses: statusQuery.data ?? EMPTY_BOOKING_STATUSES,
    freshHistoryItems: freshHistoryQuery.data ?? EMPTY_HISTORY_ITEMS,
    isChecking,
    isOnline,
    errorMessage,
    checkNow,
  };
}

export function useBookingPaymentReconciliation(
  bookingResult: BookingResult | RoundTripResult | null,
): BookingPaymentReconciliationState {
  const bookingIds = useMemo(() => getBookingIds(bookingResult), [bookingResult]);
  return useBookingStatusReconciliation({
    bookingIds,
    status: bookingResult?.status ?? null,
  });
}

/** Reconciles a pending navigation snapshot without fabricating a detail DTO. */
export function usePendingHistoryBookingReconciliation(
  bookingId: string,
  isPendingPayment: boolean,
): BookingPaymentReconciliationState {
  const bookingIds = useMemo(
    () => isPendingPayment && bookingId ? [bookingId] : [],
    [bookingId, isPendingPayment],
  );
  return useBookingStatusReconciliation({
    bookingIds,
    status: isPendingPayment ? 'PENDING_PAYMENT' : null,
  });
}
