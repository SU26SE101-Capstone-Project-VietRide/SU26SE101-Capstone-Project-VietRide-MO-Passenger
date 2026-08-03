import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  Broadcast,
  Clock,
  MapPin,
  NavigationArrow,
  WarningCircle,
  WifiSlash,
} from 'phosphor-react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import { useTripDetail } from '@features/trip/hooks';
import type { TripLifecycleStatus } from '@features/trip/types';
import { toApiError } from '@shared/api/errors';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useIsAppActive, useNetworkStatus, useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { formatDateTime } from '@shared/utils/format';
import { isUuid } from '@shared/utils/pathSegment';
import type {
  ShuttlePassengerContext,
  ShuttlePassengerPickup,
  ShuttleTrackingEta,
  TrackingEta,
  TripRouteContext,
} from '../api/trackingApi';
import type { GeoCoordinate } from '@shared/types/common';
import { isTerminalTrackingStatus, useTripTracking } from '../hooks/useTripTracking';
import {
  TrackingMap,
  type TrackingMapConnectionState,
  type TrackingMapMarker,
} from './TrackingMap';

interface TrackingLayoutSlots {
  detailsFooter?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => Promise<unknown> | unknown;
}

interface LiveMainTripTrackingPanelProps extends TrackingLayoutSlots {
  source?: 'trip';
  tripId: string;
  stopId?: string;
  tripStatus?: TripLifecycleStatus;
  sourceTerminal?: boolean;
  terminalMessage?: string;
}

interface LiveShuttleTrackingPanelProps extends TrackingLayoutSlots {
  source: 'shuttle';
  shuttleTripId: string;
  bookingId?: string;
}

type LiveTripTrackingPanelProps =
  | LiveMainTripTrackingPanelProps
  | LiveShuttleTrackingPanelProps;

interface ProgressItem {
  id: string;
  label: string;
  name: string;
  detail?: string;
}

const TRIP_STATUS_REFRESH_MS = 60_000;
const STALE_LOCATION_MS = 30_000;
const STALE_CHECK_INTERVAL_MS = 15_000;
const EMPTY_INTERMEDIATE_STOPS: TripRouteContext['intermediateStops'] = [];
const EMPTY_PLANNED_ROUTE: readonly GeoCoordinate[] = [];

const isMainTripEta = (
  eta: TrackingEta | ShuttleTrackingEta | null,
): eta is TrackingEta => Boolean(eta && 'stopId' in eta);

const isShuttleEta = (
  eta: TrackingEta | ShuttleTrackingEta | null,
): eta is ShuttleTrackingEta => Boolean(eta && 'nextPickupOrder' in eta);

const buildTripMarkers = (
  context: TripRouteContext | null,
  nextStopId: string | undefined,
  targetStopId: string | undefined,
): TrackingMapMarker[] => {
  if (!context) return [];

  const markers: TrackingMapMarker[] = [];
  if (context.originStation) {
    markers.push({
      id: `origin:${context.originStation.stationId}`,
      name: context.originStation.name,
      latitude: context.originStation.latitude,
      longitude: context.originStation.longitude,
      kind: 'origin',
    });
  }

  context.intermediateStops.forEach((stop) => {
    const kind = stop.stopId === targetStopId
      ? 'target'
      : stop.stopId === nextStopId
        ? 'next'
        : 'intermediate';
    markers.push({
      id: `stop:${stop.stopId}`,
      name: stop.name,
      sequence: stop.sequence,
      latitude: stop.latitude,
      longitude: stop.longitude,
      kind,
    });
  });

  if (context.destinationStation) {
    markers.push({
      id: `destination:${context.destinationStation.stationId}`,
      name: context.destinationStation.name,
      latitude: context.destinationStation.latitude,
      longitude: context.destinationStation.longitude,
      kind: 'destination',
    });
  }

  return markers;
};

