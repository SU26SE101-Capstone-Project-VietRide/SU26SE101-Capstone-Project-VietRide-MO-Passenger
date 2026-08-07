import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  Bus,
  Crosshair,
  FlagCheckered,
  MapPin,
  NavigationArrow,
  Signpost,
  Target,
  Van,
} from 'phosphor-react-native';
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
  getTrackingMapPalette,
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

const MAP_PADDING = { top: 52, right: 16, bottom: 56, left: 16 } as const;
const OVERVIEW_PADDING = { top: 48, right: 32, bottom: 72, left: 32 } as const;
const VEHICLE_MARKER_ANCHOR = { x: 0.5, y: 0.5 } as const;
const STOP_MARKER_ANCHOR = { x: 0.5, y: 1 } as const;
const DEFAULT_FOLLOW_ZOOM = 15;
const MIN_ZOOM_LEVEL = 5;
const MAX_ZOOM_LEVEL = 19;
const FOLLOW_DISTANCE_KM = 0.01;
const MARKER_CONTRAST = '#FFFFFF';
const EMPTY_TRACKING_POINTS: readonly TrackingPoint[] = [];
const EMPTY_ROUTE: readonly GeoCoordinate[] = [];
const EMPTY_STOPS: readonly TrackingMapStop[] = [];

const MARKER_LABEL_KEYS: Record<TrackingMapMarkerKind, string> = {
  origin: 'tracking.boardingPoint',
  intermediate: 'tracking.map.routeStopMarker',
  next: 'tracking.map.nextStopMarker',
  target: 'tracking.map.targetStopMarker',
  destination: 'tracking.dropOff',
  shuttlePickup: 'tracking.map.ownPickupMarker',
  shuttleDropoff: 'tracking.map.ownDropoffMarker',
  shuttleStation: 'tracking.map.stationMarker',
};

const MARKER_Z_INDEX: Record<TrackingMapMarkerKind, number> = {
  intermediate: 2,
  origin: 3,
  destination: 4,
  next: 7,
  target: 8,
  shuttlePickup: 8,
  shuttleDropoff: 8,
  shuttleStation: 6,
};

const isEmphasizedKind = (kind: TrackingMapMarkerKind): boolean =>
  kind !== 'intermediate';

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
      return styles.markerOrigin;
    case 'destination':
      return styles.markerDestination;
    case 'next':
      return styles.markerNext;
    case 'target':
    case 'shuttlePickup':
    case 'shuttleDropoff':
      return styles.markerTarget;
    case 'shuttleStation':
      return styles.markerStation;
    default:
      return styles.markerIntermediate;
  }
};

function MarkerGlyph({
  kind,
  size,
  color = MARKER_CONTRAST,
}: {
  kind: TrackingMapMarkerKind;
  size: number;
  color?: string;
}): React.JSX.Element {
  const commonProps = {
    size,
    color,
    weight: 'fill' as const,
  };

  switch (kind) {
    case 'destination':
      return <FlagCheckered {...commonProps} />;
    case 'next':
      return <NavigationArrow {...commonProps} />;
    case 'target':
    case 'shuttlePickup':
    case 'shuttleDropoff':
      return <Target {...commonProps} />;
    case 'shuttleStation':
      return <Signpost {...commonProps} />;
    case 'origin':
      return <MapPin {...commonProps} />;
    default:
      return <MapPin {...commonProps} />;
  }
}

