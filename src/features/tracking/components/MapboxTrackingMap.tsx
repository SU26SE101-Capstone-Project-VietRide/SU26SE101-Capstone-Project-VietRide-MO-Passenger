import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  Crosshair,
  FlagCheckered,
  MapPin,
  NavigationArrow,
  Signpost,
  Target,
} from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

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
import { getTrackingMapPalette } from './trackingMapStyles';
import Mapbox from './mapbox';

interface MapboxTrackingMapProps {
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
type MapCoordinate = [number, number];

interface LineShape {
  type: 'Feature';
  properties: Record<string, never>;
  geometry: {
    type: 'LineString';
    coordinates: MapCoordinate[];
  };
}

const MAP_PADDING = { top: 52, right: 16, bottom: 56, left: 16 } as const;
const OVERVIEW_PADDING = { top: 48, right: 32, bottom: 72, left: 32 } as const;
const MAPBOX_ORNAMENT_INSET = 28;
const VEHICLE_MARKER_ANCHOR = { x: 0.5, y: 0.5 } as const;
const STOP_MARKER_ANCHOR = { x: 0.5, y: 1 } as const;
const CENTER_MARKER_ANCHOR = { x: 0.5, y: 0.5 } as const;
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

const toMapCoordinate = (point: GeoCoordinate): MapCoordinate => [
  point.longitude,
  point.latitude,
];

const toCameraPadding = (padding: {
  top: number;
  right: number;
  bottom: number;
  left: number;
}) => ({
  paddingTop: padding.top,
  paddingRight: padding.right,
  paddingBottom: padding.bottom,
  paddingLeft: padding.left,
});

const makeLineShape = (coordinates: readonly GeoCoordinate[]): LineShape => ({
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'LineString',
    coordinates: coordinates.map(toMapCoordinate),
  },
});

const boundsForCoordinates = (
  coordinates: readonly GeoCoordinate[],
): { ne: MapCoordinate; sw: MapCoordinate } => {
  const latitudes = coordinates.map(coordinate => coordinate.latitude);
  const longitudes = coordinates.map(coordinate => coordinate.longitude);

  return {
    ne: [Math.max(...longitudes), Math.max(...latitudes)],
    sw: [Math.min(...longitudes), Math.min(...latitudes)],
  };
};

const legacyStopsToMarkers = (
  stops: readonly TrackingMapStop[],
): TrackingMapMarker[] =>
  stops.map(stop => ({
    ...stop,
    kind: 'intermediate',
  }));

const isEmphasizedKind = (kind: TrackingMapMarkerKind): boolean =>
  kind !== 'intermediate';

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
    default:
      return <MapPin {...commonProps} />;
  }
}

const pinColorForKind = (
  kind: TrackingMapMarkerKind,
  palette: ReturnType<typeof getTrackingMapPalette>,
): string | undefined => {
  switch (kind) {
    case 'origin':
      return palette.origin;
    case 'destination':
      return palette.destination;
    case 'target':
    case 'targetNext':
      return palette.target;
    case 'next':
      return palette.next;
    case 'shuttlePickup':
    case 'shuttleDropoff':
      return palette.shuttleTarget;
    case 'shuttleStation':
      return palette.shuttleStation;
    default:
      return undefined;
  }
};

