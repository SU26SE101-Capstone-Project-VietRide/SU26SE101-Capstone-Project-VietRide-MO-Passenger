import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getShuttlePassengerContext,
  getTripRouteContext,
  trackingKeys,
  type ShuttlePassengerContext,
  type ShuttlePassengerPickup,
  type TripRouteContext,
  type TripRouteContextCache,
} from '../api/trackingApi';

export const TRACKING_ROUTE_CONTEXT_REFRESH_MS = 10 * 60_000;
const TRACKING_ROUTE_CONTEXT_GC_MS = 30 * 60_000;
/**
 * Keep one-shot shuttle bootstrap in memory while the tracking screen may
 * briefly unmount/remount. Not used for polling — live GPS/ETA never go here.
 */
const TRACKING_SHUTTLE_CONTEXT_GC_MS = 5 * 60_000;

/**
 * @deprecated No longer polled. Kept so any external import does not break;
 * passenger-context is bootstrap-only (notification / enter tracking).
 */
export const TRACKING_SHUTTLE_CONTEXT_REFRESH_MS = 0;

export type TrackingMapContext =
  | {
      source: 'trip';
      data: TripRouteContext;
    }
  | {
      source: 'shuttle';
      data: ShuttlePassengerContext;
      selectedPickup: ShuttlePassengerPickup | null;
    };

interface UseTrackingMapContextOptions {
  source: 'trip' | 'shuttle';
  userId: string;
  trackingId: string;
  bookingId?: string;
  enabled: boolean;
  /**
   * Only applies to trip route-context geometry refresh.
   * Shuttle passenger-context is never interval-polled.
   */
  pollingEnabled: boolean;
  retainSensitiveContext: boolean;
  isFatalError: (error: unknown) => boolean;
}

type TrackingContextQueryData = TripRouteContextCache | ShuttlePassengerContext;

export const selectShuttlePassengerPickup = (
  context: ShuttlePassengerContext | null | undefined,
  bookingId?: string,
): ShuttlePassengerPickup | null => {
  if (!context) return null;

  if (bookingId) {
    return context.ownPickups.find((pickup) => pickup.bookingId === bookingId) ?? null;
  }

  let pending: ShuttlePassengerPickup | null = null;
  let pickedUp: ShuttlePassengerPickup | null = null;
  for (const pickup of context.ownPickups) {
    if (
      pickup.status === 'PENDING'
      && (!pending || pickup.pickupOrder < pending.pickupOrder)
    ) {
      pending = pickup;
    }
    if (
      pickup.status === 'PICKED_UP'
      && (!pickedUp || pickup.pickupOrder < pickedUp.pickupOrder)
    ) {
      pickedUp = pickup;
    }
  }
  return pending ?? pickedUp;
};

/**
 * Passenger-context fields that affect map markers / journey chrome.
 * Live progress (stopsBeforePickup, vehicle GPS) is owned by latest/eta/socket.
 */
const shuttleBootstrapFingerprint = (
  context: ShuttlePassengerContext | null | undefined,
): string => {
  if (!context) return '';
  const pickups = context.ownPickups
    .map((pickup) => [
      pickup.bookingId,
      pickup.pickupOrder,
      pickup.latitude,
      pickup.longitude,
      pickup.status,
      pickup.serviceAddress ?? '',
    ].join(':'))
    .join('|');
  const station = context.station
    ? [
        context.station.stationId,
        context.station.pickupOrder,
        context.station.latitude,
        context.station.longitude,
        context.station.name,
      ].join(':')
    : '';
  return [
    context.shuttleTripId,
    context.mainTripId,
    context.direction,
    pickups,
    station,
  ].join('#');
};

/**
 * Map geometry / marker bootstrap for tracking screens.
 *
 * - **Trip `route-context`**: planned polyline + stations; slow refresh with ETag.
 * - **Shuttle `passenger-context`**: one-shot bootstrap for own pickup + station
 *   when entering tracking (notification deep-link, ticket, etc.).
 *   **Not** live tracking — vehicle GPS and ETA use `/latest`, `/eta`, and socket.
 */
