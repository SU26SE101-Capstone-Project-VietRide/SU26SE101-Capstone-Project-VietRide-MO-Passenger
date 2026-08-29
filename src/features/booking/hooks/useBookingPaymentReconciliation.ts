import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import { ApiRequestError, getLocalizedApiErrorMessage } from '@shared/api/errors';
import { useIsAppActive, useNetworkStatus } from '@shared/hooks';
import { addVnPaySdkPaymentBackListener } from '@shared/payments';
import { bookingKeys, getBookingStatus } from '../api/bookingApi';
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
  resolveBookingPayment,
} from '../utils/bookingPayment';

const BOOKING_STATUS_GC_TIME_MS = 10 * 60 * 1000;
const EMPTY_BOOKING_STATUSES: readonly BookingStatusResult[] = [];
const BOOKING_PAYMENT_ERROR_KEYS: Readonly<Record<string, string>> = {
  BOOKING_STATUS_CONTRACT_MISMATCH: 'booking.paymentStatus.contractMismatch',
  BOOKING_STATUS_UNAVAILABLE: 'booking.paymentStatus.unavailable',
};

export interface BookingPaymentReconciliationState {
  phase: 'idle' | 'pending' | 'confirmed' | 'expired' | 'inactive' | 'unavailable';
  terminalStatus?: BookingStatus;
  statuses: readonly BookingStatusResult[];
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

  const resolution = useMemo(() => {
    if (!status) return { phase: 'idle' as const };
    if (status === 'CONFIRMED') return { phase: 'confirmed' as const };
    if (statusQuery.error && !isRetryableBookingStatusError(statusQuery.error)) {
      return { phase: 'unavailable' as const };
    }
    return resolveBookingPayment(statusQuery.data ?? []);
  }, [status, statusQuery.data, statusQuery.error]);

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
    checkNow().catch(() => undefined);
    return cancelReconciliation;
  }, [canReconcile, cancelReconciliation, checkNow, resolution.phase]);

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
