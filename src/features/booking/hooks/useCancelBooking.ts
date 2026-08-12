import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import { passengerHistoryKeys } from '@features/profile/api/passengerHistoryApi';
import {
  IdempotencyKeyTracker,
} from '@shared/api/idempotency';
import {
  isAmbiguousIdempotentRequestError,
  toApiError,
} from '@shared/api/errors';
import { bookingKeys, cancelBooking } from '../api/bookingApi';
import type {
  CancelBookingReason,
  CancelBookingResult,
} from '../types';

export interface CancelBookingVariables {
  bookingId: string;
  reason?: CancelBookingReason;
}

const STALE_CANCELLATION_ERROR_CODES = new Set([
  'BOOKING_NOT_CANCELLABLE',
  'BOOKING_NOT_FOUND',
  'TRIP_NOT_FOUND',
]);

export function useCancelBooking() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const idempotencyTrackerRef = useRef<IdempotencyKeyTracker | null>(null);

  if (!idempotencyTrackerRef.current) {
    idempotencyTrackerRef.current = new IdempotencyKeyTracker('cancel-booking');
  }

  return useMutation<CancelBookingResult, unknown, CancelBookingVariables>({
    mutationFn: async ({
      bookingId,
      reason = 'USER_INITIATED',
    }) => {
      const intent = { bookingId, reason };
      const idempotencyKey = idempotencyTrackerRef.current!.getOrCreate(intent);

      try {
        const result = await cancelBooking(
          bookingId,
          { reason },
          idempotencyKey,
        );
        idempotencyTrackerRef.current!.reset();
        return result;
      } catch (error) {
        if (!isAmbiguousIdempotentRequestError(error)) {
          idempotencyTrackerRef.current!.reset();
        }
        throw error;
      }
    },
    onSuccess: async () => {
      if (!userId) return;

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: passengerHistoryKeys.user(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: bookingKeys.user(userId),
        }),
      ]);
    },
    onError: (error) => {
      if (!userId || !STALE_CANCELLATION_ERROR_CODES.has(toApiError(error).code)) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: passengerHistoryKeys.user(userId),
      }).catch(() => undefined);
    },
  });
}