export function useTrackingMapContext({
  source,
  userId,
  trackingId,
  bookingId,
  enabled,
  pollingEnabled,
  retainSensitiveContext,
  isFatalError,
}: UseTrackingMapContextOptions) {
  const queryClient = useQueryClient();
  const isShuttle = source === 'shuttle';
  const contextKey = useMemo(
    () => (isShuttle
      ? trackingKeys.shuttlePassengerContext(userId, trackingId)
      : trackingKeys.routeContext(userId, trackingId)),
    [isShuttle, trackingId, userId],
  );
  // Stable key for unmount cleanup without re-subscribing the effect every render.
  const contextKeyRef = useRef(contextKey);
  contextKeyRef.current = contextKey;
  const isShuttleRef = useRef(isShuttle);
  isShuttleRef.current = isShuttle;

  const stableShuttleRef = useRef<ShuttlePassengerContext | null>(null);
  const stableShuttleFingerprintRef = useRef('');

  const evictShuttleContext = useCallback((key: readonly unknown[]) => {
    queryClient
      .cancelQueries({ queryKey: key, exact: true })
      .catch(() => undefined);
    queryClient.removeQueries({ queryKey: key, exact: true });
    stableShuttleRef.current = null;
    stableShuttleFingerprintRef.current = '';
  }, [queryClient]);

  const contextQuery = useQuery<TrackingContextQueryData>({
    queryKey: contextKey,
    queryFn: ({ signal }) => {
      if (isShuttle) return getShuttlePassengerContext(trackingId, signal);

      const previous = queryClient.getQueryData<TripRouteContextCache>(contextKey);
      return getTripRouteContext(trackingId, previous, signal);
    },
    enabled,
    // Trip geometry: long-lived, ETag-aware.
    // Shuttle passenger-context: bootstrap once per enter-tracking session.
    // Live shuttle updates never flow through this query.
    staleTime: isShuttle ? Number.POSITIVE_INFINITY : TRACKING_ROUTE_CONTEXT_REFRESH_MS,
    gcTime: isShuttle
      ? TRACKING_SHUTTLE_CONTEXT_GC_MS
      : TRACKING_ROUTE_CONTEXT_GC_MS,
    retry: (failureCount, error) => !isFatalError(error) && failureCount < 2,
    refetchOnReconnect: false,
    refetchOnMount: isShuttle ? false : true,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      if (isShuttle) return false;
      return pollingEnabled && !isFatalError(query.state.error)
        ? TRACKING_ROUTE_CONTEXT_REFRESH_MS
        : false;
    },
  });

  // Evict sensitive shuttle coordinates when the screen blurs / app backgrounds.
  // Do NOT return the clear as the effect cleanup — that re-ran clear on every
  // dependency identity change while mounted and caused removeQueries → refetch storms.
  useEffect(() => {
    if (!isShuttle) return;

    if (!retainSensitiveContext) {
      evictShuttleContext(contextKey);
    }
  }, [contextKey, evictShuttleContext, isShuttle, retainSensitiveContext]);

  // Unmount-only: clear the last active shuttle context key.
  useEffect(() => () => {
    if (!isShuttleRef.current) return;
    evictShuttleContext(contextKeyRef.current);
  }, [evictShuttleContext]);

  const routeContext = !isShuttle
    ? (contextQuery.data as TripRouteContextCache | undefined)?.data ?? null
    : null;

  const rawShuttleContext = isShuttle
    ? (contextQuery.data as ShuttlePassengerContext | undefined) ?? null
    : null;

  // Zod parse + RQ always yield new object identities. Hold a stable reference
  // unless bootstrap marker fields actually change — stops map marker rebuilds
  // when pull-to-refresh returns the same pickup/station payload.
  const shuttleContext = useMemo(() => {
    if (!isShuttle) return null;
    if (!rawShuttleContext) {
      stableShuttleRef.current = null;
      stableShuttleFingerprintRef.current = '';
      return null;
    }

    const fingerprint = shuttleBootstrapFingerprint(rawShuttleContext);
    if (
      stableShuttleRef.current
      && stableShuttleFingerprintRef.current === fingerprint
    ) {
      return stableShuttleRef.current;
    }

    stableShuttleRef.current = rawShuttleContext;
    stableShuttleFingerprintRef.current = fingerprint;
    return rawShuttleContext;
  }, [isShuttle, rawShuttleContext]);

  const selectedShuttlePickup = useMemo(
    () => selectShuttlePassengerPickup(shuttleContext, bookingId),
    [bookingId, shuttleContext],
  );
  const mapContext = useMemo<TrackingMapContext | null>(() => {
    if (routeContext) return { source: 'trip', data: routeContext };
    if (shuttleContext) {
      return {
        source: 'shuttle',
        data: shuttleContext,
        selectedPickup: selectedShuttlePickup,
      };
    }
    return null;
  }, [routeContext, selectedShuttlePickup, shuttleContext]);

  return {
    contextQuery,
    mapContext,
    routeContext,
    shuttleContext,
    selectedShuttlePickup,
  };
}

export type UseTrackingMapContextResult = ReturnType<typeof useTrackingMapContext>;
