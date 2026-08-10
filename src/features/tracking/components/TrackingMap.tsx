import React, { Suspense, useMemo, type ReactNode } from 'react';
import { Platform, Text, View } from 'react-native';
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
  bottomContentInset?: number;
  edgeToEdge?: boolean;
  showDrivenTrail?: boolean;
  /**
   * Chrome docked under the map canvas (journey progress, live metrics).
   * Renders inside the map frame — not an overlay on top of the map.
   */
  bottomDock?: ReactNode;
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

/**
 * Embedded map fills its parent flex slot (map/details split owns height).
 * Do not force a viewport-derived minHeight here — that clips short screens.
 * A small absolute floor only avoids a zero-height flash before layout.
 */
const EMBEDDED_MAP_FLOOR = 120;

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
  bottomContentInset = 0,
  edgeToEdge = false,
  showDrivenTrail = true,
  bottomDock,
  points,
  stops = EMPTY_STOPS,
}: TrackingMapProps): React.JSX.Element {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
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
  // Fill parent; short-screen / landscape height is owned by LiveTripTrackingPanel.
  const frameStyle = useMemo(
    () => ({
      flex: 1,
      minHeight: EMBEDDED_MAP_FLOOR,
      minWidth: 0,
    }),
    [],
  );
  const safeBottomContentInset = Number.isFinite(bottomContentInset)
    ? Math.max(0, bottomContentInset)
    : 0;
  const waitingOverlayInsetStyle = useMemo(
    () => ({ bottom: spacing.sm + safeBottomContentInset }),
    [safeBottomContentInset],
  );
  const hasMapContext = staticMapData.plannedRoute.length > 0
    || staticMapData.markers.length > 0;
  const shouldWaitForGps = !liveMapData.latest
    && hasMapContext
    && connectionState !== 'offline'
    && connectionState !== 'terminal';
  const effectiveConnectionState = shouldWaitForGps ? 'waiting' : connectionState;
  const connectionPresentation = CONNECTION_PRESENTATION[effectiveConnectionState];

  let mapCanvas: React.ReactNode;
  let showConnectionChip = false;

  if (!isNativeTrackingMapConfigured()) {
    mapCanvas = (
      <MapPlaceholder
        title={t('tracking.map.unavailableTitle')}
        message={appConfig.isProd
          ? t('tracking.map.unavailableProduction')
          : t('tracking.map.unavailableDevelopment')}
      />
    );
  } else if (!liveMapData.latest && !hasMapContext) {
    mapCanvas = (
      <MapPlaceholder
        title={t('tracking.map.waitingTitle')}
        message={t(vehicleKind === 'shuttle'
          ? 'tracking.map.waitingShuttleMessage'
          : 'tracking.map.waitingMessage')}
      />
    );
  } else {
    showConnectionChip = true;
    mapCanvas = (
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
          bottomContentInset={safeBottomContentInset}
          showDrivenTrail={showDrivenTrail}
        />
      </Suspense>
    );
  }

  const isWaitingGps = effectiveConnectionState === 'waiting';
  return (
    <View
      style={[
        styles.mapFrame,
        edgeToEdge ? styles.mapFrameEdgeToEdge : null,
        frameStyle,
      ]}
    >
      <View style={styles.mapCanvas}>
        {mapCanvas}
        {/*
          Overlay zoning (avoid stacking on legend bottom-left):
          - Top-center: camera segment lives inside NativeTrackingMap
          - Top-left: connected/stale/offline/terminal state
          - Bottom-right: waiting GPS for every tracking layout
          The native map receives bottomContentInset so the sheet never covers
          its legend, waiting state, or camera controls.
        */}
        {showConnectionChip && !isWaitingGps ? (
          <View pointerEvents="none" style={styles.connectionOverlayTopLeft}>
            <StatusChip
              label={t(connectionPresentation.key)}
              tone={connectionPresentation.tone}
              style={styles.connectionChip}
            />
          </View>
        ) : null}
        {showConnectionChip && isWaitingGps ? (
          <View
            pointerEvents="none"
            style={[styles.connectionOverlayBottomRight, waitingOverlayInsetStyle]}
            testID="tracking-waiting-gps-overlay"
          >
            <StatusChip
              label={t(connectionPresentation.key)}
              tone={connectionPresentation.tone}
              style={styles.connectionChip}
            />
          </View>
        ) : null}
      </View>
      {bottomDock ? (
        <View style={styles.bottomDock} accessibilityRole="summary">
          {bottomDock}
        </View>
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
  mapFrameEdgeToEdge: {
    borderWidth: 0,
    borderRadius: 0,
    borderCurve: 'circular' as const,
  },
  mapCanvas: {
    flex: 1,
    minHeight: 240,
  },
  connectionOverlayTopLeft: {
    position: 'absolute' as const,
    top: spacing.md + 44,
    left: spacing.md,
    zIndex: 30,
    alignItems: 'flex-start' as const,
    maxWidth: '48%' as unknown as number,
  },
  connectionOverlayBottomRight: {
    position: 'absolute' as const,
    right: spacing.sm,
    bottom: spacing.sm,
    zIndex: 30,
    alignItems: 'flex-end' as const,
    maxWidth: '52%' as unknown as number,
  },
  connectionChip: {
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorderStrong
      : theme.colors.divider,
    ...theme.effects.cardShadow,
  },
  bottomDock: {
    borderTopWidth: 1,
    borderTopColor: theme.effects.isLiquid
      ? theme.effects.glassBorder
      : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceStrong
      : theme.colors.surfaceElevated,
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