const SemanticStopMarker = React.memo(function SemanticStopMarkerComponent({
  coordinate,
  description,
  marker,
  styles,
  palette,
}: {
  coordinate: LatLng;
  description: string;
  marker: TrackingMapMarker;
  styles: ReturnType<typeof createStyles>;
  palette: ReturnType<typeof getTrackingMapPalette>;
}): React.JSX.Element {
  const emphasized = isEmphasizedKind(marker.kind);
  const sequenceLabel = marker.sequence != null && marker.sequence > 0
    ? String(marker.sequence)
    : null;
  const title = sequenceLabel
    ? `${sequenceLabel}. ${marker.name}`
    : marker.name;

  // Intermediate: numbered chip so order along the route is readable at a glance.
  if (marker.kind === 'intermediate') {
    return (
      <Marker
        coordinate={coordinate}
        title={title}
        description={description}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={false}
        zIndex={MARKER_Z_INDEX[marker.kind]}
      >
        <View collapsable={false} style={styles.intermediateWrap}>
          <View style={[styles.intermediateChip, markerStyleForKind(marker.kind, styles)]}>
            <Text style={[styles.intermediateNumber, { color: palette.sequenceText }]}>
              {sequenceLabel ?? '·'}
            </Text>
          </View>
        </View>
      </Marker>
    );
  }

  // Names live in the map journey dock — keep pins compact so the map stays readable.
  return (
    <Marker
      coordinate={coordinate}
      title={title}
      description={description}
      anchor={STOP_MARKER_ANCHOR}
      tracksViewChanges={false}
      zIndex={MARKER_Z_INDEX[marker.kind]}
    >
      <View collapsable={false} style={styles.emphasizedWrap}>
        {(marker.kind === 'next' || marker.kind === 'target') ? (
          <View
            style={[
              styles.emphasizedHalo,
              {
                backgroundColor: marker.kind === 'next'
                  ? palette.nextHalo
                  : palette.targetHalo,
              },
            ]}
          />
        ) : null}
        <View
          style={[
            styles.stopMarker,
            emphasized ? styles.stopMarkerEmphasized : null,
            markerStyleForKind(marker.kind, styles),
          ]}
        >
          <MarkerGlyph kind={marker.kind} size={emphasized ? 18 : 14} />
        </View>
        <View style={styles.markerStem} />
      </View>
    </Marker>
  );
});

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
      coordinate={animatedCoordinate}
      title={t('tracking.map.latestVehicle')}
      rotation={heading}
      anchor={VEHICLE_MARKER_ANCHOR}
      flat
      tracksViewChanges={false}
      zIndex={20}
    >
      <View collapsable={false} style={styles.vehicleHalo}>
        <View style={styles.vehicleMarker}>
          {vehicleKind === 'shuttle' ? (
            <Van size={20} color={MARKER_CONTRAST} weight="fill" />
          ) : (
            <Bus size={20} color={MARKER_CONTRAST} weight="fill" />
          )}
        </View>
      </View>
    </MarkerAnimated>
  );
}

