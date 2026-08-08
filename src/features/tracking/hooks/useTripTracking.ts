import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  ApiRequestError,
  toApiError,
} from '@shared/api/errors';
import {
  refreshAccessTokenAfterUnauthorized,
  resolveStoredAccessToken,
} from '@shared/api/authSession';
import { useIsAppActive } from '@shared/hooks/useIsAppActive';
import { useNetworkStatus } from '@shared/hooks/useNetworkStatus';
import { isUuid } from '@shared/utils/pathSegment';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import type { TripLifecycleStatus } from '@features/trip/types';
import {
  getShuttleTrackingEta,
  getShuttleTrackingLatest,
  getTrackingEta,
  getTrackingLatest,
  getTrackingTrail,
  trackingKeys,
  type ShuttleTrackingEta,
  type ShuttleTrackingEtaResponse,
  type ShuttleTrackingLatestResponse,
  type TrackingEta,
  type TrackingEtaResponse,
  type TrackingLatestResponse,
  type TrackingPoint,
  type TrackingTarget,
  isTrackingTarget,
} from '../api/trackingApi';
import {
  createTripTrackingConnection,
  type TrackingDelayUpdate,
  type TrackingJoinFailure,
  type TrackingRealtimeStatus,
  type TripTrackingConnection,
} from '../api/trackingRealtime';
import { useTrackingMapContext } from './useTrackingMapContext';

export const TRACKING_LATEST_POLL_MS = 5_000;
export const TRACKING_ETA_POLL_MS = 60_000;
export const TRACKING_TRAIL_REFRESH_MS = 5 * 60_000;
export const TRACKING_SOCKET_GPS_STALE_MS = 15_000;
export const MAX_TRACKING_TRAIL_POINTS = 300;

export type TrackingTripStatus = TripLifecycleStatus;

interface UseMainTripTrackingOptions {
  source?: 'trip';
  tripId: string;
  /** Canonical STOP|STATION target; omit for operational next-stop only. */
  trackingTarget?: TrackingTarget;
  tripStatus?: TrackingTripStatus;
  /** Lets non-trip sources (for example a delivered parcel) stop live work. */
  sourceTerminal?: boolean;
}

interface UseShuttleTrackingOptions {
  source: 'shuttle';
  shuttleTripId: string;
  bookingId?: string;
}

export type UseTripTrackingOptions =
  | UseMainTripTrackingOptions
  | UseShuttleTrackingOptions;

type LiveTrackingEta = TrackingEta | ShuttleTrackingEta;
type LiveTrackingLatestResponse =
  | TrackingLatestResponse
  | ShuttleTrackingLatestResponse;

interface ScopedLiveTrailState {
  scopeKey: string;
  points: TrackingPoint[];
}

interface ScopedFatalState {
  scopeKey: string;
  error: ApiRequestError;
}

interface ScopedRealtimeState {
  scopeKey: string;
  status: TrackingRealtimeStatus;
}

interface ScopedRealtimeGpsState {
  scopeKey: string;
  isFresh: boolean;
}

type ActiveTrackingDelay = Extract<TrackingDelayUpdate, { status: 'DELAYED' }>;

