import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, Text, View } from 'react-native';
import { Bus, Crosshair, MapPin, Van } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import MapView, {
  AnimatedRegion,
  Marker,
  MarkerAnimated,
  Polyline,
  PROVIDER_GOOGLE,
  type LatLng,
  type MapViewProps,
} from 'react-native-maps';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks/useThemedStyles';
import { motionTokens, useMotion } from '@shared/motion';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import type { GeoCoordinate } from '@shared/types/common';
import { getGeoDistanceKm } from '@shared/utils/geo';
import type { TrackingPoint } from '../api/trackingApi';
import {
  type TrackingMapMarker,
  type TrackingMapMarkerKind,
  type TrackingMapStop,
} from './trackingMapModel';
import {
  LIQUID_DARK_MAP_STYLE,
  LIQUID_LIGHT_MAP_STYLE,
} from './trackingMapStyles';

interface NativeTrackingMapProps {
  latest: TrackingPoint | null;
  trail?: readonly TrackingPoint[];
  plannedRoute?: readonly GeoCoordinate[];
  markers?: readonly TrackingMapMarker[];
  vehicleKind?: 'bus' | 'shuttle';
  /** @deprecated Compatibility aliases while old callers migrate. */
  points?: readonly TrackingPoint[];
  /** @deprecated Compatibility aliases while old callers migrate. */
  stops?: readonly TrackingMapStop[];
}

type CameraMode = 'follow' | 'overview';

const MAP_PADDING = { top: 56, right: 16, bottom: 72, left: 16 } as const;
const OVERVIEW_PADDING = { top: 52, right: 36, bottom: 88, left: 36 } as const;
const VEHICLE_MARKER_ANCHOR = { x: 0.5, y: 0.5 } as const;
const STOP_MARKER_ANCHOR = { x: 0.5, y: 1 } as const;
const DEFAULT_FOLLOW_ZOOM = 15;
const MIN_ZOOM_LEVEL = 5;
const MAX_ZOOM_LEVEL = 19;
const FOLLOW_DISTANCE_KM = 0.01;
const MARKER_CONTRAST = '#FFFFFF';
const LIGHT_TRAIL_HALO = 'rgba(255, 255, 255, 0.94)';
const DARK_TRAIL_HALO = 'rgba(5, 19, 18, 0.94)';
const LIGHT_PLANNED_ROUTE = 'rgba(0, 91, 87, 0.42)';
const DARK_PLANNED_ROUTE = 'rgba(159, 255, 248, 0.48)';
const EMPTY_TRACKING_POINTS: readonly TrackingPoint[] = [];

const MARKER_LABEL_KEYS: Record<TrackingMapMarkerKind, string> = {
  origin: 'tracking.boardingPoint',
  intermediate: 'tracking.map.routeStopMarker',
  next: 'tracking.map.nextStopMarker',
  target: 'tracking.map.targetStopMarker',
  destination: 'tracking.dropOff',
  shuttlePickup: 'tracking.map.ownPickupMarker',
  shuttleStation: 'tracking.map.stationMarker',
};

const MARKER_Z_INDEX: Record<TrackingMapMarkerKind, number> = {
  intermediate: 2,
  origin: 3,
  destination: 3,
  next: 5,
  target: 6,
  shuttlePickup: 6,
  shuttleStation: 5,
};

const toCoordinate = (point: GeoCoordinate): LatLng => ({
  latitude: point.latitude,
  longitude: point.longitude,
});

const legacyStopsToMarkers = (
  stops: readonly TrackingMapStop[],
): TrackingMapMarker[] => stops.map((stop) => ({
  ...stop,
  kind: 'intermediate',
}));

const markerStyleForKind = (
  kind: TrackingMapMarkerKind,
  styles: ReturnType<typeof createStyles>,
): object => {
  switch (kind) {
    case 'origin':
    case 'shuttleStation':
      return styles.markerOrigin;
    case 'destination':
      return styles.markerDestination;
    case 'next':
      return styles.markerNext;
    case 'target':
    case 'shuttlePickup':
      return styles.markerTarget;
    default:
      return styles.markerIntermediate;
  }
};

