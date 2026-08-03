import { useCallback, useEffect, useMemo } from 'react';
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
export const TRACKING_SHUTTLE_CONTEXT_REFRESH_MS = 60_000;
const TRACKING_ROUTE_CONTEXT_GC_MS = 30 * 60_000;

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

  let selected: ShuttlePassengerPickup | null = null;
  for (const pickup of context.ownPickups) {
    if (pickup.status !== 'PENDING') continue;
    if (!selected || pickup.pickupOrder < selected.pickupOrder) selected = pickup;
  }
  return selected;
};

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
    () => isShuttle
      ? trackingKeys.shuttlePassengerContext(userId, trackingId)
      : trackingKeys.routeContext(userId, trackingId),
    [isShuttle, trackingId, userId],
  );
  const refreshInterval = isShuttle
    ? TRACKING_SHUTTLE_CONTEXT_REFRESH_MS
    : TRACKING_ROUTE_CONTEXT_REFRESH_MS;
  const clearShuttleContext = useCallback(() => {
    if (!isShuttle) return;

    queryClient
      .cancelQueries({ queryKey: contextKey, exact: true })
      .catch(() => undefined);
    queryClient.removeQueries({ queryKey: contextKey, exact: true });
  }, [contextKey, isShuttle, queryClient]);

  const contextQuery = useQuery<TrackingContextQueryData>({
    queryKey: contextKey,
    queryFn: ({ signal }) => {
      if (isShuttle) return getShuttlePassengerContext(trackingId, signal);

      const previous = queryClient.getQueryData<TripRouteContextCache>(contextKey);
      return getTripRouteContext(trackingId, previous, signal);
    },
    enabled,
    staleTime: isShuttle ? 0 : TRACKING_ROUTE_CONTEXT_REFRESH_MS,
    gcTime: isShuttle ? 0 : TRACKING_ROUTE_CONTEXT_GC_MS,
    retry: (failureCount, error) => !isFatalError(error) && failureCount < 2,
    refetchOnReconnect: false,
    refetchInterval: (query) => (
      pollingEnabled && !isFatalError(query.state.error)
        ? refreshInterval
        : false
    ),
  });

  useEffect(() => clearShuttleContext, [clearShuttleContext]);

  useEffect(() => {
    if (!isShuttle || retainSensitiveContext) return;

    // A native-stack screen can remain mounted after blur. Explicit eviction
    // prevents passenger pickup coordinates outliving the active map screen.
    clearShuttleContext();
  }, [clearShuttleContext, isShuttle, retainSensitiveContext]);

  const routeContext = !isShuttle
    ? (contextQuery.data as TripRouteContextCache | undefined)?.data ?? null
    : null;
  const shuttleContext = isShuttle
    ? (contextQuery.data as ShuttlePassengerContext | undefined) ?? null
    : null;
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
