import { useRef } from 'react';
import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import { notificationKeys } from '@features/home/api/notificationApi';
import { walletKeys } from '@features/profile/api/walletApi';
import { IdempotencyKeyTracker } from '@shared/api/idempotency';
import { isAmbiguousIdempotentRequestError } from '@shared/api/errors';
import {
  bookingKeys,
} from '../api/bookingApi';
import { bookingHistoryKeys } from '../api/bookingHistoryApi';
import {
  resolveBookingPendingAction,
  type ResolvePendingActionPayload,
  type ResolvePendingActionResult,
} from '../api/bookingPendingActionApi';

export interface ResolvePendingActionVariables extends ResolvePendingActionPayload {
  bookingId: string;
  pendingActionId: string;
}

export async function invalidateResolvedBookingQueries(
  queryClient: QueryClient,
  userId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: bookingHistoryKeys.user(userId),
    }),
    queryClient.invalidateQueries({
      queryKey: bookingKeys.paymentStatusRoot(userId),
    }),
    queryClient.invalidateQueries({
      queryKey: notificationKeys.user(userId),
    }),
    queryClient.invalidateQueries({
      queryKey: walletKeys.user(userId),
    }),
  ]);
}

export function useResolvePendingAction() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const idempotencyTrackerRef = useRef<IdempotencyKeyTracker | null>(null);

  if (!idempotencyTrackerRef.current) {
    idempotencyTrackerRef.current = new IdempotencyKeyTracker('resolve-pending-action');
  }

  return useMutation<
    ResolvePendingActionResult,
    unknown,
    ResolvePendingActionVariables
  >({
    mutationFn: async ({
      bookingId,
      pendingActionId,
      ...payload
    }) => {
      const idempotencyKey = idempotencyTrackerRef.current!.getOrCreate({
        bookingId,
        pendingActionId,
        ...payload,
      });

      try {
        const result = await resolveBookingPendingAction(
          bookingId,
          pendingActionId,
          payload,
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
      await invalidateResolvedBookingQueries(
        queryClient,
        userId,
      );
    },
  });
}