export const NativeTrackingMap = React.memo(function NativeTrackingMapComponent({
  latest,
  trail,
  plannedRoute = EMPTY_ROUTE,
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
  const mapPalette = getTrackingMapPalette(theme.isDark);
  const trailPoints = trail ?? points ?? EMPTY_TRACKING_POINTS;
  const legacyMarkers = useMemo(
    () => legacyStopsToMarkers(stops ?? EMPTY_STOPS),
    [stops],
  );
  const mapMarkers = markers ?? legacyMarkers;
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
      || marker.kind === 'shuttleDropoff'
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
        loadingIndicatorColor={mapPalette.shuttleStation}
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
          <>
            <Polyline
              coordinates={plannedRouteCoordinates}
              strokeColor={mapPalette.plannedRouteHalo}
              strokeWidth={10}
              lineCap="round"
              lineJoin="round"
              zIndex={1}
            />
            <Polyline
              coordinates={plannedRouteCoordinates}
              strokeColor={mapPalette.plannedRoute}
              strokeWidth={6}
              lineCap="round"
              lineJoin="round"
              zIndex={2}
            />
          </>
        ) : null}

        {trailCoordinates.length > 1 ? (
          <>
            <Polyline
              coordinates={trailCoordinates}
              strokeColor={mapPalette.trailHalo}
              strokeWidth={9}
              lineCap="round"
              lineJoin="round"
              zIndex={3}
            />
            <Polyline
              coordinates={trailCoordinates}
              strokeColor={mapPalette.trail}
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
              zIndex={4}
            />
          </>
        ) : null}

        {markerCoordinates.map(({ marker, coordinate }) => (
          <SemanticStopMarker
            key={`${marker.kind}-${marker.id}`}
            coordinate={coordinate}
            description={t(MARKER_LABEL_KEYS[marker.kind])}
            marker={marker}
            styles={styles}
            palette={mapPalette}
          />
        ))}

        {latestCoordinate ? (
          <AnimatedVehicleMarker
            coordinate={latestCoordinate}
            heading={heading}
            vehicleKind={vehicleKind}
            reduceMotion={reduceMotion}
          />
        ) : null}
      </MapView>

      <View
        pointerEvents="none"
        style={styles.mapLegend}
        accessibilityRole="summary"
        accessibilityLabel={t('tracking.map.legendAccessibility')}
      >
        <View style={styles.legendRow}>
          <View style={[styles.legendSwatch, { backgroundColor: mapPalette.plannedRoute }]} />
          <Text style={styles.legendLabel} numberOfLines={1}>
            {t('tracking.map.legendPlannedRoute')}
          </Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendSwatch, { backgroundColor: mapPalette.trail }]} />
          <Text style={styles.legendLabel} numberOfLines={1}>
            {t('tracking.map.legendTrail')}
          </Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendSwatchRing, { borderColor: mapPalette.intermediateBorder }]}>
            <Text style={[styles.legendMiniNumber, { color: mapPalette.sequenceText }]}>2</Text>
          </View>
          <Text style={styles.legendLabel} numberOfLines={1}>
            {t('tracking.map.legendStopOrder')}
          </Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendSwatch, { backgroundColor: mapPalette.next }]} />
          <Text style={styles.legendLabel} numberOfLines={1}>
            {t('tracking.map.nextStopMarker')}
          </Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendSwatch, { backgroundColor: mapPalette.target }]} />
          <Text style={styles.legendLabel} numberOfLines={1}>
            {t('tracking.map.targetStopMarker')}
          </Text>
        </View>
      </View>

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
            <Crosshair size={18} color={mapPalette.target} weight="bold" />
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
            <MapPin size={18} color={mapPalette.target} weight="bold" />
            <Text style={styles.cameraButtonLabel} numberOfLines={1}>
              {t('tracking.map.viewRoute')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

const createStyles = (theme: AppTheme) => {
  const palette = getTrackingMapPalette(theme.isDark);
  const liquid = theme.effects.isLiquid;

  return {
    mapContainer: {
      flex: 1,
    },
    map: {
      flex: 1,
    },
    vehicleHalo: {
      width: 52,
      height: 52,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: borderRadius.full,
      backgroundColor: palette.vehicleHalo,
    },
    vehicleMarker: {
      width: 42,
      height: 42,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: borderRadius.full,
      borderWidth: 3,
      borderColor: MARKER_CONTRAST,
      backgroundColor: palette.vehicle,
    },
    intermediateWrap: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    intermediateChip: {
      minWidth: 28,
      height: 28,
      paddingHorizontal: 6,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: borderRadius.full,
      borderWidth: 2,
      borderColor: palette.intermediateBorder,
      backgroundColor: palette.intermediate,
    },
    intermediateNumber: {
      fontFamily: fontFamilies.bold,
      fontSize: 12,
      lineHeight: 14,
    },
    emphasizedWrap: {
      alignItems: 'center' as const,
    },
    emphasizedHalo: {
      position: 'absolute' as const,
      top: -6,
      width: 52,
      height: 52,
      borderRadius: borderRadius.full,
    },
    stopMarker: {
      width: 28,
      height: 28,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: borderRadius.full,
      borderWidth: 2.5,
      borderColor: MARKER_CONTRAST,
    },
    stopMarkerEmphasized: {
      width: 38,
      height: 38,
    },
    markerStem: {
      width: 3,
      height: 8,
      marginTop: -1,
      borderRadius: 2,
      backgroundColor: MARKER_CONTRAST,
      opacity: 0.92,
    },
    markerOrigin: {
      backgroundColor: palette.origin,
    },
    markerDestination: {
      backgroundColor: palette.destination,
    },
    markerIntermediate: {
      backgroundColor: palette.intermediate,
    },
    markerNext: {
      backgroundColor: palette.next,
    },
    markerTarget: {
      backgroundColor: palette.target,
    },
    markerStation: {
      backgroundColor: palette.shuttleStation,
    },
    mapLegend: {
      position: 'absolute' as const,
      left: spacing.sm,
      bottom: spacing.sm,
      maxWidth: 148,
      gap: 3,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: borderRadius.md,
      borderCurve: 'continuous' as const,
      borderWidth: 1,
      borderColor: liquid ? theme.effects.glassBorderStrong : palette.legendBorder,
      backgroundColor: liquid ? theme.effects.glassSurfaceStrong : palette.legendSurface,
      ...theme.effects.cardShadow,
    },
    legendRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
    },
    legendSwatch: {
      width: 12,
      height: 12,
      borderRadius: 3,
    },
    legendSwatchRing: {
      width: 16,
      height: 16,
      borderRadius: borderRadius.full,
      borderWidth: 1.5,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: palette.intermediate,
    },
    legendMiniNumber: {
      fontFamily: fontFamilies.bold,
      fontSize: 8,
      lineHeight: 9,
    },
    legendLabel: {
      flexShrink: 1,
      fontFamily: fontFamilies.medium,
      fontSize: 10,
      lineHeight: 13,
      color: theme.colors.textSecondary,
    },
    cameraControls: {
      position: 'absolute' as const,
      right: spacing.sm,
      bottom: spacing.sm,
      maxWidth: '44%' as const,
      alignItems: 'flex-end' as const,
      gap: spacing.sm,
    },
    cameraButton: {
      minHeight: 44,
      maxWidth: '100%' as const,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: liquid ? theme.effects.glassBorderStrong : palette.frameBorder,
      backgroundColor: liquid ? theme.effects.glassSurfaceStrong : theme.colors.surfaceElevated,
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
  };
};
