import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { toApiError } from '@shared/api/errors';
import { useIsAppActive } from '@shared/hooks/useIsAppActive';
import { useNetworkStatus } from '@shared/hooks/useNetworkStatus';
import { isUuid } from '@shared/utils/pathSegment';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import type { TripLifecycleStatus } from '@features/trip/types';
import {
  getTrackingEta,
  getTrackingLatest,
  getTrackingTrail,
  trackingKeys,
  type TrackingPoint,
} from '../api/trackingApi';

export const TRACKING_LATEST_POLL_MS = 5_000;
export const TRACKING_ETA_POLL_MS = 60_000;
export const TRACKING_TRAIL_REFRESH_MS = 5 * 60_000;
export const MAX_TRACKING_TRAIL_POINTS = 300;

export type TrackingTripStatus = TripLifecycleStatus;

interface UseTripTrackingOptions {
  tripId: string;
  stopId?: string;
  tripStatus?: TrackingTripStatus;
}

interface LiveTrailState {
  tripId: string;
  points: TrackingPoint[];
}

const TERMINAL_TRIP_STATUSES = new Set<TrackingTripStatus>([
  'COMPLETED',
  'CANCELLED',
  'DISRUPTED',
]);

export function isTerminalTrackingStatus(status?: TrackingTripStatus): boolean {
  return status ? TERMINAL_TRIP_STATUSES.has(status) : false;
}

export function isFatalTrackingError(error: unknown): boolean {
  const statusCode = error ? toApiError(error).statusCode : undefined;
  return statusCode === 403 || statusCode === 404;
}

interface TrackingExecutionPolicyInput {
  hasAuthenticatedUser: boolean;
  hasValidTripId: boolean;
  isFocused: boolean;
  isOnline: boolean;
  isAppActive: boolean;
  isTerminal: boolean;
}

export function getTrackingExecutionPolicy({
  hasAuthenticatedUser,
  hasValidTripId,
  isFocused,
  isOnline,
  isAppActive,
  isTerminal,
}: TrackingExecutionPolicyInput): {
  queryEnabled: boolean;
  pollingEnabled: boolean;
} {
  const queryEnabled = hasAuthenticatedUser
    && hasValidTripId
    && isFocused
    && isOnline
    && isAppActive;

  return {
    queryEnabled,
    pollingEnabled: queryEnabled && !isTerminal,
  };
}

export const getTrackingRefetchInterval = (
  pollingEnabled: boolean,
  error: unknown,
  intervalMs: number,
): number | false => (
  pollingEnabled && !isFatalTrackingError(error)
    ? intervalMs
    : false
);

const pointKey = (point: TrackingPoint): string =>
  `${point.recordedAt}:${point.latitude}:${point.longitude}`;

export function mergeTrackingPoints(
  persistedPoints: readonly TrackingPoint[],
  livePoints: readonly TrackingPoint[],
  limit = MAX_TRACKING_TRAIL_POINTS,
): TrackingPoint[] {
  if (limit <= 0) return [];

  const uniquePoints = new Map<string, TrackingPoint>();
  [...persistedPoints, ...livePoints].forEach((point) => {
    uniquePoints.set(pointKey(point), point);
  });

  return [...uniquePoints.values()]
    .sort((left, right) => Date.parse(left.recordedAt) - Date.parse(right.recordedAt))
    .slice(-limit);
}

const shouldRetryTracking = (failureCount: number, error: unknown): boolean =>
  !isFatalTrackingError(error) && failureCount < 2;

