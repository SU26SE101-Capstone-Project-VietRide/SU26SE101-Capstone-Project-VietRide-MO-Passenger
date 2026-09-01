import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  Broadcast,
  NavigationArrow,
  WarningCircle,
} from 'phosphor-react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import { useBookingReplacementTrip } from '@features/booking/hooks/useBookingHistory';
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
import { formatDateTime, formatTime } from '@shared/utils/format';
import { isUuid } from '@shared/utils/pathSegment';
import type {
  ShuttlePassengerContext,
  ShuttlePassengerPickup,
  ShuttleTrackingEta,
  TrackingEta,
  TrackingTarget,
  TripRouteContext,
} from '../api/trackingApi';
import type { GeoCoordinate } from '@shared/types/common';
import { isTerminalTrackingStatus, useTripTracking } from '../hooks/useTripTracking';
import { useTripSharing } from '../hooks/useTripSharing';
import {
  TrackingMap,
  type TrackingMapConnectionState,
  type TrackingMapMarker,
} from './TrackingMap';
import type { TrackingHeaderRoute } from './TrackingHeader';
import { getTrackingMapPalette } from './trackingMapStyles';
import { TrackingDetailsContent } from './TrackingDetailsContent';
import { TripTrackingMapExperience } from './TripTrackingMapExperience';
import {
  buildTripRoutePresentation,
  type TripRouteStopPresentation,
} from './tripRoutePresentation';
import type {
  TrackingSupplementalListItem,
  TrackingSupplementalListSection,
  UpcomingStopSheetItem,
  UpcomingStopTone,
} from './UpcomingStopsSheet';

export interface TrackingShareQuickAction {
  scopeKey: string;
  mode: 'share' | 'revoke';
  disabled: boolean;
  pending: boolean;
  onPress: () => void;
}

interface TrackingLayoutSlots {
  detailsFooter?: ReactNode;
  detailsListSection?: TrackingSupplementalListSection;
  refreshing?: boolean;
  onRefresh?: () => Promise<unknown> | unknown;
  onShareQuickActionChange?: (action: TrackingShareQuickAction | null) => void;
}

interface LiveMainTripTrackingPanelProps extends TrackingLayoutSlots {
  source?: 'trip';
  tripId: string;
  bookingId?: string;
  trackingTarget?: TrackingTarget;
  fallbackToTripDestinationTarget?: boolean;
  tripStatus?: TripLifecycleStatus;
  sourceTerminal?: boolean;
  terminalMessage?: string;
  onRouteHeaderChange?: (route: TrackingHeaderRoute | undefined) => void;
  onResolvedTripIdChange?: (tripId: string) => void;
}

interface LiveShuttleTrackingPanelProps extends TrackingLayoutSlots {
  source: 'shuttle';
  shuttleTripId: string;
  bookingId?: string;
  pickupOrder?: number;
}

type LiveTripTrackingPanelProps =
  | LiveMainTripTrackingPanelProps
  | LiveShuttleTrackingPanelProps;

type ProgressTone = 'next' | 'target' | 'station' | 'destination';

interface ProgressItem {
  id: string;
  label: string;
  name: string;
  detail?: string;
  tone: ProgressTone;
}

const TRIP_STATUS_REFRESH_MS = 60_000;
const STALE_LOCATION_MS = 30_000;
const STALE_CHECK_INTERVAL_MS = 15_000;
const EMPTY_INTERMEDIATE_STOPS: TripRouteContext['intermediateStops'] = [];
const EMPTY_PLANNED_ROUTE: readonly GeoCoordinate[] = [];

const isMainTripEta = (
  eta: TrackingEta | ShuttleTrackingEta | null,
): eta is TrackingEta => Boolean(eta && 'delayStatus' in eta);

const isShuttleEta = (
  eta: TrackingEta | ShuttleTrackingEta | null,
): eta is ShuttleTrackingEta => Boolean(eta && 'nextPickupOrder' in eta);

const progressDotStyleForTone = (
  tone: ProgressTone,
  styles: ReturnType<typeof createStyles>,
): object => {
  switch (tone) {
    case 'target':
      return styles.progressDotTarget;
    case 'station':
      return styles.progressDotStation;
    case 'destination':
      return styles.progressDotDestination;
    default:
      return styles.progressDotNext;
  }
};

const progressLabelStyleForTone = (
  tone: ProgressTone,
  styles: ReturnType<typeof createStyles>,
): object => {
  switch (tone) {
    case 'target':
      return styles.progressLabelTarget;
    case 'station':
      return styles.progressLabelStation;
    case 'destination':
      return styles.progressLabelDestination;
    default:
      return styles.progressLabelNext;
  }
};

/** Primitive props for stable memo under live ETA ticks (vercel RN list/memo skill). */
const JourneyDockRow = React.memo(function JourneyDockRowComponent({
  label,
  name,
  detail,
  tone,
  styles,
}: {
  label: string;
  name: string;
  detail?: string;
  tone: ProgressTone;
  styles: ReturnType<typeof createStyles>;
}): React.JSX.Element {
  return (
    <View style={styles.dockRow}>
      <View style={[styles.progressDot, progressDotStyleForTone(tone, styles)]} />
      <View style={styles.dockRowCopy}>
        <Text style={[styles.progressLabel, progressLabelStyleForTone(tone, styles)]}>
          {label}
        </Text>
        <Text style={styles.dockName} numberOfLines={1}>{name}</Text>
        {detail ? (
          <Text style={styles.dockDetail} numberOfLines={1}>{detail}</Text>
        ) : null}
      </View>
    </View>
  );
});

