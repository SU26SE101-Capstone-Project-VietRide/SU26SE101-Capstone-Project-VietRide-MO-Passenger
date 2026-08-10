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
  showDrivenTrail?: boolean;
  bottomContentInset?: number;
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
  targetNext: 'tracking.map.targetNextStopMarker',
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
  targetNext: 9,
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
    case 'targetNext':
      return styles.markerTarget;
    case 'shuttlePickup':
    case 'shuttleDropoff':
      return styles.markerShuttleTarget;
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
    case 'targetNext':
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
  const isNextMarker = marker.kind === 'next';
  const isTargetMarker = marker.kind === 'target' || marker.kind === 'targetNext';
  const sequenceLabel = marker.sequence != null && marker.sequence > 0
    ? String(marker.sequence)
    : null;
  const title = sequenceLabel
    ? `${sequenceLabel}. ${marker.name}`
    : marker.name;
  const persistentLabel = isNextMarker || isTargetMarker ? description : null;

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

  // Keep semantic roles visible; tapping the marker reveals the full stop name.
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
        {persistentLabel ? (
          <View
            style={[
              styles.semanticLabel,
              {
                backgroundColor: isNextMarker ? palette.next : palette.target,
              },
            ]}
          >
            <Text
              style={[
                styles.semanticLabelText,
                { color: isNextMarker ? MARKER_CONTRAST : palette.targetGlyph },
              ]}
              numberOfLines={1}
            >
              {persistentLabel}
            </Text>
          </View>
        ) : null}
        {persistentLabel ? (
          <View
            style={[
              styles.emphasizedHalo,
              {
                backgroundColor: isNextMarker
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
          <MarkerGlyph
            kind={marker.kind}
            size={emphasized ? 18 : 14}
            color={isTargetMarker ? palette.targetGlyph : MARKER_CONTRAST}
          />
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
      testID="tracking-vehicle-marker"
    >
      <View collapsable={false} style={styles.vehicleHalo}>
        <View
          style={styles.vehicleMarker}
          testID={vehicleKind === 'shuttle'
            ? 'tracking-shuttle-vehicle-glyph'
            : 'tracking-bus-vehicle-glyph'}
        >
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
  showDrivenTrail = true,
  bottomContentInset = 0,
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
  const safeBottomContentInset = Number.isFinite(bottomContentInset)
    ? Math.max(0, bottomContentInset)
    : 0;
  const mapPadding = useMemo(() => ({
    ...MAP_PADDING,
    bottom: MAP_PADDING.bottom + safeBottomContentInset,
  }), [safeBottomContentInset]);
  const overviewPadding = useMemo(() => ({
    ...OVERVIEW_PADDING,
    bottom: OVERVIEW_PADDING.bottom + safeBottomContentInset,
  }), [safeBottomContentInset]);

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
      || marker.kind === 'targetNext'
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
  const currentSpeedKmh = latest?.speedKmh;
  const speedLabel = vehicleKind === 'bus'
    && currentSpeedKmh !== undefined
    && Number.isFinite(currentSpeedKmh)
    && currentSpeedKmh >= 0
    ? `${Math.round(currentSpeedKmh)} km/h`
    : null;
  const canShowOverview = overviewCoordinates.length >= 2;

  const fitOverview = useCallback((animated: boolean) => {
    if (!mapRef.current || overviewCoordinates.length < 2) return;
    mapRef.current.fitToCoordinates(overviewCoordinates, {
      edgePadding: overviewPadding,
      animated: animated && !reduceMotion,
    });
  }, [overviewCoordinates, overviewPadding, reduceMotion]);

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
        mapPadding={mapPadding}
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

        {showDrivenTrail && trailCoordinates.length > 1 ? (
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

        {latestCoordinate && latest ? (
          <AnimatedVehicleMarker
            coordinate={latestCoordinate}
            heading={heading}
            vehicleKind={vehicleKind}
            reduceMotion={reduceMotion}
          />
        ) : null}
      </MapView>

      {speedLabel ? (
        <View
          accessible
          accessibilityLabel={`${t('tracking.metrics.speed')}: ${speedLabel}`}
          accessibilityRole="summary"
          pointerEvents="none"
          style={styles.speedBadge}
          testID="tracking-speed-badge"
        >
          <View style={styles.speedBadgeDot} />
          <Text style={styles.speedBadgeValue} testID="tracking-speed-badge-value">
            {speedLabel}
          </Text>
        </View>
      ) : null}

      <View
        pointerEvents="none"
        style={[
          styles.mapLegend,
          { bottom: spacing.sm + safeBottomContentInset },
        ]}
        accessibilityRole="summary"
        accessibilityLabel={t('tracking.map.legendAccessibility')}
      >
        {plannedRouteCoordinates.length >= 2 ? (
          <View style={styles.legendRow} testID="tracking-map-legend-planned-route">
            <View style={[styles.legendSwatch, { backgroundColor: mapPalette.plannedRoute }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {t('tracking.map.legendPlannedRoute')}
            </Text>
          </View>
        ) : null}
        {showDrivenTrail && trailCoordinates.length >= 2 ? (
          <View style={styles.legendRow}>
            <View style={[styles.legendSwatch, { backgroundColor: mapPalette.trail }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {t('tracking.map.legendTrail')}
            </Text>
          </View>
        ) : null}
        {markerCoordinates.some(({ marker }) => marker.sequence !== undefined) ? (
          <View style={styles.legendRow}>
            <View style={[styles.legendSwatchRing, { borderColor: mapPalette.intermediateBorder }]}>
              <Text style={[styles.legendMiniNumber, { color: mapPalette.sequenceText }]}>2</Text>
            </View>
            <Text style={styles.legendLabel} numberOfLines={1}>
              {t('tracking.map.legendStopOrder')}
            </Text>
          </View>
        ) : null}
        {markerCoordinates.some(({ marker }) => (
          marker.kind === 'next' || marker.kind === 'targetNext'
        )) ? (
          <View style={styles.legendRow}>
            <View style={[styles.legendSwatch, { backgroundColor: mapPalette.next }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {t('tracking.map.nextStopMarker')}
            </Text>
          </View>
        ) : null}
        {markerCoordinates.some(({ marker }) => (
          marker.kind === 'target' || marker.kind === 'targetNext'
        )) ? (
          <View style={styles.legendRow}>
            <View style={[styles.legendSwatch, { backgroundColor: mapPalette.target }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {t('tracking.map.targetStopMarker')}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Segmented camera control — always visible so “Theo xe / Toàn tuyến” is discoverable. */}
      {(latestCoordinate || canShowOverview) ? (
        <View style={styles.cameraControls} pointerEvents="box-none">
          <View style={styles.cameraSegment}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: cameraMode === 'follow', disabled: !latestCoordinate }}
              accessibilityLabel={t('tracking.map.followAccessibility')}
              disabled={!latestCoordinate}
              onPress={handleFollowVehicle}
              style={({ pressed }) => [
                styles.cameraSegmentItem,
                cameraMode === 'follow' ? styles.cameraSegmentItemActive : null,
                !latestCoordinate ? styles.cameraSegmentItemDisabled : null,
                pressed ? styles.cameraButtonPressed : null,
              ]}
              hitSlop={4}
            >
              <Crosshair
                size={16}
                color={cameraMode === 'follow' ? theme.colors.textInverse : mapPalette.plannedRoute}
                weight="bold"
              />
              <Text
                style={[
                  styles.cameraButtonLabel,
                  cameraMode === 'follow' ? styles.cameraSegmentLabelActive : null,
                ]}
                numberOfLines={1}
              >
                {t('tracking.map.followVehicle')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: cameraMode === 'overview', disabled: !canShowOverview }}
              accessibilityLabel={t('tracking.map.viewRouteAccessibility')}
              disabled={!canShowOverview}
              onPress={handleViewRoute}
              style={({ pressed }) => [
                styles.cameraSegmentItem,
                cameraMode === 'overview' ? styles.cameraSegmentItemActive : null,
                !canShowOverview ? styles.cameraSegmentItemDisabled : null,
                pressed ? styles.cameraButtonPressed : null,
              ]}
              hitSlop={4}
            >
              <MapPin
                size={16}
                color={cameraMode === 'overview' ? theme.colors.textInverse : mapPalette.plannedRoute}
                weight="bold"
              />
              <Text
                style={[
                  styles.cameraButtonLabel,
                  cameraMode === 'overview' ? styles.cameraSegmentLabelActive : null,
                ]}
                numberOfLines={1}
              >
                {t('tracking.map.viewRoute')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
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
      fontSize: fontSizes.xs,
      lineHeight: 14,
    },
    emphasizedWrap: {
      alignItems: 'center' as const,
    },
    semanticLabel: {
      maxWidth: 148,
      minHeight: 22,
      marginBottom: 5,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.84)',
    },
    semanticLabelText: {
      fontFamily: fontFamilies.bold,
      fontSize: fontSizes.xs,
      lineHeight: 16,
    },

    emphasizedHalo: {
      position: 'absolute' as const,
      bottom: 1,
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
    markerShuttleTarget: {
      backgroundColor: palette.shuttleTarget,
    },
    markerStation: {
      backgroundColor: palette.shuttleStation,
    },
    speedBadge: {
      position: 'absolute' as const,
      top: spacing.md + 44,
      right: spacing.sm,
      zIndex: 30,
      minHeight: 32,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      borderCurve: 'continuous' as const,
      borderWidth: 1,
      borderColor: palette.vehicle,
      backgroundColor: liquid
        ? theme.effects.glassSurfaceStrong
        : theme.colors.surfaceElevated,
      ...theme.effects.cardShadow,
    },
    speedBadgeDot: {
      width: 8,
      height: 8,
      borderRadius: borderRadius.full,
      backgroundColor: palette.vehicle,
    },
    speedBadgeValue: {
      fontFamily: fontFamilies.semiBold,
      fontSize: fontSizes.xs,
      lineHeight: 16,
      color: theme.colors.textPrimary,
    },
    // Legend stays bottom-left; camera is top-center and live speed is top-right.
    mapLegend: {
      position: 'absolute' as const,
      left: spacing.sm,
      bottom: spacing.sm,
      maxWidth: 148,
      zIndex: 20,
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
      // Intentional map-marker exception: this is a single ordinal inside a
      // 16 dp symbol; the adjacent readable label carries the same meaning.
      fontSize: 8,
      lineHeight: 9,
    },
    legendLabel: {
      flexShrink: 1,
      fontFamily: fontFamilies.medium,
      fontSize: fontSizes.xs,
      lineHeight: 16,
      color: theme.colors.textSecondary,
    },
    // Top-center so it does not cover the bottom legend (left) or waiting chip (right).
    cameraControls: {
      position: 'absolute' as const,
      top: spacing.sm,
      left: spacing.sm,
      right: spacing.sm,
      alignItems: 'center' as const,
      zIndex: 40,
    },
    cameraSegment: {
      flexDirection: 'row' as const,
      alignItems: 'stretch' as const,
      maxWidth: 320,
      width: '88%' as unknown as number,
      minHeight: 40,
      padding: 3,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: liquid ? theme.effects.glassBorderStrong : palette.frameBorder,
      backgroundColor: liquid ? theme.effects.glassSurfaceStrong : theme.colors.surfaceElevated,
      ...theme.effects.floatingShadow,
    },
    cameraSegmentItem: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
    },
    cameraSegmentItemActive: {
      backgroundColor: palette.plannedRoute,
    },
    cameraSegmentItemDisabled: {
      opacity: 0.45,
    },
    cameraButtonPressed: {
      opacity: 0.88,
    },
    cameraButtonLabel: {
      flexShrink: 1,
      fontFamily: fontFamilies.semiBold,
      fontSize: fontSizes.xs,
      color: theme.colors.textPrimary,
    },
    cameraSegmentLabelActive: {
      color: theme.colors.textInverse,
    },
  };
};