const SemanticStopMarker = React.memo(function SemanticStopMarkerComponent({
  coordinate,
  description,
  marker,
  styles,
  palette,
  selected,
  onSelect,
}: {
  coordinate: MapCoordinate;
  description: string;
  marker: TrackingMapMarker;
  styles: ReturnType<typeof createStyles>;
  palette: ReturnType<typeof getTrackingMapPalette>;
  selected: boolean;
  onSelect: (markerKey: string) => void;
}): React.JSX.Element {
  const emphasized = isEmphasizedKind(marker.kind);
  const isNextMarker = marker.kind === 'next';
  const isTargetMarker =
    marker.kind === 'target' || marker.kind === 'targetNext';
  const isOriginMarker = marker.kind === 'origin';
  const isDestinationMarker = marker.kind === 'destination';
  const sequenceLabel =
    marker.sequence != null && marker.sequence > 0
      ? String(marker.sequence)
      : null;
  const title = sequenceLabel
    ? sequenceLabel + '. ' + marker.name
    : marker.name;
  const pinColor = pinColorForKind(marker.kind, palette);
  const roleFill = pinColor ?? palette.origin;
  const haloFill = isNextMarker
    ? palette.nextHalo
    : isTargetMarker
    ? palette.targetHalo
    : isDestinationMarker
    ? palette.destination + '33'
    : isOriginMarker
    ? palette.origin + '33'
    : roleFill + '33';
  const glyphColor = palette.markerGlyph;
  const accessibilityLabel = title + '. ' + description;
  const markerKey = marker.kind + '-' + marker.id;
  const handlePress = useCallback(() => {
    onSelect(markerKey);
  }, [markerKey, onSelect]);

  return (
    <>
      {selected ? (
        <Mapbox.MarkerView
          coordinate={coordinate}
          anchor={STOP_MARKER_ANCHOR}
          allowOverlap
          isSelected
        >
          <View
            pointerEvents="none"
            style={styles.stopLabelWrap}
            testID="tracking-stop-label"
          >
            <View style={styles.stopLabelBubble}>
              <Text
                numberOfLines={2}
                style={styles.stopLabelText}
                testID="tracking-stop-label-text"
              >
                {title}
              </Text>
            </View>
            <View style={styles.stopLabelTip} />
            <View
              style={
                marker.kind === 'intermediate'
                  ? styles.intermediateLabelSpacer
                  : styles.emphasizedLabelSpacer
              }
            />
          </View>
        </Mapbox.MarkerView>
      ) : null}

      <Mapbox.MarkerView
        coordinate={coordinate}
        anchor={
          marker.kind === 'intermediate'
            ? CENTER_MARKER_ANCHOR
            : STOP_MARKER_ANCHOR
        }
        allowOverlap
        isSelected={selected}
      >
        <Pressable
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          onPress={handlePress}
          style={({ pressed }) => [
            marker.kind === 'intermediate'
              ? styles.intermediateTouchTarget
              : styles.emphasizedTouchTarget,
            pressed ? styles.stopMarkerPressed : null,
          ]}
          testID="tracking-stop-marker"
        >
          {marker.kind === 'intermediate' ? (
            <View style={styles.intermediateWrap}>
              <View style={styles.intermediateChip}>
                <Text
                  style={[
                    styles.intermediateNumber,
                    { color: palette.sequenceText },
                  ]}
                >
                  {sequenceLabel ?? '·'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emphasizedWrap}>
              <View
                style={[styles.emphasizedHalo, { backgroundColor: haloFill }]}
              />
              <View
                style={[
                  styles.stopMarker,
                  emphasized ? styles.stopMarkerEmphasized : null,
                  markerStyleForKind(marker.kind, styles),
                ]}
              >
                <MarkerGlyph
                  kind={marker.kind}
                  size={emphasized ? 16 : 13}
                  color={glyphColor}
                />
              </View>
              <View
                style={[styles.markerStem, { backgroundColor: roleFill }]}
              />
            </View>
          )}
        </Pressable>
      </Mapbox.MarkerView>
    </>
  );
});
function VehiclePuck({
  glyphColor,
  heading,
  reduceMotion,
  vehicleKind,
}: {
  glyphColor: string;
  heading: number;
  reduceMotion: boolean;
  vehicleKind: 'bus' | 'shuttle';
}): React.JSX.Element {
  const styles = useThemedStyles(createStyles);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return undefined;
    }

    pulse.value = withRepeat(
      withTiming(1, {
        duration: 1700,
        easing: Easing.out(Easing.quad),
      }),
      -1,
      false,
    );

    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.55 + pulse.value * 0.95 }],
    opacity: reduceMotion ? 0.24 : 0.4 * (1 - pulse.value),
  }));

  return (
    <View
      collapsable={false}
      style={styles.vehicleWrap}
      testID="tracking-vehicle-marker"
    >
      <Animated.View style={[styles.vehiclePulse, haloStyle]} />
      <View
        style={[
          styles.vehicleMarker,
          { transform: [{ rotate: String(heading) + 'deg' }] },
        ]}
        testID={
          vehicleKind === 'shuttle'
            ? 'tracking-shuttle-vehicle-glyph'
            : 'tracking-bus-vehicle-glyph'
        }
      >
        <NavigationArrow size={20} color={glyphColor} weight="fill" />
      </View>
    </View>
  );
}

