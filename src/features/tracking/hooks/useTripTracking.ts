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
} from '../api/trackingApi';
import {
  createTripTrackingConnection,
  type TrackingDelayUpdate,
  type TrackingJoinFailure,
  type TrackingRealtimeStatus,
  type TripTrackingConnection,
} from '../api/trackingRealtime';

export const TRACKING_LATEST_POLL_MS = 5_000;
export const TRACKING_ETA_POLL_MS = 60_000;
export const TRACKING_TRAIL_REFRESH_MS = 5 * 60_000;
export const MAX_TRACKING_TRAIL_POINTS = 300;

export type TrackingTripStatus = TripLifecycleStatus;

interface UseMainTripTrackingOptions {
  source?: 'trip';
  tripId: string;
  stopId?: string;
  tripStatus?: TrackingTripStatus;
  /** Lets non-trip sources (for example a delivered parcel) stop live work. */
  sourceTerminal?: boolean;
}

interface UseShuttleTrackingOptions {
  source: 'shuttle';
  shuttleTripId: string;
}

export type UseTripTrackingOptions =
  | UseMainTripTrackingOptions
  | UseShuttleTrackingOptions;

type LiveTrackingEta = TrackingEta | ShuttleTrackingEta;
type LiveTrackingEtaResponse = TrackingEtaResponse | ShuttleTrackingEtaResponse;
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

interface ScopedEtaState {
  scopeKey: string;
  eta: LiveTrackingEta;
}

interface ScopedDelayState {
  scopeKey: string;
  delay: TrackingDelayUpdate;
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

const areTrackingPointsEqual = (
  left: TrackingPoint,
  right: TrackingPoint,
): boolean => left.tripId === right.tripId
  && left.latitude === right.latitude
  && left.longitude === right.longitude
  && left.speedKmh === right.speedKmh
  && left.headingDeg === right.headingDeg
  && left.recordedAt === right.recordedAt;

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
  const nextPoints = mergeTrackingPoints(
    currentPoints,
    [point],
    MAX_TRACKING_TRAIL_POINTS,
  );
  const hasChanged = nextPoints.length !== currentPoints.length
    || nextPoints.some((nextPoint, index) => (
      !areTrackingPointsEqual(nextPoint, currentPoints[index])
    ));

  return current.scopeKey === scopeKey && !hasChanged
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
  const stopId = options.source === 'shuttle' ? undefined : options.stopId;
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
  const [liveEtaState, setLiveEtaState] = useState<ScopedEtaState | null>(null);
  const [delayState, setDelayState] = useState<ScopedDelayState | null>(null);