export function useTripTracking({
  tripId,
  stopId,
  tripStatus,
}: UseTripTrackingOptions) {
  const userId = useAuthStore((state) => state.user?.id);
  const isFocused = useIsFocused();
  const isOnline = useNetworkStatus();
  const isAppActive = useIsAppActive();
  const [liveTrail, setLiveTrail] = useState<LiveTrailState>({
    tripId,
    points: [],
  });

  const hasValidTripId = isUuid(tripId);
  const hasValidStopId = stopId === undefined || isUuid(stopId);
  const isTerminal = isTerminalTrackingStatus(tripStatus);
  const { queryEnabled, pollingEnabled } = getTrackingExecutionPolicy({
    hasAuthenticatedUser: Boolean(userId),
    hasValidTripId,
    isFocused,
    isOnline,
    isAppActive,
    isTerminal,
  });
  const queryUserId = userId ?? 'guest';
  const queryTripId = hasValidTripId ? tripId : 'invalid';
  const queryStopId = stopId && hasValidStopId ? stopId : 'none';

  const latestQuery = useQuery({
    queryKey: trackingKeys.latest(queryUserId, queryTripId),
    queryFn: ({ signal }) => getTrackingLatest(tripId, signal),
    enabled: queryEnabled,
    staleTime: TRACKING_LATEST_POLL_MS - 1_000,
    gcTime: TRACKING_TRAIL_REFRESH_MS,
    retry: shouldRetryTracking,
    refetchOnReconnect: false,
    refetchInterval: (query) => getTrackingRefetchInterval(
      pollingEnabled,
      query.state.error,
      TRACKING_LATEST_POLL_MS,
    ),
  });

  const trailQuery = useQuery({
    queryKey: trackingKeys.trail(queryUserId, queryTripId),
    queryFn: ({ signal }) => getTrackingTrail(tripId, {}, signal),
    enabled: queryEnabled,
    staleTime: TRACKING_TRAIL_REFRESH_MS,
    gcTime: TRACKING_TRAIL_REFRESH_MS,
    retry: shouldRetryTracking,
    refetchOnReconnect: false,
    refetchInterval: (query) => getTrackingRefetchInterval(
      pollingEnabled,
      query.state.error,
      TRACKING_TRAIL_REFRESH_MS,
    ),
  });

  const etaQuery = useQuery({
    queryKey: trackingKeys.eta(queryUserId, queryTripId, queryStopId),
    queryFn: ({ signal }) => {
      if (!stopId) throw new Error('Missing stopId.');
      return getTrackingEta(tripId, stopId, signal);
    },
    enabled: queryEnabled && Boolean(stopId) && hasValidStopId,
    staleTime: TRACKING_ETA_POLL_MS - 5_000,
    gcTime: TRACKING_TRAIL_REFRESH_MS,
    retry: shouldRetryTracking,
    refetchOnReconnect: false,
    refetchInterval: (query) => getTrackingRefetchInterval(
      pollingEnabled && Boolean(stopId),
      query.state.error,
      TRACKING_ETA_POLL_MS,
    ),
  });

  const latest = latestQuery.data?.latest ?? null;

  useEffect(() => {
    if (!latest) return;

    setLiveTrail((current) => {
      const currentPoints = current.tripId === tripId ? current.points : [];
      const nextPoints = mergeTrackingPoints(
        currentPoints,
        [latest],
        MAX_TRACKING_TRAIL_POINTS,
      );

      if (
        current.tripId === tripId
        && nextPoints.length === currentPoints.length
        && pointKey(nextPoints[nextPoints.length - 1]) === pointKey(currentPoints[currentPoints.length - 1])
      ) {
        return current;
      }

      return { tripId, points: nextPoints };
    });
  }, [latest, tripId]);

  const trailPoints = useMemo(
    () => {
      const currentLivePoints = liveTrail.tripId === tripId ? liveTrail.points : [];
      return mergeTrackingPoints(
        trailQuery.data?.items ?? [],
        currentLivePoints,
      );
    },
    [liveTrail, trailQuery.data?.items, tripId],
  );

  const refetchLatest = latestQuery.refetch;
  const refetchTrail = trailQuery.refetch;
  const refetchEta = etaQuery.refetch;
  const refetchAll = useCallback(async (): Promise<void> => {
    if (!queryEnabled) return;

    const requests: Array<Promise<unknown>> = [
      refetchLatest(),
      refetchTrail(),
    ];
    if (stopId && hasValidStopId) {
      requests.push(refetchEta());
    }
    await Promise.all(requests);
  }, [hasValidStopId, queryEnabled, refetchEta, refetchLatest, refetchTrail, stopId]);

  return {
    latest,
    trailPoints,
    eta: etaQuery.data?.eta ?? null,
    latestQuery,
    trailQuery,
    etaQuery,
    hasAuthenticatedUser: Boolean(userId),
    hasValidTripId,
    hasValidStopId,
    isAppActive,
    isFocused,
    isOnline,
    isTerminal,
    isQueryEnabled: queryEnabled,
    isPolling: pollingEnabled,
    refetchAll,
  };
}