const MapJourneyDock = React.memo(function MapJourneyDockComponent({
  items,
  lastUpdateLabel,
  lastUpdateValue,
  speedLabel,
  speedValue,
  title,
  styles,
}: {
  items: readonly ProgressItem[];
  lastUpdateLabel: string;
  lastUpdateValue: string;
  speedLabel: string;
  speedValue: string;
  title: string;
  styles: ReturnType<typeof createStyles>;
}): React.JSX.Element {
  return (
    <View style={styles.dockBody}>
      <View style={styles.dockHeading}>
        <NavigationArrow size={16} color={styles.dockAccent.color} weight="fill" />
        <Text style={styles.dockTitle}>{title}</Text>
      </View>
      {items.map((item) => (
        <JourneyDockRow
          key={item.id}
          label={item.label}
          name={item.name}
          detail={item.detail}
          tone={item.tone}
          styles={styles}
        />
      ))}
      <View style={styles.dockMetrics}>
        <View style={styles.dockMetric}>
          <Broadcast size={14} color={styles.dockTrail.color} weight="fill" />
          <View style={styles.dockMetricCopy}>
            <Text style={styles.dockMetricLabel}>{lastUpdateLabel}</Text>
            <Text style={styles.dockMetricValue} numberOfLines={1}>{lastUpdateValue}</Text>
          </View>
        </View>
        <View style={styles.dockMetric}>
          <NavigationArrow size={14} color={styles.dockVehicle.color} weight="fill" />
          <View style={styles.dockMetricCopy}>
            <Text style={styles.dockMetricLabel}>{speedLabel}</Text>
            <Text style={styles.dockMetricValue} numberOfLines={1}>{speedValue}</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

const buildShuttleMarkers = (
  context: ShuttlePassengerContext | null,
  selectedPickup: ShuttlePassengerPickup | null,
  pickupName: string,
  dropoffName: string,
): TrackingMapMarker[] => {
  if (!context) return [];

  const markers: TrackingMapMarker[] = [];
  if (selectedPickup) {
    const isOutbound = context.direction === 'OUTBOUND_FROM_STATION';
    markers.push({
      id: `service:${selectedPickup.bookingId}`,
      name: selectedPickup.serviceAddress ?? (isOutbound ? dropoffName : pickupName),
      sequence: selectedPickup.pickupOrder,
      latitude: selectedPickup.latitude,
      longitude: selectedPickup.longitude,
      kind: isOutbound ? 'shuttleDropoff' : 'shuttlePickup',
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
  return markers.sort(
    (left, right) => (left.sequence ?? 0) - (right.sequence ?? 0),
  );
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
  const sourceTripId = props.source === 'shuttle' ? props.shuttleTripId : props.tripId;
  const bookingId = props.bookingId;
  const pickupOrder = props.source === 'shuttle' ? props.pickupOrder : undefined;
  const providedTrackingTarget = props.source === 'shuttle'
    ? undefined
    : props.trackingTarget;
  const fallbackToTripDestinationTarget = props.source === 'shuttle'
    ? false
    : (props.fallbackToTripDestinationTarget ?? false);
  const tripStatus = props.source === 'shuttle' ? undefined : props.tripStatus;
  const sourceTerminal = props.source === 'shuttle'
    ? false
    : (props.sourceTerminal ?? false);
  const terminalMessage = props.source === 'shuttle'
    ? undefined
    : props.terminalMessage;
  const onRouteHeaderChange = props.source !== 'shuttle'
    ? props.onRouteHeaderChange
    : undefined;
  const onResolvedTripIdChange = props.source !== 'shuttle'
    ? props.onResolvedTripIdChange
    : undefined;
  const detailsFooter = props.detailsFooter;
  const detailsListSection = props.detailsListSection;
  const externalRefreshing = props.refreshing ?? false;
  const externalRefresh = props.onRefresh;
  const onShareQuickActionChange = props.onShareQuickActionChange;
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const hasDetailsFooter = Boolean(
    detailsFooter
    || detailsListSection?.items.length
    || detailsListSection?.footer,
  );
  const userId = useAuthStore((state) => state.user?.id);
  const isFocused = useIsFocused();
  const isAppActive = useIsAppActive();
  const isOnline = useNetworkStatus();
  const hasValidRouteTripId = isUuid(sourceTripId);
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
  const sourceTripQuery = useTripDetail(
    !isShuttle && hasValidRouteTripId ? sourceTripId : undefined,
    {
      enabled: canLoadTrip,
      // This status gates the Share action. A cached SCHEDULED/BOARDING value
      // must not hide Share after the trip has moved to IN_PROGRESS.
      staleTimeMs: 0,
      refetchOnMount: 'always',
      getRefetchInterval: getTripRefetchInterval,
    },
  );
  const sourceTripStatus = sourceTripQuery.data?.status ?? tripStatus;
  const replacementQuery = useBookingReplacementTrip(
    bookingId ?? '',
    sourceTripId,
    !isShuttle && sourceTripStatus === 'DISRUPTED',
  );
  const replacementTripId = !isShuttle
    && replacementQuery.data?.tripId !== sourceTripId
    && isUuid(replacementQuery.data?.tripId)
      ? replacementQuery.data?.tripId
      : undefined;
  const tripId = replacementTripId ?? sourceTripId;
  const replacementTripQuery = useTripDetail(
    !isShuttle && replacementTripId ? replacementTripId : undefined,
    {
      enabled: canLoadTrip && Boolean(replacementTripId),
      staleTimeMs: 0,
      refetchOnMount: 'always',
      getRefetchInterval: getTripRefetchInterval,
    },
  );
  const tripQuery = replacementTripId ? replacementTripQuery : sourceTripQuery;
  const effectiveSourceTerminal = sourceTerminal && !replacementTripId;
  useEffect(() => {
    if (!isShuttle) onResolvedTripIdChange?.(tripId);
  }, [isShuttle, onResolvedTripIdChange, tripId]);
  const trackingTarget = useMemo<TrackingTarget | undefined>(() => {
    if (replacementTripId && replacementQuery.data?.trackingTarget) {
      return replacementQuery.data.trackingTarget;
    }
    if (providedTrackingTarget) return providedTrackingTarget;
    const destinationStationId = tripQuery.data?.destinationStationId;
    if (
      fallbackToTripDestinationTarget
      && destinationStationId
      && isUuid(destinationStationId)
    ) {
      return { kind: 'STATION', stationId: destinationStationId };
    }
    return undefined;
  }, [
    fallbackToTripDestinationTarget,
    providedTrackingTarget,
    replacementQuery.data?.trackingTarget,
    replacementTripId,
    tripQuery.data?.destinationStationId,
  ]);
  const effectiveTripStatus = tripQuery.data?.status ?? tripStatus;
  const tracking = useTripTracking(isShuttle
    ? {
        source: 'shuttle',
        shuttleTripId: tripId,
        ...(bookingId ? { bookingId } : {}),
        ...(pickupOrder !== undefined ? { pickupOrder } : {}),
      }
    : {
        source: 'trip',
        tripId,
        ...(trackingTarget ? { trackingTarget } : {}),
        tripStatus: effectiveTripStatus,
        sourceTerminal: effectiveSourceTerminal,
      });
  const {
    activeTripId,
    shareTrip,
    revokeTripShare,
    isSharing,
    isRevoking,
  } = useTripSharing();
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
  const nextEta = tracking.nextEta ?? null;
  const targetEta = tracking.targetEta ?? null;
  const plannedStopsById = useMemo(
    () => new Map((tripQuery.data?.stops ?? []).map((stop) => [stop.id, stop])),
    [tripQuery.data?.stops],
  );
  const destinationEta = useMemo(
    () => tracking.etas.find((eta) => (
      eta.targetKind === 'STATION'
      && eta.stationId === tripQuery.data?.destinationStationId
    )) ?? null,
    [tracking.etas, tripQuery.data?.destinationStationId],
  );
  const plannedNextStopId = useMemo(
    () => [...(tripQuery.data?.stops ?? [])]
      .filter((stop) => stop.status === undefined || stop.status === 'PENDING')
      .sort((left, right) => left.orderIndex - right.orderIndex)[0]?.id,
    [tripQuery.data?.stops],
  );
  const liveNextStopId = !isShuttle && isMainTripEta(nextEta) && nextEta.targetKind === 'STOP'
    ? nextEta.stopId
    : undefined;
  const nextStopId = liveNextStopId
    ?? (!tracking.latest && !nextEta ? plannedNextStopId : undefined);
  const tripPresentation = useMemo(() => buildTripRoutePresentation({
    context: routeContext,
    allowPlannedFallback: !tracking.latest,
    destinationPlannedArrivalTime: tripQuery.data?.estimatedArrivalDateTime,
    destinationPlannedStationId: tripQuery.data?.destinationStationId,
    originPlannedStationId: tripQuery.data?.originStationId,
    originStationName: tripQuery.data?.departureStation,
    destinationStationName: tripQuery.data?.arrivalStation,
    etas: tracking.latest ? tracking.etas : [],
    nextEta: isMainTripEta(nextEta) ? nextEta : null,
    plannedStops: tripQuery.data?.stops ?? [],
    target: trackingTarget,
  }), [
    routeContext,
    nextEta,
    tracking.etas,
    tracking.latest,
    trackingTarget,
    tripQuery.data?.arrivalStation,
    tripQuery.data?.departureStation,
    tripQuery.data?.destinationStationId,
    tripQuery.data?.estimatedArrivalDateTime,
    tripQuery.data?.originStationId,
    tripQuery.data?.stops,
  ]);
  const plannedRoute = routeContext?.geometry?.points ?? EMPTY_PLANNED_ROUTE;
  // Shuttle markers come only from passenger-context bootstrap (stable ref).
  // Trip markers: presentation model + hard guarantee that polyline endpoints
  // become origin/destination pins when station POIs are null (SCHEDULED trips
  // often have geometry but no live GPS and empty intermediateStops).
  const markers = useMemo(() => {
    if (isShuttle) {
      return buildShuttleMarkers(
        shuttleContext,
        selectedShuttlePickup,
        t('tracking.map.ownPickupMarker'),
        t('tracking.map.ownDropoffMarker'),
      );
    }

    const base = tripPresentation.markers;
    if (plannedRoute.length < 2) return base;

    const hasOrigin = base.some((marker) => marker.kind === 'origin');
    const hasDestination = base.some((marker) => (
      marker.kind === 'destination'
      || marker.id.startsWith('destination:')
    ));
    if (hasOrigin && hasDestination) return base;

    const next = [...base];
    if (!hasOrigin) {
      const start = plannedRoute[0];
      if (start) {
        next.unshift({
          id: `origin:${tripQuery.data?.originStationId ?? 'route-start'}`,
          kind: 'origin',
          latitude: start.latitude,
          longitude: start.longitude,
          name: tripQuery.data?.departureStation?.trim()
            || t('tracking.boardingPoint'),
        });
      }
    }
    if (!hasDestination) {
      const end = plannedRoute[plannedRoute.length - 1];
      if (end) {
        next.push({
          id: `destination:${tripQuery.data?.destinationStationId ?? 'route-end'}`,
          kind: 'destination',
          latitude: end.latitude,
          longitude: end.longitude,
          name: tripQuery.data?.arrivalStation?.trim()
            || t('tracking.dropOff'),
        });
      }
    }
    return next;
  }, [
    isShuttle,
    plannedRoute,
    selectedShuttlePickup,
    shuttleContext,
    t,
    tripPresentation.markers,
    tripQuery.data?.arrivalStation,
    tripQuery.data?.departureStation,
    tripQuery.data?.destinationStationId,
    tripQuery.data?.originStationId,
  ]);
  const routeHeader = useMemo<TrackingHeaderRoute | undefined>(() => {
    const originName = routeContext?.originStation?.name.trim()
      || tripQuery.data?.departureStation?.trim()
      || undefined;
    const destinationName = routeContext?.destinationStation?.name.trim()
      || tripQuery.data?.arrivalStation?.trim()
      || undefined;
    if (!originName && !destinationName) return undefined;

    return {
      ...(originName ? { originName } : {}),
      ...(destinationName ? { destinationName } : {}),
    };
  }, [
    routeContext?.destinationStation?.name,
    routeContext?.originStation?.name,
    tripQuery.data?.arrivalStation,
    tripQuery.data?.departureStation,
  ]);
  useEffect(() => {
    onRouteHeaderChange?.(routeHeader);
  }, [onRouteHeaderChange, routeHeader]);
  const requestErrors = useMemo(
    () => [
      tracking.latestQuery.error,
      tracking.trailQuery.error,
      tracking.nextEtaQuery.error,
      tracking.targetEtaQuery.error,
      tracking.contextQuery.error,
    ].filter((error): error is NonNullable<typeof error> => Boolean(error)),
    [
      tracking.contextQuery.error,
      tracking.latestQuery.error,
      tracking.nextEtaQuery.error,
      tracking.targetEtaQuery.error,
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
    || tracking.nextEtaQuery.isRefetching
    || tracking.targetEtaQuery.isRefetching
    || tracking.contextQuery.isRefetching,
  );
  const hasTripShareOwnerAccess = Boolean(
    !isShuttle
    && tracking.hasValidTrackingId
    && tracking.hasAuthenticatedUser
    && !tracking.fatalError
  );
  const revokeTripId = activeTripId === tripId || activeTripId === sourceTripId
    ? activeTripId
    : null;
  const hasActiveTripShare = Boolean(revokeTripId);
  const canCreateTripShare = Boolean(
    hasTripShareOwnerAccess
    && effectiveTripStatus === 'IN_PROGRESS'
    && !tracking.isTerminal
  );
  // BE resolves DELETE with the old Trip ID after vehicle substitution. Keep
  // revoke available for a grant activated in this screen even if the old trip
  // becomes terminal; never use this branch to create a new share link.
  const canRevokeTripShare = hasTripShareOwnerAccess && hasActiveTripShare;
  const isShareOperationPending = isSharing || isRevoking;

  const handleRetry = useCallback(() => {
    refetchAll().catch(() => undefined);
  }, [refetchAll]);
  const handleRefresh = useCallback(() => {
    const requests: Promise<unknown>[] = [refetchAll()];
    if (externalRefresh) requests.push(Promise.resolve(externalRefresh()));
    Promise.allSettled(requests).catch(() => undefined);
  }, [externalRefresh, refetchAll]);
  const handleShareTrip = useCallback(() => {
    if (!canCreateTripShare || !tracking.isOnline || isShareOperationPending) return;

    shareTrip({
      tripId,
      message: t('tracking.share.message'),
    }).catch(() => {
      Alert.alert(
        t('tracking.share.errorTitle'),
        t('tracking.share.errorDescription'),
      );
    });
  }, [
    canCreateTripShare,
    isShareOperationPending,
    shareTrip,
    t,
    tracking.isOnline,
    tripId,
  ]);
  const handleRevokeTripShare = useCallback(() => {
    if (!canRevokeTripShare || !tracking.isOnline || isShareOperationPending) return;

    Alert.alert(
      t('tracking.share.revokeConfirmTitle'),
      t('tracking.share.revokeConfirmDescription'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('tracking.share.revokeAction'),
          style: 'destructive',
          onPress: () => {
            if (!revokeTripId) return;
            revokeTripShare({ tripId: revokeTripId })
              .then((outcome) => {
                if (outcome === 'revoked') {
                  Alert.alert(
                    t('tracking.share.revokedTitle'),
                    t('tracking.share.revokedDescription'),
                  );
                }
              })
              .catch(() => {
                Alert.alert(
                  t('tracking.share.errorTitle'),
                  t('tracking.share.revokeErrorDescription'),
                );
              });
          },
        },
      ],
    );
  }, [
    canRevokeTripShare,
    isShareOperationPending,
    revokeTripShare,
    revokeTripId,
    t,
    tracking.isOnline,
  ]);
  const shareQuickAction = useMemo<TrackingShareQuickAction | null>(() => (
    canRevokeTripShare
      ? {
          scopeKey: tripId,
          mode: 'revoke',
          disabled: !tracking.isOnline || isShareOperationPending,
          pending: isShareOperationPending,
          onPress: handleRevokeTripShare,
        }
      : canCreateTripShare
        ? {
            scopeKey: tripId,
            mode: 'share',
            disabled: !tracking.isOnline || isShareOperationPending,
            pending: isShareOperationPending,
            onPress: handleShareTrip,
          }
        : null
  ), [
    canCreateTripShare,
    canRevokeTripShare,
    handleRevokeTripShare,
    handleShareTrip,
    isShareOperationPending,
    tracking.isOnline,
    tripId,
  ]);

  useEffect(() => {
    onShareQuickActionChange?.(shareQuickAction);
  }, [onShareQuickActionChange, shareQuickAction]);

  useEffect(() => () => {
    onShareQuickActionChange?.(null);
  }, [onShareQuickActionChange]);

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
    (eta: TrackingEta | ShuttleTrackingEta | null): string => {
      if (!eta) return t('tracking.details.waitingEta');
      if (isShuttleEta(eta)) {
        return t('tracking.details.shuttleEtaValue', {
          order: eta.nextPickupOrder,
          count: eta.etaMinutes,
          distance: formatDistance(eta.distanceMeters),
        });
      }
      return t('tracking.details.etaValue', {
        count: eta.etaMinutes,
        arrival: formatTime(eta.estimatedArrivalTime),
      });
    },
    [formatDistance, t],
  );

  const formatPlannedEta = useCallback(
    (estimatedArrivalTime?: string | null): string => {
      const arrival = estimatedArrivalTime
        ? formatTime(estimatedArrivalTime)
        : '';
      return arrival
        ? t('tracking.details.plannedEta', { arrival })
        : t('tracking.details.etaUnavailable');
    },
    [t],
  );

  const intermediateStops = routeContext?.intermediateStops ?? EMPTY_INTERMEDIATE_STOPS;
  const progressItems = useMemo<ProgressItem[]>(() => {
    if (isShuttle) {
      if (!selectedShuttlePickup) {
        return shuttleContext?.station
          ? [{
              id: 'station',
              label: t('tracking.map.stationMarker'),
              name: shuttleContext.station.name,
              detail: t('tracking.details.waitingEta'),
              tone: 'station',
            }]
          : [];
      }

      const isOutbound = shuttleContext?.direction === 'OUTBOUND_FROM_STATION';
      const serviceAddress = selectedShuttlePickup.serviceAddress
        ?? t(isOutbound
          ? 'tracking.map.ownDropoffMarker'
          : 'tracking.map.ownPickupMarker');
      const etaToOwnService = isShuttleEta(nextEta)
        && nextEta.nextPickupOrder === selectedShuttlePickup.pickupOrder
        ? nextEta
        : null;

      if (isOutbound) {
        const outboundItems: ProgressItem[] = [];
        if (selectedShuttlePickup.status === 'PENDING' && shuttleContext?.station) {
          const etaToStation = isShuttleEta(nextEta)
            && nextEta.nextPickupOrder === shuttleContext.station.pickupOrder
            ? nextEta
            : null;
          outboundItems.push({
            id: 'outbound-station',
            label: t('tracking.map.stationMarker'),
            name: shuttleContext.station.name,
            detail: etaToStation ? formatEta(etaToStation) : t('tracking.details.waitingEta'),
            tone: 'station',
          });
        }
        outboundItems.push({
          id: `own-dropoff:${selectedShuttlePickup.bookingId}`,
          label: t('tracking.map.ownDropoffMarker'),
          name: serviceAddress,
          detail: etaToOwnService
            ? formatEta(etaToOwnService)
            : t('tracking.progress.stopsBeforeDropoff', {
                count: selectedShuttlePickup.stopsBeforePickup,
              }),
          tone: 'target',
        });
        return outboundItems;
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
          tone: 'station',
        }];
      }

      return [{
        id: `own-pickup:${selectedShuttlePickup.bookingId}`,
        label: t('tracking.map.ownPickupMarker'),
        name: serviceAddress,
        detail: etaToOwnService
          ? formatEta(etaToOwnService)
          : t('tracking.progress.stopsBeforePickup', {
              count: selectedShuttlePickup.stopsBeforePickup,
            }),
        tone: 'target',
      }];
    }

    const items: ProgressItem[] = [];
    const nextStop = nextStopId
      ? intermediateStops.find((stop) => stop.stopId === nextStopId)
      : undefined;
    const targetStop = trackingTarget?.kind === 'STOP'
      ? intermediateStops.find((stop) => stop.stopId === trackingTarget.stopId)
      : undefined;
    const targetStation = trackingTarget?.kind === 'STATION' && routeContext?.destinationStation
      && routeContext.destinationStation.stationId === trackingTarget.stationId
      ? routeContext.destinationStation
      : undefined;

    // Same stop → single target row reusing ETA; different stops → two clear rows.
    if (nextStop && nextStop.stopId !== targetStop?.stopId) {
      items.push({
        id: `next:${nextStop.stopId}`,
        label: t('tracking.map.nextStopMarker'),
        name: nextStop.name,
        detail: isMainTripEta(nextEta)
          ? formatEta(nextEta)
          : formatPlannedEta(
              plannedStopsById.get(nextStop.stopId)?.estimatedArrivalTime,
            ),
        tone: 'next',
      });
    }
    if (targetStop) {
      const sharedEta = targetEta ?? (
        isMainTripEta(nextEta)
        && nextEta.targetKind === 'STOP'
        && nextEta.stopId === targetStop.stopId
          ? nextEta
          : null
      );
      items.push({
        id: `target:${targetStop.stopId}`,
        label: t('tracking.map.targetStopMarker'),
        name: targetStop.name,
        detail: sharedEta
          ? formatEta(sharedEta)
          : formatPlannedEta(
              plannedStopsById.get(targetStop.stopId)?.estimatedArrivalTime,
            ),
        tone: 'target',
      });
    } else if (targetStation) {
      items.push({
        id: `target-station:${targetStation.stationId}`,
        label: t('tracking.map.targetStopMarker'),
        name: targetStation.name,
        detail: isMainTripEta(targetEta ?? destinationEta)
          ? formatEta(targetEta ?? destinationEta)
          : formatPlannedEta(tripQuery.data?.estimatedArrivalDateTime),
        tone: 'destination',
      });
    }
    // nextEta:null must show waiting — never invent destination or Haversine ETA.
    if (items.length === 0) {
      items.push({
        id: 'waiting-next',
        label: t('tracking.map.nextStopMarker'),
        name: t('tracking.details.waitingEta'),
        detail: undefined,
        tone: 'next',
      });
    }
    return items;
  }, [
    formatEta,
    formatPlannedEta,
    intermediateStops,
    isShuttle,
    nextEta,
    nextStopId,
    destinationEta,
    plannedStopsById,
    routeContext?.destinationStation,
    selectedShuttlePickup,
    shuttleContext?.direction,
    shuttleContext?.station,
    t,
    targetEta,
    trackingTarget,
    tripQuery.data?.estimatedArrivalDateTime,
  ]);

  const routeStopToSheetItem = useCallback((
    stop: TripRouteStopPresentation,
  ): UpcomingStopSheetItem => {
    const tone: UpcomingStopTone = stop.isNext && stop.isTarget
      ? 'targetNext'
      : stop.isTarget
        ? 'target'
        : stop.isNext
          ? 'next'
          : stop.targetKind === 'STATION'
            ? 'destination'
            : 'default';
    const label = tone === 'targetNext'
      ? t('tracking.map.targetNextStopMarker')
      : tone === 'target'
        ? t('tracking.map.targetStopMarker')
        : tone === 'next'
          ? t('tracking.map.nextStopMarker')
          : tone === 'destination'
            ? t('tracking.dropOff')
            : t('tracking.map.routeStopMarker');

    return {
      id: stop.key,
      label,
      name: stop.name,
      detail: stop.eta
        ? formatEta(stop.eta)
        : formatPlannedEta(stop.plannedArrivalTime),
      ...(stop.targetKind === 'STOP' ? { sequence: stop.sequence } : {}),
      tone,
    };
  }, [formatEta, formatPlannedEta, t]);
  const tripSheetItems = useMemo(
    () => tripPresentation.upcomingStops.map(routeStopToSheetItem),
    [routeStopToSheetItem, tripPresentation.upcomingStops],
  );
  const tripSheetFeaturedItems = useMemo(() => {
    const featured = tripPresentation.featuredStops.map(routeStopToSheetItem);
    const items = [...featured];
    if (!tripPresentation.featuredStops.some((stop) => stop.isNext)) {
      items.unshift({
        id: 'next:unavailable',
        label: t('tracking.map.nextStopMarker'),
        name: t('tracking.progress.nextStopUnavailable'),
        detail: t('tracking.details.etaUnavailable'),
        tone: 'next' as const,
      });
    }

    if (trackingTarget && !tripPresentation.targetId) {
      items.push({
        id: 'target:unavailable',
        label: t('tracking.map.targetStopMarker'),
        name: t('tracking.progress.targetStopUnavailable'),
        detail: t('tracking.details.etaUnavailable'),
        tone: 'target' as const,
      });
    }

    return items;
  }, [
    routeStopToSheetItem,
    t,
    trackingTarget,
    tripPresentation.featuredStops,
    tripPresentation.targetId,
  ]);
  const renderMainTripMap = useCallback((bottomContentInset: number) => (
    <TrackingMap
      latest={tracking.latest}
      trail={tracking.trailPoints}
      plannedRoute={plannedRoute}
      markers={markers}
      vehicleKind="bus"
      connectionState={connectionState}
      showDrivenTrail={false}
      bottomContentInset={bottomContentInset}
      edgeToEdge
    />
  ), [
    connectionState,
    markers,
    plannedRoute,
    tracking.latest,
    tracking.trailPoints,
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
  } else if (isShuttle) {
    const lastUpdateValue = tracking.latest
      ? formatDateTime(tracking.latest.recordedAt)
      : t('tracking.metrics.waitingGps');
    const speedValue = tracking.latest?.speedKmh !== undefined
      ? `${Math.round(tracking.latest.speedKmh)} km/h`
      : t('tracking.metrics.notReported');
    const journeyDock = progressItems.length > 0 || tracking.latest
      ? (
        <MapJourneyDock
          items={progressItems}
          lastUpdateLabel={t('tracking.metrics.lastUpdate')}
          lastUpdateValue={lastUpdateValue}
          speedLabel={t('tracking.metrics.speed')}
          speedValue={speedValue}
          title={t('tracking.progress.title')}
          styles={styles}
        />
      )
      : null;
    hero = (
      <TrackingMap
        latest={tracking.latest}
        trail={tracking.trailPoints}
        plannedRoute={plannedRoute}
        markers={markers}
        vehicleKind="shuttle"
        connectionState={connectionState}
        bottomDock={journeyDock}
      />
    );
  } else {
    hero = null;
  }

  const targetInsight = !isShuttle && trackingTarget
    ? !tripPresentation.targetId
      ? t('tracking.target.unavailableHint')
      : trackingTarget.kind === 'STATION'
        ? t('tracking.target.stationHint')
        : t('tracking.target.stopHint')
    : !isShuttle && tracking.hasValidTrackingId && tracking.hasAuthenticatedUser && !tracking.fatalError
      ? t('tracking.target.missingHint')
      : null;
  const detailsContent = (
    <TrackingDetailsContent
      canCreateTripShare={canCreateTripShare}
      canRevokeTripShare={canRevokeTripShare}
      detailsFooter={detailsFooter}
      hasEtaRouteMismatch={!isShuttle && tripPresentation.hasEtaRouteMismatch}
      hasTrackingTarget={Boolean(trackingTarget)}
      isOnline={tracking.isOnline}
      isRevoking={isRevoking}
      isShareOperationPending={isShareOperationPending}
      isSharing={isSharing}
      isTerminal={tracking.isTerminal}
      onRetry={handleRetry}
      onRevokeTripShare={handleRevokeTripShare}
      onShareTrip={handleShareTrip}
      routeUnavailable={Boolean(routeContext && routeContext.geometry === null)}
      showPrimaryShareAction={!onShareQuickActionChange}
      targetInsight={targetInsight}
      terminalMessage={replacementTripId ? undefined : terminalMessage}
      transientError={Boolean(transientError)}
      {...(tracking.delay ? { delayMinutes: tracking.delay.delayMinutes } : {})}
    />
  );
  const renderSupplementalItem = useCallback<
    ListRenderItem<TrackingSupplementalListItem>
  >(
    ({ item }) => <>{item.content}</>,
    [],
  );
  const supplementalKeyExtractor = useCallback(
    (item: TrackingSupplementalListItem) => item.key,
    [],
  );
  const getSupplementalItemType = useCallback(
    (item: TrackingSupplementalListItem) => item.type,
    [],
  );
  const detailsListFooter = useMemo(
    () => detailsListSection?.footer
      ? (
          <View style={styles.detailsFooter}>
            {detailsListSection.footer}
          </View>
        )
      : null,
    [detailsListSection?.footer, styles.detailsFooter],
  );
  const canRenderTripSheet = Boolean(
    !isShuttle
    && tracking.hasValidTrackingId
    && tracking.hasAuthenticatedUser
    && !tracking.fatalError,
  );

  if (canRenderTripSheet) {
    return (
      <TripTrackingMapExperience
        featuredItems={tripSheetFeaturedItems}
        footer={detailsContent}
        items={tripSheetItems}
        onRefresh={handleRefresh}
        refreshing={externalRefreshing || trackingRefreshing}
        renderMap={renderMainTripMap}
        supplementalListSection={detailsListSection}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.mapHero,
          hasDetailsFooter ? styles.mapHeroWithSheet : null,
        ]}
      >
        {hero}
      </View>

      {detailsListSection ? (
        <FlashList
          style={hasDetailsFooter
            ? {
                ...styles.detailsScroll,
                ...styles.detailsScrollWithFooter,
              }
            : styles.detailsScroll}
          contentContainerStyle={styles.detailsContent}
          data={detailsListSection.items}
          getItemType={getSupplementalItemType}
          keyExtractor={supplementalKeyExtractor}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={detailsListFooter}
          ListHeaderComponent={detailsContent}
          onRefresh={handleRefresh}
          refreshing={externalRefreshing || trackingRefreshing}
          renderItem={renderSupplementalItem}
          showsVerticalScrollIndicator={hasDetailsFooter}
        />
      ) : (
        <ScrollView
          style={[
            styles.detailsScroll,
            hasDetailsFooter ? styles.detailsScrollWithFooter : null,
          ]}
          contentContainerStyle={styles.detailsContent}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={hasDetailsFooter}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          refreshControl={(
            <RefreshControl
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
              refreshing={externalRefreshing || trackingRefreshing}
              onRefresh={handleRefresh}
            />
          )}
        >
          {detailsContent}
        </ScrollView>
      )}
    </View>
  );
});

const createStyles = (theme: AppTheme) => {
  const palette = getTrackingMapPalette(theme.isDark);
  return {
  container: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden' as const,
  },
  /**
   * Map-first: always flex:1. With a details footer (Parcel), map keeps a
   * slightly larger flex share so the sheet scrolls instead of covering the map.
   */
  mapHero: {
    flex: 1,
    minHeight: 0,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  mapHeroWithSheet: {
    flex: 1.35,
  },
  detailsScroll: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
  },
  /** Bounded flex sibling so heavy footers scroll inside the sheet. */
  detailsScrollWithFooter: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
  },
  detailsContent: {
    flexGrow: 0,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  dockBody: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  dockHeading: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  dockTitle: {
    flex: 1,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  dockAccent: {
    color: theme.colors.primary,
  },
  dockTrail: {
    color: palette.trail,
  },
  dockVehicle: {
    color: palette.vehicle,
  },
  dockRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing.sm,
  },
  dockRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  dockName: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  dockDetail: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  dockMetrics: {
    flexDirection: 'row' as const,
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
  },
  dockMetric: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    minWidth: 0,
  },
  dockMetricCopy: {
    flex: 1,
    minWidth: 0,
  },
  dockMetricLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  dockMetricValue: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
  },
  pressed: {
    opacity: 0.78,
  },
  infoBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous' as const,
  },
  infoBannerAccent: {
    backgroundColor: palette.progressSurface,
    borderWidth: 1,
    borderColor: palette.frameBorder,
  },
  infoBannerMuted: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  infoBannerText: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: theme.colors.textPrimary,
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
    color: theme.colors.warningForeground,
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
  shareCard: {
    ...theme.components.card,
    gap: spacing.lg,
    padding: spacing.lg,
    borderColor: palette.frameBorder,
  },
  shareHeading: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing.md,
  },
  shareIcon: {
    width: 42,
    height: 42,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: borderRadius.full,
    backgroundColor: palette.progressSurface,
  },
  shareCopy: {
    flex: 1,
    minWidth: 0,
  },
  shareTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  shareDescription: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  sharePrivacy: {
    marginTop: spacing.sm,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    lineHeight: 16,
    color: theme.colors.textTertiary,
  },
  shareActions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
  },
  sharePrimaryButton: {
    minWidth: 170,
    minHeight: 48,
    flexGrow: 1,
    flexBasis: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.primary,
  },
  sharePrimaryText: {
    flexShrink: 1,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: theme.colors.textInverse,
    textAlign: 'center' as const,
  },
  shareRevokeButton: {
    minWidth: 150,
    minHeight: 48,
    flexGrow: 1,
    flexBasis: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: borderRadius.lg,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.errorLight,
  },
  shareRevokeText: {
    flexShrink: 1,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: theme.colors.error,
    textAlign: 'center' as const,
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  progressDot: {
    width: 10,
    height: 10,
    marginTop: 5,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceElevated
      : theme.colors.surfaceElevated,
  },
  progressDotNext: {
    backgroundColor: palette.next,
  },
  progressDotTarget: {
    backgroundColor: palette.target,
  },
  progressDotStation: {
    backgroundColor: palette.shuttleStation,
  },
  progressDotDestination: {
    backgroundColor: palette.destination,
  },
  progressLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    letterSpacing: 0.2,
    textTransform: 'uppercase' as const,
  },
  progressLabelNext: {
    color: palette.next,
  },
  progressLabelTarget: {
    color: palette.target,
  },
  progressLabelStation: {
    color: palette.shuttleStation,
  },
  progressLabelDestination: {
    color: palette.destination,
  },
  upcomingCard: {
    ...theme.components.card,
    gap: spacing.sm,
    padding: spacing.lg,
    borderColor: palette.frameBorder,
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
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  upcomingCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  upcomingEta: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
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
  };
};