export const MapboxTrackingMap = React.memo(
  function MapboxTrackingMapComponent({
    latest,
    trail,
    plannedRoute = EMPTY_ROUTE,
    markers,
    vehicleKind = 'bus',
    showDrivenTrail = true,
    bottomContentInset = 0,
    points,
    stops,
  }: MapboxTrackingMapProps): React.JSX.Element {
    const cameraRef = useRef<Mapbox.Camera>(null);
    const isMapReadyRef = useRef(false);
    const hasFittedInitialViewportRef = useRef(false);
    const lastFollowedCoordinateRef = useRef<GeoCoordinate | null>(null);
    const [cameraMode, setCameraMode] = useState<CameraMode>('follow');
    const [selectedMarkerKey, setSelectedMarkerKey] = useState<string | null>(
      null,
    );
    const theme = useTheme();
    const { t } = useTranslation();
    const { reduceMotion } = useMotion();
    const styles = useThemedStyles(createStyles);
    const mapPalette = getTrackingMapPalette(theme.isDark);
    const safeBottomContentInset = Number.isFinite(bottomContentInset)
      ? Math.max(0, bottomContentInset)
      : 0;
    const mapPadding = useMemo(
      () => ({
        ...MAP_PADDING,
        bottom: MAP_PADDING.bottom + safeBottomContentInset,
      }),
      [safeBottomContentInset],
    );
    const overviewPadding = useMemo(
      () => ({
        ...OVERVIEW_PADDING,
        bottom: OVERVIEW_PADDING.bottom + safeBottomContentInset,
      }),
      [safeBottomContentInset],
    );
    const mapboxOrnamentPosition = useMemo(
      () => ({
        bottom: safeBottomContentInset + 4,
      }),
      [safeBottomContentInset],
    );

    const trailPoints = trail ?? points ?? EMPTY_TRACKING_POINTS;
    const legacyMarkers = useMemo(
      () => legacyStopsToMarkers(stops ?? EMPTY_STOPS),
      [stops],
    );
    const mapMarkers = markers ?? legacyMarkers;
    const isTripStyleMap = vehicleKind === 'bus';
    const hasOriginMarker = mapMarkers.some(marker => marker.kind === 'origin');
    const hasDestinationMarker = mapMarkers.some(
      marker => marker.kind === 'destination',
    );
    const hasIntermediateMarker = mapMarkers.some(
      marker => marker.kind === 'intermediate',
    );
    const hasPassengerStopMarker = mapMarkers.some(
      marker => marker.kind === 'target' || marker.kind === 'targetNext',
    );
    const latestCoordinate = useMemo<GeoCoordinate | null>(
      () =>
        latest
          ? { latitude: latest.latitude, longitude: latest.longitude }
          : null,
      [latest],
    );
    const markerCoordinates = useMemo(
      () =>
        mapMarkers.map(marker => ({
          marker,
          coordinate: {
            latitude: marker.latitude,
            longitude: marker.longitude,
          },
        })),
      [mapMarkers],
    );
    const orderedMarkerCoordinates = useMemo(
      () =>
        markerCoordinates
          .slice()
          .sort(
            (a, b) =>
              MARKER_Z_INDEX[a.marker.kind] - MARKER_Z_INDEX[b.marker.kind],
          ),
      [markerCoordinates],
    );
    const routeOverviewCoordinates = useMemo(
      () => [
        ...plannedRoute,
        ...markerCoordinates
          .filter(({ marker }) => marker.kind !== 'intermediate')
          .map(({ coordinate }) => coordinate),
      ],
      [markerCoordinates, plannedRoute],
    );
    const fallbackOverviewCoordinates = useMemo(
      () => [
        ...(latestCoordinate ? [latestCoordinate] : []),
        ...markerCoordinates.map(({ coordinate }) => coordinate),
      ],
      [latestCoordinate, markerCoordinates],
    );
    const overviewCoordinates =
      plannedRoute.length >= 2
        ? routeOverviewCoordinates
        : fallbackOverviewCoordinates;
    const focusCoordinate =
      latestCoordinate ??
      markerCoordinates.find(
        ({ marker }) =>
          marker.kind === 'target' ||
          marker.kind === 'targetNext' ||
          marker.kind === 'next' ||
          marker.kind === 'shuttlePickup' ||
          marker.kind === 'shuttleDropoff',
      )?.coordinate ??
      markerCoordinates.find(({ marker }) => marker.kind === 'origin')
        ?.coordinate ??
      markerCoordinates[0]?.coordinate ??
      plannedRoute[0] ??
      null;
    const plannedRouteShape = useMemo(
      () => makeLineShape(plannedRoute),
      [plannedRoute],
    );
    const trailShape = useMemo(() => makeLineShape(trailPoints), [trailPoints]);
    const plannedRouteHaloStyle = useMemo(
      () => ({
        lineColor: mapPalette.plannedRouteHalo,
        lineWidth: 10,
        lineCap: 'round' as const,
        lineJoin: 'round' as const,
      }),
      [mapPalette.plannedRouteHalo],
    );
    const plannedRouteLineStyle = useMemo(
      () => ({
        lineColor: mapPalette.plannedRoute,
        lineWidth: 6,
        lineCap: 'round' as const,
        lineJoin: 'round' as const,
      }),
      [mapPalette.plannedRoute],
    );
    const trailHaloStyle = useMemo(
      () => ({
        lineColor: mapPalette.trailHalo,
        lineWidth: 9,
        lineDasharray: [1.4, 1.1] as [number, number],
        lineCap: 'round' as const,
        lineJoin: 'round' as const,
      }),
      [mapPalette.trailHalo],
    );
    const trailLineStyle = useMemo(
      () => ({
        lineColor: mapPalette.trail,
        lineWidth: 5,
        lineDasharray: [1.4, 1.1] as [number, number],
        lineCap: 'round' as const,
        lineJoin: 'round' as const,
      }),
      [mapPalette.trail],
    );
    const heading = latest?.headingDeg ?? 0;
    const currentSpeedKmh = latest?.speedKmh;
    const speedLabel =
      vehicleKind === 'bus' &&
      currentSpeedKmh !== undefined &&
      Number.isFinite(currentSpeedKmh) &&
      currentSpeedKmh >= 0
        ? String(Math.round(currentSpeedKmh)) + ' km/h'
        : null;
    const canShowOverview = overviewCoordinates.length >= 2;

    const fitOverview = useCallback(
      (animated: boolean) => {
        if (!cameraRef.current || overviewCoordinates.length < 2) return;

        cameraRef.current.setCamera({
          bounds: boundsForCoordinates(overviewCoordinates),
          padding: toCameraPadding(overviewPadding),
          heading: 0,
          pitch: 0,
          animationDuration:
            animated && !reduceMotion ? motionTokens.duration.emphasis : 0,
          animationMode: animated && !reduceMotion ? 'easeTo' : 'none',
        });
      },
      [overviewCoordinates, overviewPadding, reduceMotion],
    );

    useEffect(() => {
      if (
        !isMapReadyRef.current ||
        hasFittedInitialViewportRef.current ||
        overviewCoordinates.length < 2
      ) {
        return;
      }

      hasFittedInitialViewportRef.current = true;
      setCameraMode('overview');
      fitOverview(false);
    }, [fitOverview, overviewCoordinates.length]);

    useEffect(() => {
      if (
        cameraMode !== 'follow' ||
        !isMapReadyRef.current ||
        !cameraRef.current ||
        !latestCoordinate
      ) {
        return;
      }

      const previous = lastFollowedCoordinateRef.current;
      const distanceKm = previous
        ? getGeoDistanceKm(previous, latestCoordinate)
        : null;
      if (previous && (distanceKm == null || distanceKm < FOLLOW_DISTANCE_KM))
        return;

      lastFollowedCoordinateRef.current = latestCoordinate;
      cameraRef.current.setCamera({
        centerCoordinate: toMapCoordinate(latestCoordinate),
        padding: toCameraPadding(mapPadding),
        animationDuration: reduceMotion ? 0 : motionTokens.duration.emphasis,
        animationMode: reduceMotion ? 'none' : 'easeTo',
      });
    }, [cameraMode, latestCoordinate, mapPadding, reduceMotion]);

    const handleUserGesture = useCallback(() => {
      setCameraMode('overview');
    }, []);

    const handleCameraChanged = useCallback(
      (state: { gestures: { isGestureActive: boolean } }) => {
        if (state.gestures.isGestureActive) handleUserGesture();
      },
      [handleUserGesture],
    );

    const handleMapReady = useCallback(() => {
      isMapReadyRef.current = true;
      lastFollowedCoordinateRef.current = latestCoordinate;

      if (
        overviewCoordinates.length >= 2 &&
        !hasFittedInitialViewportRef.current
      ) {
        hasFittedInitialViewportRef.current = true;
        setCameraMode('overview');
        fitOverview(false);
      }
    }, [fitOverview, latestCoordinate, overviewCoordinates.length]);

    const handleFollowVehicle = useCallback(() => {
      if (!latestCoordinate) return;

      lastFollowedCoordinateRef.current = latestCoordinate;
      setCameraMode('follow');
      cameraRef.current?.setCamera({
        centerCoordinate: toMapCoordinate(latestCoordinate),
        zoomLevel: DEFAULT_FOLLOW_ZOOM,
        heading: 0,
        pitch: 0,
        padding: toCameraPadding(mapPadding),
        animationDuration: reduceMotion ? 0 : motionTokens.duration.emphasis,
        animationMode: reduceMotion ? 'none' : 'easeTo',
      });
    }, [latestCoordinate, mapPadding, reduceMotion]);

    const handleViewRoute = useCallback(() => {
      setCameraMode('overview');
      fitOverview(true);
    }, [fitOverview]);

    const handleSelectMarker = useCallback((markerKey: string) => {
      setSelectedMarkerKey(current =>
        current === markerKey ? null : markerKey,
      );
    }, []);

    const handleMapPress = useCallback(() => {
      setSelectedMarkerKey(null);
    }, []);

    if (!focusCoordinate) return <View style={styles.map} />;

    return (
      <View style={styles.mapContainer}>
        <Mapbox.MapView
          style={styles.map}
          styleURL={
            theme.isDark ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Street
          }
          scaleBarEnabled={false}
          logoEnabled
          logoPosition={{ ...mapboxOrnamentPosition, left: spacing.sm }}
          attributionEnabled
          attributionPosition={{ ...mapboxOrnamentPosition, right: spacing.sm }}
          compassEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          onDidFinishLoadingMap={handleMapReady}
          onCameraChanged={handleCameraChanged}
          onPress={handleMapPress}
          accessibilityLabel={t('tracking.map.accessibilityLabel')}
          accessibilityHint={t('tracking.map.accessibilityHint')}
        >
          <Mapbox.Camera
            ref={cameraRef}
            minZoomLevel={MIN_ZOOM_LEVEL}
            maxZoomLevel={MAX_ZOOM_LEVEL}
            defaultSettings={{
              centerCoordinate: toMapCoordinate(focusCoordinate),
              zoomLevel: DEFAULT_FOLLOW_ZOOM,
              heading: 0,
              pitch: 0,
              padding: toCameraPadding(mapPadding),
            }}
          />

          {plannedRoute.length > 1 ? (
            <Mapbox.ShapeSource
              id="tracking-planned-route"
              shape={plannedRouteShape}
            >
              <Mapbox.LineLayer
                id="tracking-planned-route-halo"
                style={plannedRouteHaloStyle}
              />
              <Mapbox.LineLayer
                id="tracking-planned-route-line"
                style={plannedRouteLineStyle}
              />
            </Mapbox.ShapeSource>
          ) : null}

          {showDrivenTrail && trailPoints.length > 1 ? (
            <Mapbox.ShapeSource id="tracking-driven-trail" shape={trailShape}>
              <Mapbox.LineLayer
                id="tracking-driven-trail-halo"
                style={trailHaloStyle}
              />
              <Mapbox.LineLayer
                id="tracking-driven-trail-line"
                style={trailLineStyle}
              />
            </Mapbox.ShapeSource>
          ) : null}

          {orderedMarkerCoordinates.map(({ marker, coordinate }) => {
            const markerKey = marker.kind + '-' + marker.id;

            return (
              <SemanticStopMarker
                key={markerKey}
                coordinate={toMapCoordinate(coordinate)}
                description={t(MARKER_LABEL_KEYS[marker.kind])}
                marker={marker}
                styles={styles}
                palette={mapPalette}
                selected={selectedMarkerKey === markerKey}
                onSelect={handleSelectMarker}
              />
            );
          })}

          {latestCoordinate ? (
            <Mapbox.MarkerView
              coordinate={toMapCoordinate(latestCoordinate)}
              anchor={VEHICLE_MARKER_ANCHOR}
              allowOverlap
            >
              <VehiclePuck
                glyphColor={mapPalette.vehicleGlyph}
                heading={heading}
                vehicleKind={vehicleKind}
                reduceMotion={reduceMotion}
              />
            </Mapbox.MarkerView>
          ) : null}
        </Mapbox.MapView>

        {speedLabel ? (
          <View
            accessible
            accessibilityLabel={t('tracking.metrics.speed') + ': ' + speedLabel}
            accessibilityRole="summary"
            pointerEvents="none"
            style={styles.speedBadge}
            testID="tracking-speed-badge"
          >
            <View style={styles.speedBadgeDot} />
            <Text
              style={styles.speedBadgeValue}
              testID="tracking-speed-badge-value"
            >
              {speedLabel}
            </Text>
          </View>
        ) : null}

        <View
          pointerEvents="none"
          style={[
            styles.mapLegend,
            {
              bottom:
                spacing.sm + safeBottomContentInset + MAPBOX_ORNAMENT_INSET,
            },
          ]}
          accessibilityRole="summary"
          accessibilityLabel={t('tracking.map.legendAccessibility')}
        >
          {plannedRoute.length >= 2 ? (
            <View
              style={styles.legendRow}
              testID="tracking-map-legend-planned-route"
            >
              <View
                style={styles.legendIconSlot}
                testID="tracking-map-legend-icon-slot"
              >
                <View
                  style={[
                    styles.legendRouteSwatch,
                    { backgroundColor: mapPalette.plannedRoute },
                  ]}
                  testID="tracking-map-legend-route-swatch"
                />
              </View>
              <Text style={styles.legendLabel} numberOfLines={1}>
                {t('tracking.map.legendPlannedRoute')}
              </Text>
            </View>
          ) : null}
          {showDrivenTrail && trailPoints.length >= 2 ? (
            <View style={styles.legendRow}>
              <View
                style={styles.legendIconSlot}
                testID="tracking-map-legend-icon-slot"
              >
                <View
                  style={styles.legendTrailSwatch}
                  testID="tracking-map-legend-trail-swatch"
                >
                  <View
                    style={[
                      styles.legendTrailDash,
                      { backgroundColor: mapPalette.trail },
                    ]}
                  />
                  <View
                    style={[
                      styles.legendTrailDash,
                      { backgroundColor: mapPalette.trail },
                    ]}
                  />
                  <View
                    style={[
                      styles.legendTrailDash,
                      { backgroundColor: mapPalette.trail },
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.legendLabel} numberOfLines={1}>
                {t('tracking.map.legendTrail')}
              </Text>
            </View>
          ) : null}
          {isTripStyleMap && hasOriginMarker ? (
            <View style={styles.legendRow} testID="tracking-map-legend-origin">
              <View
                style={styles.legendIconSlot}
                testID="tracking-map-legend-icon-slot"
              >
                <View
                  style={[
                    styles.legendMarkerSwatch,
                    { backgroundColor: mapPalette.origin },
                  ]}
                  testID="tracking-map-legend-origin-swatch"
                >
                  <MarkerGlyph
                    kind="origin"
                    size={9}
                    color={mapPalette.markerGlyph}
                  />
                </View>
              </View>
              <Text style={styles.legendLabel} numberOfLines={1}>
                {t('tracking.map.legendOrigin')}
              </Text>
            </View>
          ) : null}
          {isTripStyleMap && hasDestinationMarker ? (
            <View
              style={styles.legendRow}
              testID="tracking-map-legend-destination"
            >
              <View
                style={styles.legendIconSlot}
                testID="tracking-map-legend-icon-slot"
              >
                <View
                  style={[
                    styles.legendMarkerSwatch,
                    { backgroundColor: mapPalette.destination },
                  ]}
                  testID="tracking-map-legend-destination-swatch"
                >
                  <MarkerGlyph
                    kind="destination"
                    size={9}
                    color={mapPalette.markerGlyph}
                  />
                </View>
              </View>
              <Text style={styles.legendLabel} numberOfLines={1}>
                {t('tracking.map.legendDestination')}
              </Text>
            </View>
          ) : null}
          {isTripStyleMap && hasIntermediateMarker ? (
            <View
              style={styles.legendRow}
              testID="tracking-map-legend-intermediate"
            >
              <View
                style={styles.legendIconSlot}
                testID="tracking-map-legend-icon-slot"
              >
                <View
                  style={[
                    styles.legendSwatchRing,
                    { borderColor: mapPalette.intermediateBorder },
                  ]}
                >
                  <Text
                    style={[
                      styles.legendMiniNumber,
                      { color: mapPalette.sequenceText },
                    ]}
                  >
                    2
                  </Text>
                </View>
              </View>
              <Text style={styles.legendLabel} numberOfLines={1}>
                {t('tracking.map.legendIntermediateStops')}
              </Text>
            </View>
          ) : null}
          {isTripStyleMap && hasPassengerStopMarker ? (
            <View
              style={styles.legendRow}
              testID="tracking-map-legend-passenger-stop"
            >
              <View
                style={styles.legendIconSlot}
                testID="tracking-map-legend-icon-slot"
              >
                <View
                  style={[
                    styles.legendMarkerSwatch,
                    { backgroundColor: mapPalette.target },
                  ]}
                  testID="tracking-map-legend-target-swatch"
                >
                  <MarkerGlyph
                    kind="target"
                    size={9}
                    color={mapPalette.markerGlyph}
                  />
                </View>
              </View>
              <Text style={styles.legendLabel} numberOfLines={1}>
                {t('tracking.map.legendPassengerStop')}
              </Text>
            </View>
          ) : null}
          {!isTripStyleMap &&
          markerCoordinates.some(
            ({ marker }) => marker.sequence !== undefined,
          ) ? (
            <View style={styles.legendRow}>
              <View
                style={styles.legendIconSlot}
                testID="tracking-map-legend-icon-slot"
              >
                <View
                  style={[
                    styles.legendSwatchRing,
                    { borderColor: mapPalette.intermediateBorder },
                  ]}
                >
                  <Text
                    style={[
                      styles.legendMiniNumber,
                      { color: mapPalette.sequenceText },
                    ]}
                  >
                    2
                  </Text>
                </View>
              </View>
              <Text style={styles.legendLabel} numberOfLines={1}>
                {t('tracking.map.legendStopOrder')}
              </Text>
            </View>
          ) : null}
          {!isTripStyleMap &&
          markerCoordinates.some(
            ({ marker }) =>
              marker.kind === 'target' || marker.kind === 'targetNext',
          ) ? (
            <View style={styles.legendRow}>
              <View
                style={styles.legendIconSlot}
                testID="tracking-map-legend-icon-slot"
              >
                <View
                  style={[
                    styles.legendMarkerSwatch,
                    { backgroundColor: mapPalette.target },
                  ]}
                  testID="tracking-map-legend-target-swatch"
                >
                  <MarkerGlyph
                    kind="target"
                    size={9}
                    color={mapPalette.markerGlyph}
                  />
                </View>
              </View>
              <Text style={styles.legendLabel} numberOfLines={1}>
                {t('tracking.map.targetStopMarker')}
              </Text>
            </View>
          ) : null}
        </View>

        {latestCoordinate || canShowOverview ? (
          <View style={styles.cameraControls} pointerEvents="box-none">
            <View style={styles.cameraSegment}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  selected: cameraMode === 'follow',
                  disabled: !latestCoordinate,
                }}
                accessibilityLabel={t('tracking.map.followAccessibility')}
                disabled={!latestCoordinate}
                onPress={handleFollowVehicle}
                style={({ pressed }) => [
                  styles.cameraSegmentItem,
                  cameraMode === 'follow'
                    ? styles.cameraSegmentItemActive
                    : null,
                  !latestCoordinate ? styles.cameraSegmentItemDisabled : null,
                  pressed ? styles.cameraButtonPressed : null,
                ]}
                hitSlop={4}
              >
                <Crosshair
                  size={16}
                  color={
                    cameraMode === 'follow'
                      ? theme.colors.textInverse
                      : mapPalette.plannedRoute
                  }
                  weight="bold"
                />
                <Text
                  style={[
                    styles.cameraButtonLabel,
                    cameraMode === 'follow'
                      ? styles.cameraSegmentLabelActive
                      : null,
                  ]}
                  numberOfLines={1}
                >
                  {t('tracking.map.followVehicle')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  selected: cameraMode === 'overview',
                  disabled: !canShowOverview,
                }}
                accessibilityLabel={t('tracking.map.viewRouteAccessibility')}
                disabled={!canShowOverview}
                onPress={handleViewRoute}
                style={({ pressed }) => [
                  styles.cameraSegmentItem,
                  cameraMode === 'overview'
                    ? styles.cameraSegmentItemActive
                    : null,
                  !canShowOverview ? styles.cameraSegmentItemDisabled : null,
                  pressed ? styles.cameraButtonPressed : null,
                ]}
                hitSlop={4}
              >
                <MapPin
                  size={16}
                  color={
                    cameraMode === 'overview'
                      ? theme.colors.textInverse
                      : mapPalette.plannedRoute
                  }
                  weight="bold"
                />
                <Text
                  style={[
                    styles.cameraButtonLabel,
                    cameraMode === 'overview'
                      ? styles.cameraSegmentLabelActive
                      : null,
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
  },
);

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
    vehicleWrap: {
      width: 60,
      height: 60,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    vehiclePulse: {
      position: 'absolute' as const,
      width: 60,
      height: 60,
      borderRadius: borderRadius.full,
      backgroundColor: palette.plannedRoute,
    },
    vehicleMarker: {
      width: 36,
      height: 36,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: borderRadius.full,
      borderCurve: 'continuous' as const,
      borderWidth: 2.5,
      borderColor: MARKER_CONTRAST,
      backgroundColor: palette.plannedRoute,
      ...theme.effects.floatingShadow,
    },
    stopLabelWrap: {
      width: 196,
      alignItems: 'center' as const,
    },
    stopLabelBubble: {
      width: 196,
      minHeight: 40,
      maxHeight: 56,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
      borderCurve: 'continuous' as const,
      borderWidth: 1,
      borderColor: liquid
        ? theme.effects.glassBorderStrong
        : palette.legendBorder,
      backgroundColor: liquid
        ? theme.effects.glassSurfaceStrong
        : theme.colors.surfaceElevated,
      ...theme.effects.cardShadow,
    },
    stopLabelText: {
      fontFamily: fontFamilies.semiBold,
      fontSize: fontSizes.xs,
      lineHeight: 16,
      textAlign: 'center' as const,
      color: theme.colors.textPrimary,
    },
    stopLabelTip: {
      width: 0,
      height: 0,
      borderLeftWidth: 7,
      borderRightWidth: 7,
      borderTopWidth: 8,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: liquid
        ? theme.effects.glassSurfaceStrong
        : theme.colors.surfaceElevated,
    },
    intermediateLabelSpacer: {
      height: 24,
    },
    emphasizedLabelSpacer: {
      height: 46,
    },
    intermediateTouchTarget: {
      width: 44,
      height: 44,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    emphasizedTouchTarget: {
      width: 44,
      minHeight: 42,
      alignItems: 'center' as const,
      justifyContent: 'flex-end' as const,
    },
    stopMarkerPressed: {
      opacity: 0.82,
    },
    intermediateWrap: {
      width: 34,
      height: 34,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    intermediateChip: {
      width: 28,
      height: 28,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: 14,
      borderCurve: 'continuous' as const,
      borderWidth: 1.5,
      borderColor: palette.intermediateBorder,
      backgroundColor: palette.intermediate,
    },
    intermediateNumber: {
      fontFamily: fontFamilies.semiBold,
      fontSize: fontSizes.xs,
      lineHeight: 14,
    },
    emphasizedWrap: {
      width: 44,
      alignItems: 'center' as const,
      paddingTop: 2,
    },
    emphasizedHalo: {
      position: 'absolute' as const,
      top: 0,
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    stopMarker: {
      width: 30,
      height: 30,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: 15,
      borderCurve: 'continuous' as const,
      borderWidth: 2,
      borderColor: MARKER_CONTRAST,
    },
    stopMarkerEmphasized: {
      width: 34,
      height: 34,
      borderRadius: 17,
    },
    markerStem: {
      width: 2.5,
      height: 7,
      marginTop: -1,
      borderBottomLeftRadius: 2,
      borderBottomRightRadius: 2,
      opacity: 0.95,
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
    mapLegend: {
      position: 'absolute' as const,
      left: spacing.sm,
      maxWidth: 148,
      zIndex: 20,
      gap: 3,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: borderRadius.md,
      borderCurve: 'continuous' as const,
      borderWidth: 1,
      borderColor: liquid
        ? theme.effects.glassBorderStrong
        : palette.legendBorder,
      backgroundColor: liquid
        ? theme.effects.glassSurfaceStrong
        : palette.legendSurface,
      ...theme.effects.cardShadow,
    },
    legendRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
    },
    legendIconSlot: {
      width: 16,
      height: 16,
      flexShrink: 0,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    legendRouteSwatch: {
      width: 16,
      height: 4,
      borderRadius: 2,
      borderCurve: 'continuous' as const,
    },
    legendTrailSwatch: {
      width: 16,
      height: 4,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    legendTrailDash: {
      width: 4,
      height: 3,
      borderRadius: 2,
      borderCurve: 'continuous' as const,
    },
    legendMarkerSwatch: {
      width: 16,
      height: 16,
      borderRadius: borderRadius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
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
      fontSize: fontSizes.xs,
      lineHeight: 16,
      color: theme.colors.textSecondary,
    },
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
      borderColor: liquid
        ? theme.effects.glassBorderStrong
        : palette.frameBorder,
      backgroundColor: liquid
        ? theme.effects.glassSurfaceStrong
        : theme.colors.surfaceElevated,
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
