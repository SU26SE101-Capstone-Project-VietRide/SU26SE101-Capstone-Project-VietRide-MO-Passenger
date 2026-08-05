import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Share } from 'react-native';

import { toApiError } from '@shared/api/errors';
import { IdempotencyKeyTracker } from '@shared/api/idempotency';
import {
  getTokenSessionEpoch,
  isTokenSessionEpochCurrent,
} from '@shared/utils/storage';
import {
  createTripShareLink,
  revokeTripShareLink,
} from '../api/tripShareApi';

interface ShareTripInput {
  tripId: string;
  message: string;
}

interface RevokeTripShareInput {
  tripId: string;
}

type PendingOperation = 'share' | 'revoke' | null;

export type TripShareOutcome =
  | 'shared'
  | 'dismissed'
  | 'revoked'
  | 'cancelled';

const shouldRetainIdempotencyKey = (error: unknown): boolean => {
  const apiError = toApiError(error);
  return (
    apiError.isNetworkError
    || apiError.statusCode === undefined
    || apiError.statusCode === 408
    || apiError.statusCode >= 500
  );
};

/**
 * Coordinates ephemeral share links without putting their fragment token in a
 * query/mutation cache. Requests fail immediately offline, are aborted when
 * the caller unmounts, and cannot open a native share sheet after logout or an
 * account switch.
 */
export function useTripSharing() {
  const createIdempotencyRef = useRef(
    new IdempotencyKeyTracker('trip-share-link'),
  );
  const revokeIdempotencyRef = useRef(
    new IdempotencyKeyTracker('trip-share-revoke'),
  );
  const activeControllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef<Promise<TripShareOutcome> | null>(null);
  const mountedRef = useRef(true);
  const [pendingOperation, setPendingOperation] = useState<PendingOperation>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activeControllerRef.current?.abort();
      activeControllerRef.current = null;
    };
  }, []);

  const runOperation = useCallback((
    operation: Exclude<PendingOperation, null>,
    input: ShareTripInput | RevokeTripShareInput,
  ): Promise<TripShareOutcome> => {
    if (inFlightRef.current) return inFlightRef.current;

    const controller = new AbortController();
    const sessionEpoch = getTokenSessionEpoch();
    activeControllerRef.current = controller;
    if (mountedRef.current) setPendingOperation(operation);

    const request = (async (): Promise<TripShareOutcome> => {
      if (operation === 'share') {
        const shareInput = input as ShareTripInput;
        const tracker = createIdempotencyRef.current;
        const idempotencyKey = tracker.getOrCreate({ tripId: shareInput.tripId });
        let shareUrl: string;

        try {
          ({ shareUrl } = await createTripShareLink(
            shareInput.tripId,
            idempotencyKey,
            controller.signal,
          ));
        } catch (error) {
          if (!controller.signal.aborted && !shouldRetainIdempotencyKey(error)) {
            tracker.reset();
          }
          if (
            controller.signal.aborted
            || !mountedRef.current
            || !isTokenSessionEpochCurrent(sessionEpoch)
          ) {
            return 'cancelled';
          }
          throw error;
        }

        tracker.reset();
        if (
          controller.signal.aborted
          || !mountedRef.current
          || !isTokenSessionEpochCurrent(sessionEpoch)
        ) {
          return 'cancelled';
        }

        const content = Platform.OS === 'ios'
          ? { message: shareInput.message, url: shareUrl }
          : { message: `${shareInput.message}\n${shareUrl}` };
        const result = await Share.share(content, {
          dialogTitle: shareInput.message,
        });
        return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
      }

      const tracker = revokeIdempotencyRef.current;
      const idempotencyKey = tracker.getOrCreate({ tripId: input.tripId });
      try {
        await revokeTripShareLink(
          input.tripId,
          idempotencyKey,
          controller.signal,
        );
      } catch (error) {
        if (!controller.signal.aborted && !shouldRetainIdempotencyKey(error)) {
          tracker.reset();
        }
        if (
          controller.signal.aborted
          || !mountedRef.current
          || !isTokenSessionEpochCurrent(sessionEpoch)
        ) {
          return 'cancelled';
        }
        throw error;
      }

      tracker.reset();
      return (
        controller.signal.aborted
        || !mountedRef.current
        || !isTokenSessionEpochCurrent(sessionEpoch)
      )
        ? 'cancelled'
        : 'revoked';
    })();

    const finalized = request.finally(() => {
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
      }
      inFlightRef.current = null;
      if (mountedRef.current) setPendingOperation(null);
    });
    inFlightRef.current = finalized;
    return finalized;
  }, []);

  const shareTrip = useCallback(
    (input: ShareTripInput) => runOperation('share', input),
    [runOperation],
  );
  const revokeTripShare = useCallback(
    (input: RevokeTripShareInput) => runOperation('revoke', input),
    [runOperation],
  );

  return {
    shareTrip,
    revokeTripShare,
    isSharing: pendingOperation === 'share',
    isRevoking: pendingOperation === 'revoke',
  };
}