const buildShuttleMarkers = (
  context: ShuttlePassengerContext | null,
  selectedPickup: ShuttlePassengerPickup | null,
  pickupName: string,
): TrackingMapMarker[] => {
  if (!context) return [];

  const markers: TrackingMapMarker[] = [];
  if (selectedPickup) {
    markers.push({
      id: `pickup:${selectedPickup.bookingId}`,
      name: pickupName,
      sequence: selectedPickup.pickupOrder,
      latitude: selectedPickup.latitude,
      longitude: selectedPickup.longitude,
      kind: 'shuttlePickup',
    });
  }
  if (context.station) {
    markers.push({
      id: `station:${context.station.stationId}`,
      name: context.station.name,
      sequence: context.station.pickupOrder,
      latitude: context.station.latitude,
      longitude: context.station.longitude,
      kind: 'shuttleStation',
    });
  }
  return markers;
};

function InlineState({
  title,
  message,
}: {
  title: string;
  message: string;
}): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.inlineState} accessibilityRole="summary">
      <WarningCircle size={38} color={theme.colors.textTertiary} weight="duotone" />
      <Text style={styles.inlineStateTitle}>{title}</Text>
      <Text style={styles.inlineStateMessage}>{message}</Text>
    </View>
  );
}

export const LiveTripTrackingPanel = React.memo(function LiveTripTrackingPanelComponent(
  props: LiveTripTrackingPanelProps,
): React.JSX.Element {
  const isShuttle = props.source === 'shuttle';
  const tripId = props.source === 'shuttle' ? props.shuttleTripId : props.tripId;
  const bookingId = props.source === 'shuttle' ? props.bookingId : undefined;
  const stopId = props.source === 'shuttle' ? undefined : props.stopId;
  const tripStatus = props.source === 'shuttle' ? undefined : props.tripStatus;
  const sourceTerminal = props.source === 'shuttle'
    ? false
    : (props.sourceTerminal ?? false);
  const terminalMessage = props.source === 'shuttle'
    ? undefined
    : props.terminalMessage;
  const detailsFooter = props.detailsFooter;
  const externalRefreshing = props.refreshing ?? false;
  const externalRefresh = props.onRefresh;
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const userId = useAuthStore((state) => state.user?.id);
  const isFocused = useIsFocused();
  const isAppActive = useIsAppActive();
  const isOnline = useNetworkStatus();
  const hasValidRouteTripId = isUuid(tripId);
  const [now, setNow] = useState(() => Date.now());
  const canLoadTrip = Boolean(
    !isShuttle
    && userId
    && hasValidRouteTripId
    && isFocused
    && isAppActive
    && isOnline,
  );
  const getTripRefetchInterval = useCallback(
    (trip: { status: TripLifecycleStatus } | undefined): number | false => (
      canLoadTrip
      && !sourceTerminal
      && !isTerminalTrackingStatus(trip?.status ?? tripStatus)
        ? TRIP_STATUS_REFRESH_MS
        : false
    ),
    [canLoadTrip, sourceTerminal, tripStatus],
  );
  const tripQuery = useTripDetail(
    !isShuttle && hasValidRouteTripId ? tripId : undefined,
    {
      enabled: canLoadTrip,
      staleTimeMs: TRIP_STATUS_REFRESH_MS,
      getRefetchInterval: getTripRefetchInterval,
    },
  );
  const effectiveTripStatus = tripQuery.data?.status ?? tripStatus;
  const tracking = useTripTracking(isShuttle
    ? {
        source: 'shuttle',
        shuttleTripId: tripId,
        ...(bookingId ? { bookingId } : {}),
      }
    : {
        source: 'trip',
        tripId,
        stopId,
        tripStatus: effectiveTripStatus,
        sourceTerminal,
      });
  const refetchAll = tracking.refetchAll;
  const hasLatestLocation = Boolean(tracking.latest);

  useEffect(() => {
    setNow(Date.now());
    if (!hasLatestLocation || !isFocused || !isAppActive || tracking.isTerminal) {
      return undefined;
    }

    const intervalId = setInterval(() => setNow(Date.now()), STALE_CHECK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [hasLatestLocation, isAppActive, isFocused, tracking.isTerminal]);

  const routeContext = tracking.routeContext ?? null;
  const shuttleContext = tracking.shuttleContext ?? null;
  const selectedShuttlePickup = tracking.selectedShuttlePickup ?? null;
  const nextEta = tracking.nextEta ?? (isShuttle ? tracking.eta : null);
  const targetEta = tracking.targetEta ?? (!isShuttle && isMainTripEta(tracking.eta)
    ? tracking.eta
    : null);
  const nextStopId = !isShuttle && isMainTripEta(nextEta)
    ? nextEta.stopId
    : undefined;
  const markers = useMemo(
    () => (isShuttle
      ? buildShuttleMarkers(
          shuttleContext,
          selectedShuttlePickup,
          t('tracking.map.ownPickupMarker'),
        )
      : buildTripMarkers(routeContext, nextStopId, stopId)),
    [
      isShuttle,
      nextStopId,
      routeContext,
      selectedShuttlePickup,
      shuttleContext,
      stopId,
      t,
    ],
  );
  const plannedRoute = routeContext?.geometry?.points ?? EMPTY_PLANNED_ROUTE;
  const requestErrors = useMemo(
    () => [
      tracking.latestQuery.error,
      tracking.trailQuery.error,
      tracking.etaQuery.error,
      tracking.contextQuery.error,
    ].filter((error): error is NonNullable<typeof error> => Boolean(error)),
    [
      tracking.contextQuery.error,
      tracking.etaQuery.error,
      tracking.latestQuery.error,
      tracking.trailQuery.error,
    ],
  );
  const transientError = requestErrors
    .map(toApiError)
    .find((error) => error.statusCode !== 403 && error.statusCode !== 404) ?? null;
  const recordedAtTimestamp = tracking.latest
    ? Date.parse(tracking.latest.recordedAt)
    : Number.NaN;
  const hasStaleLocation = Number.isFinite(recordedAtTimestamp)
    && now - recordedAtTimestamp >= STALE_LOCATION_MS;
  const connectionState: TrackingMapConnectionState = !tracking.isOnline
    ? 'offline'
    : tracking.isTerminal
      ? 'terminal'
      : !tracking.latest
        ? 'waiting'
        : hasStaleLocation || tracking.realtimeStatus === 'fallback'
          ? 'stale'
          : tracking.realtimeStatus === 'connected'
            ? 'live'
            : 'connecting';
  const trackingRefreshing = Boolean(
    tracking.latestQuery.isRefetching
    || tracking.trailQuery.isRefetching
    || tracking.etaQuery.isRefetching
    || tracking.contextQuery.isRefetching,
  );

  const handleRetry = useCallback(() => {
    refetchAll().catch(() => undefined);
  }, [refetchAll]);
  const handleRefresh = useCallback(() => {
    const requests: Promise<unknown>[] = [refetchAll()];
    if (externalRefresh) requests.push(Promise.resolve(externalRefresh()));
    Promise.allSettled(requests).catch(() => undefined);
  }, [externalRefresh, refetchAll]);
  const formatDistance = useCallback(
    (distanceMeters: number): string => (
      distanceMeters >= 1_000
        ? t('tracking.distanceKilometers', {
            value: (distanceMeters / 1_000).toFixed(1),
          })
        : t('tracking.distanceMeters', { value: distanceMeters })
    ),
    [t],
  );
  const formatEta = useCallback(
    (eta: TrackingEta | ShuttleTrackingEta | null): string => (
      eta
        ? t('tracking.details.etaValue', {
            count: eta.etaMinutes,
            distance: formatDistance(eta.distanceMeters),
          })
        : t('tracking.details.waitingEta')
    ),
    [formatDistance, t],
  );

  const intermediateStops = routeContext?.intermediateStops ?? EMPTY_INTERMEDIATE_STOPS;
  const nextStopIndex = nextStopId
    ? intermediateStops.findIndex((stop) => stop.stopId === nextStopId)
    : -1;
  const upcomingStops = useMemo(
    () => (nextStopIndex >= 0
      ? intermediateStops.slice(nextStopIndex, nextStopIndex + 3)
      : []),
    [intermediateStops, nextStopIndex],
  );
  const progressItems = useMemo<ProgressItem[]>(() => {
    if (isShuttle) {
      if (!selectedShuttlePickup) {
        return shuttleContext?.station
          ? [{
              id: 'station',
              label: t('tracking.map.stationMarker'),
              name: shuttleContext.station.name,
              detail: t('tracking.details.waitingEta'),
            }]
          : [];
      }

      if (selectedShuttlePickup.status === 'PICKED_UP') {
        const etaToStation = isShuttleEta(nextEta)
          && shuttleContext?.station
          && nextEta.nextPickupOrder === shuttleContext.station.pickupOrder
          ? nextEta
          : null;
        return [{
          id: 'picked-up',
          label: t('tracking.progress.pickedUp'),
          name: shuttleContext?.station?.name ?? t('common.notAvailable'),
          detail: etaToStation ? formatEta(etaToStation) : undefined,
        }];
      }

      const etaToOwnPickup = isShuttleEta(nextEta)
        && nextEta.nextPickupOrder === selectedShuttlePickup.pickupOrder
        ? nextEta
        : null;
      return [{
        id: 'own-pickup',
        label: t('tracking.map.ownPickupMarker'),
        name: t('tracking.progress.stopsBeforePickup', {
          count: selectedShuttlePickup.stopsBeforePickup,
        }),
        detail: etaToOwnPickup ? formatEta(etaToOwnPickup) : undefined,
      }];
    }

    const items: ProgressItem[] = [];
    const nextStop = nextStopId
      ? intermediateStops.find((stop) => stop.stopId === nextStopId)
      : undefined;
    const targetStop = stopId
      ? intermediateStops.find((stop) => stop.stopId === stopId)
      : undefined;

    if (nextStop && nextStop.stopId !== targetStop?.stopId) {
      items.push({
        id: `next:${nextStop.stopId}`,
        label: t('tracking.map.nextStopMarker'),
        name: nextStop.name,
        detail: isMainTripEta(nextEta) ? formatEta(nextEta) : undefined,
      });
    }
    if (targetStop) {
      items.push({
        id: `target:${targetStop.stopId}`,
        label: t('tracking.map.targetStopMarker'),
        name: targetStop.name,
        detail: formatEta(targetEta ?? (
          isMainTripEta(nextEta) && nextEta.stopId === targetStop.stopId
            ? nextEta
            : null
        )),
      });
    }
    if (items.length === 0 && routeContext?.destinationStation) {
      items.push({
        id: 'destination',
        label: t('tracking.dropOff'),
        name: routeContext.destinationStation.name,
        detail: t('tracking.details.waitingEta'),
      });
    }
    return items;
  }, [
    formatEta,
    intermediateStops,
    isShuttle,
    nextEta,
    nextStopId,
    routeContext?.destinationStation,
    selectedShuttlePickup,
    shuttleContext?.station,
    stopId,
    t,
    targetEta,
  ]);

  let hero: ReactNode;
  if (!tracking.hasValidTrackingId) {
    hero = (
      <InlineState
        title={t('tracking.states.unavailableTitle')}
        message={t(isShuttle
          ? 'tracking.states.invalidShuttleTripId'
          : 'tracking.states.invalidTripId')}
      />
    );
  } else if (!tracking.hasAuthenticatedUser) {
    hero = (
      <InlineState
        title={t('tracking.states.signInTitle')}
        message={t('tracking.states.signInMessage')}
      />
    );
  } else if (tracking.fatalError) {
    const isForbidden = tracking.fatalError.statusCode === 403;
    hero = (
      <InlineState
        title={isForbidden
          ? t('tracking.states.deniedTitle')
          : t('tracking.states.notFoundTitle')}
        message={isForbidden
          ? t('tracking.states.deniedMessage')
          : t(isShuttle
            ? 'tracking.states.shuttleNotFoundMessage'
            : 'tracking.states.notFoundMessage')}
      />
    );
  } else {
    hero = (
      <TrackingMap
        latest={tracking.latest}
        trail={tracking.trailPoints}
        plannedRoute={plannedRoute}
        markers={markers}
        vehicleKind={isShuttle ? 'shuttle' : 'bus'}
        connectionState={connectionState}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapHero}>{hero}</View>

      <ScrollView
        style={styles.detailsScroll}
        contentContainerStyle={styles.detailsContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
            refreshing={externalRefreshing || trackingRefreshing}
            onRefresh={handleRefresh}
          />
        )}
      >
        {!tracking.isOnline ? (
          <View style={styles.warningBanner}>
            <WifiSlash size={18} color={theme.colors.warning} />
            <Text style={styles.warningBannerText}>
              {t('tracking.connection.offline')}
            </Text>
          </View>
        ) : null}

        {tracking.delay && !tracking.isTerminal ? (
          <View style={styles.warningBanner}>
            <Clock size={18} color={theme.colors.warning} />
            <Text style={styles.warningBannerText}>
              {t('tracking.delayMinutes', { count: tracking.delay.delayMinutes })}
            </Text>
          </View>
        ) : null}

        {tracking.isTerminal ? (
          <View style={styles.neutralBanner}>
            <Clock size={18} color={theme.colors.textSecondary} />
            <Text style={styles.neutralBannerText}>
              {terminalMessage ?? t('tracking.tripComplete')}
            </Text>
          </View>
        ) : null}

        {transientError ? (
          <View style={styles.errorBanner}>
            <WarningCircle size={18} color={theme.colors.error} />
            <Text style={styles.errorBannerText} numberOfLines={2}>
              {t('tracking.errors.refresh')}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={handleRetry}
              style={({ pressed }) => [
                styles.retryButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {progressItems.length > 0 || tracking.latest ? (
          <View style={styles.progressCard}>
            <View style={styles.progressHeading}>
              <NavigationArrow size={22} color={theme.colors.primary} weight="duotone" />
              <Text style={styles.progressTitle}>
                {t('tracking.progress.title')}
              </Text>
            </View>

            {progressItems.map((item) => (
              <View key={item.id} style={styles.progressRow}>
                <View style={styles.progressDot} />
                <View style={styles.progressRowContent}>
                  <Text style={styles.progressLabel}>{item.label}</Text>
                  <Text style={styles.progressName}>{item.name}</Text>
                  {item.detail ? (
                    <Text style={styles.progressDetail}>{item.detail}</Text>
                  ) : null}
                </View>
              </View>
            ))}

            <View style={styles.metadataRow}>
              <View style={styles.metadataItem}>
                <Broadcast size={18} color={theme.colors.primary} weight="duotone" />
                <View style={styles.metadataText}>
                  <Text style={styles.metadataLabel}>
                    {t('tracking.metrics.lastUpdate')}
                  </Text>
                  <Text style={styles.metadataValue}>
                    {tracking.latest
                      ? formatDateTime(tracking.latest.recordedAt)
                      : t('tracking.metrics.waitingGps')}
                  </Text>
                </View>
              </View>
              <View style={styles.metadataItem}>
                <NavigationArrow size={18} color={theme.colors.primary} weight="duotone" />
                <View style={styles.metadataText}>
                  <Text style={styles.metadataLabel}>
                    {t('tracking.metrics.speed')}
                  </Text>
                  <Text style={styles.metadataValue}>
                    {tracking.latest?.speedKmh !== undefined
                      ? `${Math.round(tracking.latest.speedKmh)} km/h`
                      : t('tracking.metrics.notReported')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {!isShuttle && upcomingStops.length > 0 ? (
          <View style={styles.upcomingCard}>
            <Text style={styles.upcomingTitle}>
              {t('tracking.progress.upcomingStops')}
            </Text>
            {upcomingStops.map((stop) => (
              <View key={stop.stopId} style={styles.upcomingRow}>
                <MapPin size={17} color={theme.colors.primary} weight="duotone" />
                <Text style={styles.upcomingName} numberOfLines={2}>
                  {stop.name}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {routeContext && routeContext.geometry === null ? (
          <View style={styles.neutralBanner}>
            <MapPin size={18} color={theme.colors.textSecondary} />
            <Text style={styles.neutralBannerText}>
              {t('tracking.progress.routeUnavailable')}
            </Text>
          </View>
        ) : null}

        {__DEV__ ? (
          <View style={styles.diagnosticsCard}>
            <Text style={styles.diagnosticsText}>
              {tracking.latest
                ? `${tracking.latest.latitude.toFixed(6)}, ${tracking.latest.longitude.toFixed(6)}`
                : t('common.notAvailable')}
            </Text>
            <Text style={styles.diagnosticsText}>
              {`trail=${tracking.trailPoints.length}`}
            </Text>
          </View>
        ) : null}

        {detailsFooter ? <View style={styles.detailsFooter}>{detailsFooter}</View> : null}
      </ScrollView>
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    minHeight: 0,
  },
  mapHero: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  detailsScroll: {
    flex: 1,
  },
  detailsContent: {
    flexGrow: 1,
    gap: spacing.lg,
    padding: spacing.xl,
    paddingBottom: spacing.huge,
  },
  pressed: {
    opacity: 0.78,
  },
  warningBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.warningLight,
  },
  warningBannerText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.warning,
  },
  neutralBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.surfaceAlt,
  },
  neutralBannerText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  errorBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.errorLight,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.error,
  },
  retryButton: {
    minHeight: 44,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.error,
  },
  retryButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textInverse,
  },
  progressCard: {
    ...theme.components.elevatedCard,
    gap: spacing.md,
    padding: spacing.lg,
  },
  progressHeading: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  progressTitle: {
    flex: 1,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  progressRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
  },
  progressDot: {
    width: 10,
    height: 10,
    marginTop: 6,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceElevated
      : theme.colors.surfaceElevated,
    backgroundColor: theme.colors.primary,
  },
  progressRowContent: {
    flex: 1,
    minWidth: 0,
  },
  progressLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  progressName: {
    marginTop: 2,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    lineHeight: 22,
    color: theme.colors.textPrimary,
  },
  progressDetail: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  metadataRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
  },
  metadataItem: {
    minWidth: 140,
    flexGrow: 1,
    flexBasis: 0,
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing.sm,
  },
  metadataText: {
    flex: 1,
    minWidth: 0,
  },
  metadataLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: theme.colors.textTertiary,
  },
  metadataValue: {
    marginTop: 2,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: theme.colors.textPrimary,
  },
  upcomingCard: {
    ...theme.components.card,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  upcomingTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  upcomingRow: {
    minHeight: 40,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  upcomingName: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  diagnosticsCard: {
    ...theme.components.surface,
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  diagnosticsText: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    color: theme.colors.textTertiary,
  },
  detailsFooter: {
    gap: spacing.md,
  },
  inlineState: {
    ...theme.components.card,
    minHeight: 280,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  inlineStateTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
    textAlign: 'center' as const,
  },
  inlineStateMessage: {
    maxWidth: 360,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 21,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
});