  const hasValidTrackingId = isUuid(trackingId);
  const hasValidStopId = stopId === undefined || isUuid(stopId);
  const queryUserId = userId ?? 'guest';
  const queryTrackingId = hasValidTrackingId ? trackingId : 'invalid';
  const queryStopId = stopId && hasValidStopId ? stopId : 'none';
  const scopeKey = `${queryUserId}:${source}:${queryTrackingId}`;
  const etaScopeKey = `${scopeKey}:${queryStopId}`;
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
  const etaKey = useMemo(
    () => isShuttle
      ? trackingKeys.shuttleEta(queryUserId, queryTrackingId)
      : trackingKeys.eta(queryUserId, queryTrackingId, queryStopId),
    [isShuttle, queryStopId, queryTrackingId, queryUserId],
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
      pollingEnabled && !isRealtimeConnected,
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

  const etaQuery = useQuery<LiveTrackingEtaResponse>({
    queryKey: etaKey,
    queryFn: ({ signal }) => {
      if (isShuttle) return getShuttleTrackingEta(trackingId, signal);
      if (!stopId) throw new Error('Missing stopId.');
      return getTrackingEta(trackingId, stopId, signal);
    },
    enabled: queryEnabled && (isShuttle || (Boolean(stopId) && hasValidStopId)),
    staleTime: TRACKING_ETA_POLL_MS - 5_000,
    gcTime: TRACKING_TRAIL_REFRESH_MS,
    retry: shouldRetryTracking,
    refetchOnReconnect: false,
    refetchInterval: (query) => getTrackingRefetchInterval(
      pollingEnabled && (isShuttle || Boolean(stopId)),
      query.state.error,
      TRACKING_ETA_POLL_MS,
    ),
  });

  useEffect(() => {
    const fatalError = getFatalTrackingError([
      latestQuery.error,
      trailQuery.error,
      etaQuery.error,
    ]);
    if (!fatalError) return;

    setFatalState((current) => current?.scopeKey === scopeKey
      ? current
      : { scopeKey, error: fatalError });
  }, [etaQuery.error, latestQuery.error, scopeKey, trailQuery.error]);

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

    const setScopedStatus = (status: TrackingRealtimeStatus): void => {
      if (disposed) return;
      if (status === 'connected') didRetryUnauthorized = false;
      setRealtimeState({ scopeKey, status });
    };

    const appendLivePoint = (point: TrackingPoint): void => {
      if (disposed) return;
      setLiveTrail((current) => appendScopedTrackingPoint(
        current,
        scopeKey,
        point,
      ));
      queryClient.setQueryData<LiveTrackingLatestResponse>(latestKey, (current) => ({
        latest: getNewestTrackingPoint([current?.latest, point]),
      }));
    };

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
            setLiveEtaState({ scopeKey: etaScopeKey, eta });
            queryClient.setQueryData<ShuttleTrackingEtaResponse>(
              etaKey,
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
        ...(stopId && hasValidStopId ? { stopId } : {}),
        accessToken,
        onStatusChange: setScopedStatus,
        onGpsUpdate: appendLivePoint,
        onEtaUpdate: (eta) => {
          if (disposed || !stopId || !hasValidStopId) return;
          setLiveEtaState({ scopeKey: etaScopeKey, eta });
          setDelayState((current) => {
            if (eta.delayed && eta.delayMinutes !== undefined) {
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
          if (eta.stopId === stopId) {
            queryClient.setQueryData<TrackingEtaResponse>(etaKey, (current) => ({
              eta: getNewestEta(current?.eta, eta),
            }));
          }
        },
        onDelayUpdate: (delay) => {
          if (!disposed) setDelayState({ scopeKey, delay });
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
      connection?.disconnect();
    };
  }, [
    activeFatalError,
    etaKey,
    etaScopeKey,
    hasValidStopId,
    isInactive,
    isShuttle,
    latestKey,
    pollingEnabled,
    queryClient,
    scopeKey,
    stopId,
    trackingId,
    userId,
  ]);

  const trailPoints = useMemo(() => {
    const currentLivePoints = liveTrail.scopeKey === scopeKey
      ? liveTrail.points
      : [];
    return mergeTrackingPoints(
      trailQuery.data?.items ?? [],
      [...currentLivePoints, ...(rawLatest ? [rawLatest] : [])],
    );
  }, [liveTrail, rawLatest, scopeKey, trailQuery.data?.items]);

  const latest = useMemo(
    () => getNewestTrackingPoint([
      rawLatest,
      trailPoints[trailPoints.length - 1],
    ]),
    [rawLatest, trailPoints],
  );
  const liveEta = liveEtaState?.scopeKey === etaScopeKey ? liveEtaState.eta : null;
  const eta = getNewestEta(etaQuery.data?.eta, liveEta);
  const delay = delayState?.scopeKey === scopeKey ? delayState.delay : null;

  const refetchLatest = latestQuery.refetch;
  const refetchTrail = trailQuery.refetch;
  const refetchEta = etaQuery.refetch;
  const refetchAll = useCallback(async (): Promise<void> => {
    if (!queryEnabled) return;

    const requests: Array<Promise<unknown>> = [refetchLatest()];
    if (!isShuttle) requests.push(refetchTrail());
    if (isShuttle || (stopId && hasValidStopId)) requests.push(refetchEta());
    await Promise.all(requests);
  }, [
    hasValidStopId,
    isShuttle,
    queryEnabled,
    refetchEta,
    refetchLatest,
    refetchTrail,
    stopId,
  ]);

  const queryFatalError = getFatalTrackingError([
    latestQuery.error,
    trailQuery.error,
    etaQuery.error,
  ]);
  const fatalError = activeFatalError ?? queryFatalError;

  return {
    latest,
    trailPoints,
    eta,
    delay,
    latestQuery,
    trailQuery,
    etaQuery,
    fatalError,
    realtimeStatus,
    isRealtimeConnected,
    hasAuthenticatedUser: Boolean(userId),
    hasValidTripId: hasValidTrackingId,
    hasValidTrackingId,
    hasValidStopId,
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