function AnimatedVehicleMarker({
  coordinate,
  heading,
  vehicleKind,
  reduceMotion,
}: {
  coordinate: LatLng;
  heading: number;
  vehicleKind: 'bus' | 'shuttle';
  reduceMotion: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const animatedCoordinate = useRef(new AnimatedRegion({
    ...coordinate,
    latitudeDelta: 0,
    longitudeDelta: 0,
  })).current;
  const previousCoordinateRef = useRef(coordinate);

  useEffect(() => {
    const previous = previousCoordinateRef.current;
    if (
      previous.latitude === coordinate.latitude
      && previous.longitude === coordinate.longitude
    ) {
      return;
    }

    previousCoordinateRef.current = coordinate;
    // AnimatedRegion maps every region field to its own Animated.Value target;
    // its published type still inherits the scalar `toValue` requirement.
    const animationConfig = {
      ...coordinate,
      latitudeDelta: 0,
      longitudeDelta: 0,
      duration: reduceMotion ? 0 : motionTokens.duration.emphasis,
      useNativeDriver: false,
    } as Parameters<AnimatedRegion['timing']>[0];
    animatedCoordinate.timing(animationConfig).start();
  }, [animatedCoordinate, coordinate, reduceMotion]);

  return (
    <MarkerAnimated
      key={`vehicle-${theme.variant}`}
      coordinate={animatedCoordinate}
      title={t('tracking.map.latestVehicle')}
      rotation={heading}
      anchor={VEHICLE_MARKER_ANCHOR}
      flat
      tracksViewChanges={false}
      zIndex={20}
    >
      <View collapsable={false} style={styles.vehicleMarker}>
        {vehicleKind === 'shuttle' ? (
          <Van size={20} color={MARKER_CONTRAST} weight="fill" />
        ) : (
          <Bus size={20} color={MARKER_CONTRAST} weight="fill" />
        )}
      </View>
    </MarkerAnimated>
  );
}

export const NativeTrackingMap = React.memo(function NativeTrackingMapComponent({
  latest,
  trail,
  plannedRoute = [],
  markers,
  vehicleKind = 'bus',
  points,
  stops,
}: NativeTrackingMapProps): React.JSX.Element {
  const mapRef = useRef<MapView | null>(null);
  const isMapReadyRef = useRef(false);
  const hasFittedInitialViewportRef = useRef(false);
  const lastFollowedCoordinateRef = useRef<LatLng | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow');
  const theme = useTheme();
  const { t } = useTranslation();
  const { reduceMotion } = useMotion();
  const styles = useThemedStyles(createStyles);
  const trailPoints = trail ?? points ?? EMPTY_TRACKING_POINTS;
  const mapMarkers = markers ?? legacyStopsToMarkers(stops ?? []);
  const trailCoordinates = useMemo(
    () => trailPoints.map(toCoordinate),
    [trailPoints],
  );
  const plannedRouteCoordinates = useMemo(
    () => plannedRoute.map(toCoordinate),
    [plannedRoute],
  );
  const latestCoordinate = useMemo(
    () => (latest ? toCoordinate(latest) : null),
    [latest],
  );
  const markerCoordinates = useMemo(
    () => mapMarkers.map((marker) => ({
      marker,
      coordinate: toCoordinate(marker),
    })),
    [mapMarkers],
  );
  const routeOverviewCoordinates = useMemo(
    () => [
      ...plannedRouteCoordinates,
      ...markerCoordinates
        .filter(({ marker }) => marker.kind !== 'intermediate')
        .map(({ coordinate }) => coordinate),
    ],
    [markerCoordinates, plannedRouteCoordinates],
  );
  const fallbackOverviewCoordinates = useMemo(
    () => [
      ...(latestCoordinate ? [latestCoordinate] : []),
      ...markerCoordinates.map(({ coordinate }) => coordinate),
    ],
    [latestCoordinate, markerCoordinates],
  );
  const overviewCoordinates = plannedRouteCoordinates.length >= 2
    ? routeOverviewCoordinates
    : fallbackOverviewCoordinates;
  const focusCoordinate = latestCoordinate
    ?? markerCoordinates.find(({ marker }) => (
      marker.kind === 'target'
      || marker.kind === 'next'
      || marker.kind === 'shuttlePickup'
    ))?.coordinate
    ?? markerCoordinates.find(({ marker }) => marker.kind === 'origin')?.coordinate
    ?? markerCoordinates[0]?.coordinate
    ?? plannedRouteCoordinates[0]
    ?? null;
  const initialRegion = useMemo(() => ({
    latitude: focusCoordinate?.latitude ?? 0,
    longitude: focusCoordinate?.longitude ?? 0,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  }), [focusCoordinate]);
  const heading = latest?.headingDeg ?? 0;
  const canShowOverview = overviewCoordinates.length >= 2;

  const fitOverview = useCallback((animated: boolean) => {
    if (!mapRef.current || overviewCoordinates.length < 2) return;
    mapRef.current.fitToCoordinates(overviewCoordinates, {
      edgePadding: OVERVIEW_PADDING,
      animated: animated && !reduceMotion,
    });
  }, [overviewCoordinates, reduceMotion]);

  useEffect(() => {
    if (
      !isMapReadyRef.current
      || hasFittedInitialViewportRef.current
      || overviewCoordinates.length < 2
    ) {
      return;
    }

    hasFittedInitialViewportRef.current = true;
    setCameraMode('overview');
    fitOverview(false);
  }, [fitOverview, overviewCoordinates.length]);

  useEffect(() => {
    if (
      cameraMode !== 'follow'
      || !isMapReadyRef.current
      || !mapRef.current
      || !latestCoordinate
    ) {
      return;
    }

    const previous = lastFollowedCoordinateRef.current;
    const distanceKm = previous
      ? getGeoDistanceKm(previous, latestCoordinate)
      : null;
    if (previous && (distanceKm == null || distanceKm < FOLLOW_DISTANCE_KM)) return;

    lastFollowedCoordinateRef.current = latestCoordinate;
    mapRef.current.animateCamera(
      { center: latestCoordinate },
      { duration: reduceMotion ? 0 : motionTokens.duration.emphasis },
    );
  }, [cameraMode, latestCoordinate, reduceMotion]);

  const handleUserGesture = useCallback(() => {
    setCameraMode('overview');
  }, []);

  const handleRegionChangeComplete = useCallback<
    NonNullable<MapViewProps['onRegionChangeComplete']>
  >((_region, details) => {
    if (details.isGesture) handleUserGesture();
  }, [handleUserGesture]);

  const handleMapReady = useCallback(() => {
    isMapReadyRef.current = true;
    lastFollowedCoordinateRef.current = latestCoordinate;

    if (overviewCoordinates.length >= 2 && !hasFittedInitialViewportRef.current) {
      hasFittedInitialViewportRef.current = true;
      setCameraMode('overview');
      fitOverview(false);
    }
  }, [fitOverview, latestCoordinate, overviewCoordinates.length]);

  const handleFollowVehicle = useCallback(() => {
    if (!latestCoordinate) return;
    lastFollowedCoordinateRef.current = latestCoordinate;
    setCameraMode('follow');
    mapRef.current?.animateCamera(
      { center: latestCoordinate, zoom: DEFAULT_FOLLOW_ZOOM },
      { duration: reduceMotion ? 0 : motionTokens.duration.emphasis },
    );
  }, [latestCoordinate, reduceMotion]);

  const handleViewRoute = useCallback(() => {
    setCameraMode('overview');
    fitOverview(true);
  }, [fitOverview]);

  if (!focusCoordinate) return <View style={styles.map} />;

  return (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        customMapStyle={theme.isDark
          ? LIQUID_DARK_MAP_STYLE
          : LIQUID_LIGHT_MAP_STYLE}
        googleRenderer="LATEST"
        mapType="standard"
        mapPadding={MAP_PADDING}
        paddingAdjustmentBehavior="never"
        userInterfaceStyle={theme.isDark ? 'dark' : 'light'}
        minZoomLevel={MIN_ZOOM_LEVEL}
        maxZoomLevel={MAX_ZOOM_LEVEL}
        loadingEnabled
        loadingBackgroundColor={theme.colors.surfaceAlt}
        loadingIndicatorColor={theme.colors.primary}
        moveOnMarkerPress={false}
        pitchEnabled={false}
        rotateEnabled={false}
        scrollDuringRotateOrZoomEnabled={false}
        showsBuildings={false}
        showsCompass={false}
        showsIndoorLevelPicker={false}
        showsIndoors={false}
        showsMyLocationButton={false}
        showsPointsOfInterest={false}
        showsTraffic={false}
        showsUserLocation={false}
        toolbarEnabled={false}
        poiClickEnabled={false}
        onMapReady={handleMapReady}
        onPanDrag={handleUserGesture}
        onRegionChangeComplete={handleRegionChangeComplete}
        accessibilityLabel={t('tracking.map.accessibilityLabel')}
        accessibilityHint={t('tracking.map.accessibilityHint')}
      >
        {plannedRouteCoordinates.length > 1 ? (
          <Polyline
            coordinates={plannedRouteCoordinates}
            strokeColor={theme.isDark
              ? DARK_PLANNED_ROUTE
              : LIGHT_PLANNED_ROUTE}
            strokeWidth={6}
            lineCap="round"
            lineJoin="round"
            zIndex={1}
          />
        ) : null}

        {trailCoordinates.length > 1 ? (
          <>
            <Polyline
              coordinates={trailCoordinates}
              strokeColor={theme.isDark ? DARK_TRAIL_HALO : LIGHT_TRAIL_HALO}
              strokeWidth={8}
              lineCap="round"
              lineJoin="round"
              zIndex={2}
            />
            <Polyline
              coordinates={trailCoordinates}
              strokeColor={theme.colors.primary}
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
              zIndex={3}
            />
          </>
        ) : null}

        {markerCoordinates.map(({ marker, coordinate }) => {
          const emphasized = marker.kind !== 'intermediate';
          return (
            <Marker
              key={`${marker.kind}-${marker.id}-${theme.variant}`}
              coordinate={coordinate}
              title={marker.name}
              description={t(MARKER_LABEL_KEYS[marker.kind])}
              anchor={STOP_MARKER_ANCHOR}
              tracksViewChanges={false}
              zIndex={MARKER_Z_INDEX[marker.kind]}
            >
              <View
                collapsable={false}
                style={[
                  styles.stopMarker,
                  emphasized ? styles.stopMarkerEmphasized : null,
                  markerStyleForKind(marker.kind, styles),
                ]}
              >
                <MapPin
                  size={emphasized ? 19 : 15}
                  color={MARKER_CONTRAST}
                  weight="fill"
                />
              </View>
            </Marker>
          );
        })}

        {latestCoordinate ? (
          <AnimatedVehicleMarker
            coordinate={latestCoordinate}
            heading={heading}
            vehicleKind={vehicleKind}
            reduceMotion={reduceMotion}
          />
        ) : null}
      </MapView>

      <View style={styles.cameraControls} pointerEvents="box-none">
        {cameraMode === 'overview' && latestCoordinate ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('tracking.map.followAccessibility')}
            onPress={handleFollowVehicle}
            style={({ pressed }) => [
              styles.cameraButton,
              pressed ? styles.cameraButtonPressed : null,
            ]}
            hitSlop={4}
          >
            <Crosshair size={18} color={theme.colors.primary} weight="bold" />
            <Text style={styles.cameraButtonLabel} numberOfLines={1}>
              {t('tracking.map.followVehicle')}
            </Text>
          </Pressable>
        ) : null}

        {cameraMode === 'follow' && canShowOverview ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('tracking.map.viewRouteAccessibility')}
            onPress={handleViewRoute}
            style={({ pressed }) => [
              styles.cameraButton,
              pressed ? styles.cameraButtonPressed : null,
            ]}
            hitSlop={4}
          >
            <MapPin size={18} color={theme.colors.primary} weight="bold" />
            <Text style={styles.cameraButtonLabel} numberOfLines={1}>
              {t('tracking.map.viewRoute')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  vehicleMarker: {
    width: 44,
    height: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: borderRadius.full,
    borderWidth: 3,
    borderColor: MARKER_CONTRAST,
    backgroundColor: theme.colors.primary,
    ...theme.effects.floatingShadow,
  },
  stopMarker: {
    width: 26,
    height: 26,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: MARKER_CONTRAST,
  },
  stopMarkerEmphasized: {
    width: 34,
    height: 34,
  },
  markerOrigin: {
    backgroundColor: theme.colors.success,
  },
  markerDestination: {
    backgroundColor: theme.colors.error,
  },
  markerIntermediate: {
    backgroundColor: theme.colors.textSecondary,
  },
  markerNext: {
    backgroundColor: theme.colors.primary,
  },
  markerTarget: {
    backgroundColor: theme.colors.accentDark,
  },
  cameraControls: {
    position: 'absolute' as const,
    right: spacing.md,
    bottom: spacing.massive,
    maxWidth: '72%' as const,
    alignItems: 'flex-end' as const,
  },
  cameraButton: {
    minHeight: 48,
    maxWidth: '100%' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: theme.effects.glassBorderStrong,
    backgroundColor: theme.colors.surfaceElevated,
    ...theme.effects.floatingShadow,
  },
  cameraButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
  cameraButtonLabel: {
    flexShrink: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
});