interface ScopedDelayState {
  scopeKey: string;
  delay: ActiveTrackingDelay;
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

export function getFatalTrackingError(
  errors: readonly unknown[],
): ApiRequestError | null {
  const error = errors.find(isFatalTrackingError);
  return error ? toApiError(error) : null;
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

const appendChronologicalTrackingPoint = (
  points: TrackingPoint[],
  point: TrackingPoint,
  limit = MAX_TRACKING_TRAIL_POINTS,
): TrackingPoint[] => {
  if (limit <= 0) return [];

  const pointTimestamp = Date.parse(point.recordedAt);
  const latestTimestamp = Date.parse(points[points.length - 1]?.recordedAt ?? '');
  if (Number.isFinite(latestTimestamp) && pointTimestamp <= latestTimestamp) {
    return points;
  }

  const retainedStart = Math.max(0, points.length - limit + 1);
  return [...points.slice(retainedStart), point];
};

const mergeChronologicalTrackingPoints = (
  persistedPoints: readonly TrackingPoint[],
  livePoints: readonly TrackingPoint[],
  limit = MAX_TRACKING_TRAIL_POINTS,
): TrackingPoint[] => {
  if (limit <= 0) return [];

  const merged: TrackingPoint[] = [];
  let persistedIndex = 0;
  let liveIndex = 0;
  const push = (point: TrackingPoint): void => {
    const previous = merged[merged.length - 1];
    if (
      previous
      && Date.parse(previous.recordedAt) === Date.parse(point.recordedAt)
    ) {
      merged[merged.length - 1] = point;
      return;
    }
    merged.push(point);
  };

  while (
    persistedIndex < persistedPoints.length
    && liveIndex < livePoints.length
  ) {
    const persisted = persistedPoints[persistedIndex] as TrackingPoint;
    const live = livePoints[liveIndex] as TrackingPoint;
    const persistedTimestamp = Date.parse(persisted.recordedAt);
    const liveTimestamp = Date.parse(live.recordedAt);
    if (persistedTimestamp < liveTimestamp) {
      push(persisted);
      persistedIndex += 1;
    } else {
      push(live);
      liveIndex += 1;
      if (persistedTimestamp === liveTimestamp) persistedIndex += 1;
    }
  }

  while (persistedIndex < persistedPoints.length) {
    push(persistedPoints[persistedIndex] as TrackingPoint);
    persistedIndex += 1;
  }
  while (liveIndex < livePoints.length) {
    push(livePoints[liveIndex] as TrackingPoint);
    liveIndex += 1;
  }

  return merged.slice(-limit);
};

export function getNewestTrackingPoint(
  points: ReadonlyArray<TrackingPoint | null | undefined>,
): TrackingPoint | null {
  let newest: TrackingPoint | null = null;
  let newestTimestamp = Number.NEGATIVE_INFINITY;

  points.forEach((point) => {
    if (!point) return;
    const timestamp = Date.parse(point.recordedAt);
    if (Number.isFinite(timestamp) && timestamp >= newestTimestamp) {
      newest = point;
      newestTimestamp = timestamp;
    }
  });

  return newest;
}

const appendScopedTrackingPoint = (
  current: ScopedLiveTrailState,
  scopeKey: string,
  point: TrackingPoint,
): ScopedLiveTrailState => {
  const currentPoints = current.scopeKey === scopeKey ? current.points : [];
  const nextPoints = appendChronologicalTrackingPoint(currentPoints, point);

  return current.scopeKey === scopeKey && nextPoints === currentPoints
    ? current
    : { scopeKey, points: nextPoints };
};

const getNewestEta = <T extends { updatedAt: string }>(
  restEta: T | null | undefined,
  liveEta: T | null | undefined,
): T | null => {
  if (!restEta) return liveEta ?? null;
  if (!liveEta) return restEta;
  return Date.parse(liveEta.updatedAt) >= Date.parse(restEta.updatedAt)
    ? liveEta
    : restEta;
};

const shouldRetryTracking = (failureCount: number, error: unknown): boolean =>
  !isFatalTrackingError(error) && failureCount < 2;

const createSocketFatalError = (
  failure: Extract<
    TrackingJoinFailure,
    'ACCESS_DENIED' | 'TRIP_NOT_FOUND' | 'SHUTTLE_TRIP_NOT_FOUND'
  >,
): ApiRequestError => new ApiRequestError({
  message: failure === 'ACCESS_DENIED'
    ? 'You do not have permission to track this trip.'
    : 'This trip could not be found.',
  code: failure,
  statusCode: failure === 'ACCESS_DENIED' ? 403 : 404,
});

export function useTripTracking(options: UseTripTrackingOptions) {
  const source = options.source ?? 'trip';
  const isShuttle = options.source === 'shuttle';
  const trackingId = options.source === 'shuttle'
    ? options.shuttleTripId
    : options.tripId;
  const bookingId = options.source === 'shuttle' ? options.bookingId : undefined;
  const trackingTarget = options.source === 'shuttle'
    ? undefined
    : (options.trackingTarget && isTrackingTarget(options.trackingTarget)
      ? options.trackingTarget
      : undefined);
  const tripStatus = options.source === 'shuttle' ? undefined : options.tripStatus;
  const sourceTerminal = options.source === 'shuttle'
    ? false
    : (options.sourceTerminal ?? false);
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const isFocused = useIsFocused();
  const isOnline = useNetworkStatus();
  const isAppActive = useIsAppActive();
  const [liveTrail, setLiveTrail] = useState<ScopedLiveTrailState>({
    scopeKey: '',
    points: [],
  });
  const [fatalState, setFatalState] = useState<ScopedFatalState | null>(null);
  const [inactiveScopeKey, setInactiveScopeKey] = useState<string | null>(null);
  const [realtimeState, setRealtimeState] = useState<ScopedRealtimeState>({
    scopeKey: '',
    status: 'idle',
  });
  const [realtimeGpsState, setRealtimeGpsState] = useState<ScopedRealtimeGpsState>({
    scopeKey: '',
    isFresh: false,
  });
  const [delayState, setDelayState] = useState<ScopedDelayState | null>(null);

  const hasValidTrackingId = isUuid(trackingId);
  const hasCanonicalTarget = Boolean(trackingTarget);
  const queryUserId = userId ?? 'guest';
  const queryTrackingId = hasValidTrackingId ? trackingId : 'invalid';
  const queryTarget = trackingTarget ?? 'none';
  const scopeKey = `${queryUserId}:${source}:${queryTrackingId}`;
  const activeFatalError = fatalState?.scopeKey === scopeKey
    ? fatalState.error
    : null;
  const isInactive = inactiveScopeKey === scopeKey;
  const isTerminal = sourceTerminal
    || isInactive
    || isTerminalTrackingStatus(tripStatus);
  const executionPolicy = getTrackingExecutionPolicy({
    hasAuthenticatedUser: Boolean(userId),
    hasValidTripId: hasValidTrackingId,
    isFocused,
    isOnline,
    isAppActive,
    isTerminal,
  });
  const queryEnabled = executionPolicy.queryEnabled && !activeFatalError;
  const pollingEnabled = executionPolicy.pollingEnabled && !activeFatalError;
  const activeRealtimeStatus = realtimeState.scopeKey === scopeKey
    ? realtimeState.status
    : 'idle';
  const realtimeStatus: TrackingRealtimeStatus = activeFatalError?.statusCode === 403
    ? 'forbidden'
    : activeFatalError?.statusCode === 404
      ? 'not_found'
      : isInactive
        ? 'inactive'
        : activeRealtimeStatus;
  const isRealtimeConnected = realtimeStatus === 'connected';
  const hasFreshRealtimeGps = realtimeGpsState.scopeKey === scopeKey
    && realtimeGpsState.isFresh;

  const trackingRootKey = useMemo(
    () => isShuttle
      ? trackingKeys.shuttle(queryUserId, queryTrackingId)
      : trackingKeys.trip(queryUserId, queryTrackingId),
    [isShuttle, queryTrackingId, queryUserId],
  );

  const trackingContext = useTrackingMapContext({
    source,
    userId: queryUserId,
    trackingId: queryTrackingId,
    ...(bookingId ? { bookingId } : {}),
    enabled: queryEnabled,
    pollingEnabled,
    retainSensitiveContext: isFocused && isAppActive,
    isFatalError: isFatalTrackingError,
  });

  const latestKey = useMemo(
    () => isShuttle
      ? trackingKeys.shuttleLatest(queryUserId, queryTrackingId)
      : trackingKeys.latest(queryUserId, queryTrackingId),
    [isShuttle, queryTrackingId, queryUserId],
  );
  const trailKey = useMemo(
    () => isShuttle
      ? [...trackingKeys.shuttle(queryUserId, queryTrackingId), 'live-points'] as const
      : trackingKeys.trail(queryUserId, queryTrackingId),
    [isShuttle, queryTrackingId, queryUserId],
  );
  const shuttleEtaKey = useMemo(
    () => trackingKeys.shuttleEta(queryUserId, queryTrackingId),
    [queryTrackingId, queryUserId],
  );
  const nextEtaKey = useMemo(
    () => trackingKeys.nextEta(queryUserId, queryTrackingId),
    [queryTrackingId, queryUserId],
  );
  const targetEtaKey = useMemo(
    () => trackingKeys.targetEta(queryUserId, queryTrackingId, queryTarget),
    [queryTarget, queryTrackingId, queryUserId],
  );

  const latestQuery = useQuery({
    queryKey: latestKey,
    queryFn: ({ signal }) => isShuttle
      ? getShuttleTrackingLatest(trackingId, signal)
      : getTrackingLatest(trackingId, signal),
    enabled: queryEnabled,
    staleTime: TRACKING_LATEST_POLL_MS - 1_000,
    gcTime: TRACKING_TRAIL_REFRESH_MS,
    retry: shouldRetryTracking,
    refetchOnReconnect: false,
    refetchInterval: (query) => getTrackingRefetchInterval(
      pollingEnabled && (!isRealtimeConnected || !hasFreshRealtimeGps),
      query.state.error,
      TRACKING_LATEST_POLL_MS,
    ),
  });

  const trailQuery = useQuery({
    queryKey: trailKey,
    queryFn: ({ signal }) => getTrackingTrail(trackingId, {}, signal),
    enabled: queryEnabled && !isShuttle,
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

  const shuttleEtaQuery = useQuery<ShuttleTrackingEtaResponse>({
    queryKey: shuttleEtaKey,
    queryFn: ({ signal }) => getShuttleTrackingEta(trackingId, signal),
    enabled: queryEnabled && isShuttle,
    staleTime: TRACKING_ETA_POLL_MS - 5_000,
    gcTime: TRACKING_TRAIL_REFRESH_MS,
    retry: shouldRetryTracking,
    refetchOnReconnect: false,
    refetchInterval: (query) => getTrackingRefetchInterval(
      pollingEnabled && isShuttle,
      query.state.error,
      TRACKING_ETA_POLL_MS,
    ),
  });

  // Operational next-stop: no stopId; poll every 60s when focused/foreground/online/non-terminal.
  const nextEtaQuery = useQuery<TrackingEtaResponse>({
    queryKey: nextEtaKey,
    queryFn: ({ signal }) => getTrackingEta(trackingId, { signal }),
    enabled: queryEnabled && !isShuttle,
    staleTime: TRACKING_ETA_POLL_MS - 5_000,
    gcTime: TRACKING_TRAIL_REFRESH_MS,
    retry: shouldRetryTracking,
    refetchOnReconnect: false,
    refetchInterval: (query) => getTrackingRefetchInterval(
      pollingEnabled && !isShuttle,
      query.state.error,
      TRACKING_ETA_POLL_MS,
    ),
  });

  // Target ETA only when caller has a canonical STOP|STATION target.
  const targetEtaQuery = useQuery<TrackingEtaResponse>({
    queryKey: targetEtaKey,
    queryFn: ({ signal }) => getTrackingEta(trackingId, {
      target: trackingTarget!,
      signal,
    }),
    enabled: queryEnabled && !isShuttle && hasCanonicalTarget,
    staleTime: TRACKING_ETA_POLL_MS - 5_000,
    gcTime: TRACKING_TRAIL_REFRESH_MS,
    retry: shouldRetryTracking,
    refetchOnReconnect: false,
    refetchInterval: (query) => getTrackingRefetchInterval(
      pollingEnabled && !isShuttle && hasCanonicalTarget,
      query.state.error,
      TRACKING_ETA_POLL_MS,
    ),
  });

  useEffect(() => {
    const fatalError = getFatalTrackingError([
      latestQuery.error,
      trailQuery.error,
      shuttleEtaQuery.error,
      nextEtaQuery.error,
      targetEtaQuery.error,
      trackingContext.contextQuery.error,
    ]);
    if (!fatalError) return;

    setFatalState((current) => current?.scopeKey === scopeKey
      ? current
      : { scopeKey, error: fatalError });
  }, [
    latestQuery.error,
    nextEtaQuery.error,
    scopeKey,
    shuttleEtaQuery.error,
    targetEtaQuery.error,
    trackingContext.contextQuery.error,
    trailQuery.error,
  ]);

  useEffect(() => {
    if (!activeFatalError) return;

    // 403/404: clear entire tracking subtree and disconnect (socket cleanup below).
    queryClient.removeQueries({ queryKey: trackingRootKey });
    setLiveTrail((current) => current.scopeKey === scopeKey
      ? { scopeKey, points: [] }
      : current);
    setDelayState((current) => current?.scopeKey === scopeKey ? null : current);
  }, [
    activeFatalError,
    queryClient,
    scopeKey,
    trackingRootKey,
  ]);

  const rawLatest = latestQuery.data?.latest ?? null;

  useEffect(() => {
    if (!rawLatest) return;
    setLiveTrail((current) => appendScopedTrackingPoint(
      current,
      scopeKey,
      rawLatest,
    ));
  }, [rawLatest, scopeKey]);

  useEffect(() => {
    if (!pollingEnabled || !userId) {
      if (!isInactive && !activeFatalError) {
        setRealtimeState((current) => current.scopeKey === scopeKey
          ? { scopeKey, status: 'idle' }
          : current);
      }
      return;
    }

    let disposed = false;
    let connection: TripTrackingConnection | null = null;
    let didRetryUnauthorized = false;
    let pendingLivePoint: TrackingPoint | null = null;
    let livePointFlushTimer: ReturnType<typeof setTimeout> | undefined;
    let gpsFreshnessTimer: ReturnType<typeof setInterval> | undefined;
    let lastLivePointFlushAt = 0;
    let lastValidRealtimeGpsAt = 0;
    let isRealtimeGpsFresh = false;

    const setScopedGpsFresh = (isFresh: boolean): void => {
      if (disposed || isRealtimeGpsFresh === isFresh) return;
      isRealtimeGpsFresh = isFresh;
      setRealtimeGpsState({ scopeKey, isFresh });
    };

    const setScopedStatus = (status: TrackingRealtimeStatus): void => {
      if (disposed) return;
      if (status === 'connected') didRetryUnauthorized = false;
      else setScopedGpsFresh(false);
      setRealtimeState({ scopeKey, status });
    };

    const flushLivePoint = (): void => {
      livePointFlushTimer = undefined;
      if (disposed || !pendingLivePoint) return;

      const point = pendingLivePoint;
      pendingLivePoint = null;
      lastLivePointFlushAt = Date.now();
      setLiveTrail((current) => appendScopedTrackingPoint(
        current,
        scopeKey,
        point,
      ));
      queryClient.setQueryData<LiveTrackingLatestResponse>(latestKey, (current) => {
        const latest = getNewestTrackingPoint([current?.latest, point]);
        return latest === current?.latest ? current : { latest };
      });
    };

    const appendLivePoint = (point: TrackingPoint): void => {
      if (disposed) return;
      lastValidRealtimeGpsAt = Date.now();
      setScopedGpsFresh(true);
      if (
        pendingLivePoint
        && Date.parse(point.recordedAt) <= Date.parse(pendingLivePoint.recordedAt)
      ) {
        return;
      }

      pendingLivePoint = point;
      if (livePointFlushTimer !== undefined) return;

      const elapsed = Date.now() - lastLivePointFlushAt;
      const delayMs = Math.max(0, 1_000 - elapsed);
      if (delayMs === 0) {
        flushLivePoint();
        return;
      }
      livePointFlushTimer = setTimeout(flushLivePoint, delayMs);
    };

    gpsFreshnessTimer = setInterval(() => {
      if (
        isRealtimeGpsFresh
        && Date.now() - lastValidRealtimeGpsAt >= TRACKING_SOCKET_GPS_STALE_MS
      ) {
        setScopedGpsFresh(false);
      }
    }, TRACKING_LATEST_POLL_MS);

    const startConnection = (accessToken: string): void => {
      if (disposed) return;
      connection?.disconnect();
      const handleJoinRejected = (failure: TrackingJoinFailure): void => {
        if (
          failure === 'ACCESS_DENIED'
          || failure === 'TRIP_NOT_FOUND'
          || failure === 'SHUTTLE_TRIP_NOT_FOUND'
        ) {
          setFatalState({ scopeKey, error: createSocketFatalError(failure) });
        } else if (failure === 'TRACKING_TRIP_NOT_ACTIVE') {
          setInactiveScopeKey(scopeKey);
        }
      };
      const handleUnauthorized = (): void => {
        connection?.disconnect();
        if (disposed || didRetryUnauthorized) {
          setScopedStatus('fallback');
          return;
        }

        didRetryUnauthorized = true;
        refreshAccessTokenAfterUnauthorized()
          .then((refreshedToken) => {
            if (disposed) return;
            if (refreshedToken) startConnection(refreshedToken);
            else setScopedStatus('idle');
          })
          .catch(() => setScopedStatus('fallback'));
      };

      if (isShuttle) {
        connection = createTripTrackingConnection({
          source: 'shuttle',
          shuttleTripId: trackingId,
          accessToken,
          onStatusChange: setScopedStatus,
          onGpsUpdate: appendLivePoint,
          onEtaUpdate: (eta) => {
            if (disposed) return;
            // RQ cache is source of truth — never write older socket over newer.
            queryClient.setQueryData<ShuttleTrackingEtaResponse>(
              shuttleEtaKey,
              (current) => ({ eta: getNewestEta(current?.eta, eta) }),
            );
          },
          onJoinRejected: handleJoinRejected,
          onUnauthorized: handleUnauthorized,
        });
        return;
      }

      connection = createTripTrackingConnection({
        tripId: trackingId,
        accessToken,
        onStatusChange: setScopedStatus,
        onGpsUpdate: appendLivePoint,
        onEtaUpdate: (eta) => {
          if (disposed) return;
          // Always merge newer operational events into nextEta.
          queryClient.setQueryData<TrackingEtaResponse>(
            nextEtaKey,
            (current) => ({ eta: getNewestEta(current?.eta, eta) }),
          );
          setDelayState((current) => {
            // Socket delay events are STOP-scoped; ignore STATION-only ETAs.
            if (
              eta.delayStatus === 'DELAYED'
              && eta.delayMinutes !== null
              && eta.stopId
            ) {
              return {
                scopeKey,
                delay: {
                  tripId: eta.tripId,
                  stopId: eta.stopId,
                  status: 'DELAYED',
                  delayMinutes: eta.delayMinutes,
                  updatedAt: eta.updatedAt,
                },
              };
            }

            return current?.scopeKey === scopeKey ? null : current;
          });
          // Socket ETA is STOP-only: merge into target cache only for matching STOP.
          // STATION targets keep REST polling as the sole source of truth.
          if (
            trackingTarget?.kind === 'STOP'
            && eta.targetKind === 'STOP'
            && eta.stopId === trackingTarget.stopId
          ) {
            queryClient.setQueryData<TrackingEtaResponse>(
              targetEtaKey,
              (current) => ({ eta: getNewestEta(current?.eta, eta) }),
            );
          }
        },
        onDelayUpdate: (delay) => {
          if (disposed) return;
          setDelayState((current) => {
            if (delay.status === 'DELAY_CLEARED') {
              return current?.scopeKey === scopeKey
                && current.delay.stopId === delay.stopId
                ? null
                : current;
            }
            return { scopeKey, delay };
          });
        },
        onJoinRejected: handleJoinRejected,
        onUnauthorized: handleUnauthorized,
      });
    };

    setScopedStatus('connecting');
    resolveStoredAccessToken()
      .then((accessToken) => {
        if (disposed) return;
        if (accessToken) startConnection(accessToken);
        else setScopedStatus('idle');
      })
      .catch(() => setScopedStatus('fallback'));

    return () => {
      disposed = true;
      if (livePointFlushTimer !== undefined) clearTimeout(livePointFlushTimer);
      if (gpsFreshnessTimer !== undefined) clearInterval(gpsFreshnessTimer);
      pendingLivePoint = null;
      connection?.disconnect();
    };
  }, [
    activeFatalError,
    hasCanonicalTarget,
    isInactive,
    isShuttle,
    latestKey,
    nextEtaKey,
    pollingEnabled,
    queryClient,
    scopeKey,
    shuttleEtaKey,
    targetEtaKey,
    trackingId,
    trackingTarget,
    userId,
  ]);

  const persistedTrailPoints = useMemo(
    () => mergeTrackingPoints(trailQuery.data?.items ?? [], []),
    [trailQuery.data?.items],
  );
  const trailPoints = useMemo(() => {
    const currentLivePoints: TrackingPoint[] = liveTrail.scopeKey === scopeKey
      ? liveTrail.points
      : [];
    const livePointsWithLatest = rawLatest
      ? appendChronologicalTrackingPoint(currentLivePoints, rawLatest)
      : currentLivePoints;
    return mergeChronologicalTrackingPoints(
      persistedTrailPoints,
      livePointsWithLatest,
    );
  }, [liveTrail, persistedTrailPoints, rawLatest, scopeKey]);

  const latest = useMemo(
    () => getNewestTrackingPoint([
      rawLatest,
      trailPoints[trailPoints.length - 1],
    ]),
    [rawLatest, trailPoints],
  );
  // React Query cache is the single source of truth for ETA (including socket merges).
  const nextEta: LiveTrackingEta | null = isShuttle
    ? (shuttleEtaQuery.data?.eta ?? null)
    : (nextEtaQuery.data?.eta ?? null);
  const targetEta: TrackingEta | null = isShuttle
    ? null
    : (targetEtaQuery.data?.eta ?? null);
  const delay = delayState?.scopeKey === scopeKey ? delayState.delay : null;

  const refetchLatest = latestQuery.refetch;
  const refetchTrail = trailQuery.refetch;
  const refetchShuttleEta = shuttleEtaQuery.refetch;
  const refetchNextEta = nextEtaQuery.refetch;
  const refetchTargetEta = targetEtaQuery.refetch;
  const refetchContext = trackingContext.contextQuery.refetch;
  const refetchAll = useCallback(async (): Promise<void> => {
    if (!queryEnabled) return;

    const requests: Array<Promise<unknown>> = [refetchLatest(), refetchContext()];
    if (isShuttle) {
      requests.push(refetchShuttleEta());
    } else {
      requests.push(refetchTrail(), refetchNextEta());
      if (hasCanonicalTarget) {
        requests.push(refetchTargetEta());
      }
    }
    await Promise.all(requests);
  }, [
    hasCanonicalTarget,
    isShuttle,
    queryEnabled,
    refetchContext,
    refetchLatest,
    refetchNextEta,
    refetchShuttleEta,
    refetchTargetEta,
    refetchTrail,
  ]);

  const queryFatalError = getFatalTrackingError([
    latestQuery.error,
    trailQuery.error,
    shuttleEtaQuery.error,
    nextEtaQuery.error,
    targetEtaQuery.error,
    trackingContext.contextQuery.error,
  ]);
  const fatalError = activeFatalError ?? queryFatalError;

  return {
    latest,
    trailPoints,
    nextEta,
    targetEta,
    delay,
    latestQuery,
    trailQuery,
    nextEtaQuery: isShuttle ? shuttleEtaQuery : nextEtaQuery,
    targetEtaQuery,
    contextQuery: trackingContext.contextQuery,
    mapContext: trackingContext.mapContext,
    routeContext: trackingContext.routeContext,
    shuttleContext: trackingContext.shuttleContext,
    selectedShuttlePickup: trackingContext.selectedShuttlePickup,
    fatalError,
    realtimeStatus,
    isRealtimeConnected,
    hasFreshRealtimeGps,
    hasAuthenticatedUser: Boolean(userId),
    hasValidTripId: hasValidTrackingId,
    hasValidTrackingId,
    hasValidStopId: hasCanonicalTarget && trackingTarget?.kind === 'STOP',
    hasCanonicalTarget,
    trackingTarget,
    source,
    isShuttle,
    isAppActive,
    isFocused,
    isOnline,
    isTerminal,
    isQueryEnabled: queryEnabled,
    isPolling: pollingEnabled,
    refetchAll,
  };
}

export type UseTripTrackingResult = ReturnType<typeof useTripTracking>;
