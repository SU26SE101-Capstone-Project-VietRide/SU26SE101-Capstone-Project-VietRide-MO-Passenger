import React, { Suspense, useMemo } from 'react';
import { Platform, Text, useWindowDimensions, View } from 'react-native';
import { MapPin } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

import { StatusChip, type StatusChipTone } from '@shared/components';
import { appConfig } from '@shared/constants/config';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks/useThemedStyles';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import type { GeoCoordinate } from '@shared/types/common';
import type { TrackingPoint } from '../api/trackingApi';
import {
  prepareTrackingMapData,
  type TrackingMapMarker,
  type TrackingMapStop,
} from './trackingMapModel';

export type { TrackingMapMarker, TrackingMapStop } from './trackingMapModel';

export type TrackingMapConnectionState =
  | 'live'
  | 'connecting'
  | 'stale'
  | 'offline'
  | 'terminal'
  | 'waiting';

interface TrackingMapProps {
  latest: TrackingPoint | null;
  trail?: readonly TrackingPoint[];
  plannedRoute?: readonly GeoCoordinate[];
  markers?: readonly TrackingMapMarker[];
  vehicleKind?: 'bus' | 'shuttle';
  connectionState?: TrackingMapConnectionState;
  /** @deprecated Compatibility aliases while callers migrate. */
  points?: readonly TrackingPoint[];
  /** @deprecated Compatibility aliases while callers migrate. */
  stops?: readonly TrackingMapStop[];
}

const LazyNativeTrackingMap = React.lazy(async () => {
  const module = await import('./NativeTrackingMap');
  return { default: module.NativeTrackingMap };
});

const EMPTY_POINTS: readonly TrackingPoint[] = [];
const EMPTY_ROUTE: readonly GeoCoordinate[] = [];
const EMPTY_MARKERS: readonly TrackingMapMarker[] = [];
const EMPTY_STOPS: readonly TrackingMapStop[] = [];

const CONNECTION_PRESENTATION: Record<
  TrackingMapConnectionState,
  { key: string; tone: StatusChipTone }
> = {
  live: { key: 'tracking.connection.liveLabel', tone: 'success' },
  connecting: { key: 'tracking.connection.connectingLabel', tone: 'info' },
  stale: { key: 'tracking.connection.staleLabel', tone: 'warning' },
  offline: { key: 'tracking.connection.offlineLabel', tone: 'neutral' },
  terminal: { key: 'tracking.connection.terminalLabel', tone: 'neutral' },
  waiting: { key: 'tracking.map.waitingGpsOverlay', tone: 'neutral' },
};

export function isNativeTrackingMapConfigured(): boolean {
  if (Platform.OS === 'android') {
    return appConfig.nativeGoogleMapsEnabled.android;
  }
  if (Platform.OS === 'ios') {
    return appConfig.nativeGoogleMapsEnabled.ios;
  }
  return false;
}

function MapPlaceholder({
  title,
  message,
}: {
  title: string;
  message: string;
}): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.unavailableMap} accessibilityRole="summary">
      <MapPin size={38} color={theme.colors.textTertiary} weight="duotone" />
      <Text style={styles.unavailableTitle}>{title}</Text>
      <Text style={styles.unavailableMessage}>{message}</Text>
    </View>
  );
}

export const TrackingMap = React.memo(function TrackingMapComponent({
  latest,
  trail,
  plannedRoute = EMPTY_ROUTE,
  markers,
  vehicleKind = 'bus',
  connectionState = 'waiting',
  points,
  stops = EMPTY_STOPS,
}: TrackingMapProps): React.JSX.Element {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const { height: viewportHeight } = useWindowDimensions();
  const inputTrail = trail ?? points ?? EMPTY_POINTS;
  const inputMarkers = useMemo<readonly TrackingMapMarker[]>(() => (
    markers ?? (stops.length > 0
      ? stops.map((stop) => ({ ...stop, kind: 'intermediate' as const }))
      : EMPTY_MARKERS)
  ), [markers, stops]);
  const staticMapData = useMemo(
    () => prepareTrackingMapData({
      latest: null,
      trail: EMPTY_POINTS,
      plannedRoute,
      markers: inputMarkers,
    }),
    [inputMarkers, plannedRoute],
  );
  const liveMapData = useMemo(
    () => prepareTrackingMapData({
      latest,
      trail: inputTrail,
    }),
    [inputTrail, latest],
  );
  const frameStyle = useMemo(
    () => ({ height: Math.min(420, Math.max(280, viewportHeight * 0.44)) }),
    [viewportHeight],
  );
  const hasMapContext = staticMapData.plannedRoute.length > 0
    || staticMapData.markers.length > 0;
  const shouldWaitForGps = !liveMapData.latest
    && hasMapContext
    && connectionState !== 'offline'
    && connectionState !== 'terminal';
  const effectiveConnectionState = shouldWaitForGps ? 'waiting' : connectionState;
  const connectionPresentation = CONNECTION_PRESENTATION[effectiveConnectionState];

  let content: React.ReactNode;
  let showConnectionChip = false;

  if (!isNativeTrackingMapConfigured()) {
    content = (
      <MapPlaceholder
        title={t('tracking.map.unavailableTitle')}
        message={appConfig.isProd
          ? t('tracking.map.unavailableProduction')
          : t('tracking.map.unavailableDevelopment')}
      />
    );
  } else if (!liveMapData.latest && !hasMapContext) {
    content = (
      <MapPlaceholder
        title={t('tracking.map.waitingTitle')}
        message={t(vehicleKind === 'shuttle'
          ? 'tracking.map.waitingShuttleMessage'
          : 'tracking.map.waitingMessage')}
      />
    );
  } else {
    showConnectionChip = true;
    content = (
      <Suspense
        fallback={(
          <MapPlaceholder
            title={t('tracking.map.loadingTitle')}
            message={t('tracking.map.loadingMessage')}
          />
        )}
      >
        <LazyNativeTrackingMap
          latest={liveMapData.latest}
          trail={liveMapData.trail}
          plannedRoute={staticMapData.plannedRoute}
          markers={staticMapData.markers}
          vehicleKind={vehicleKind}
        />
      </Suspense>
    );
  }

  return (
    <View style={[styles.mapFrame, frameStyle]}>
      {content}
      {showConnectionChip ? (
        <StatusChip
          label={t(connectionPresentation.key)}
          tone={connectionPresentation.tone}
          style={styles.connectionChip}
        />
      ) : null}
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  mapFrame: {
    overflow: 'hidden' as const,
    borderRadius: borderRadius.xl,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.contentBorderStrong
      : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : theme.colors.surfaceAlt,
  },
  connectionChip: {
    position: 'absolute' as const,
    top: spacing.md,
    left: spacing.md,
    zIndex: 30,
    maxWidth: '62%' as const,
    borderWidth: 1,
    borderColor: theme.effects.glassBorderStrong,
    ...theme.effects.cardShadow,
  },
  unavailableMap: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : theme.colors.surfaceAlt,
  },
  unavailableTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    textAlign: 'center' as const,
  },
  unavailableMessage: {
    maxWidth: 320,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
});
