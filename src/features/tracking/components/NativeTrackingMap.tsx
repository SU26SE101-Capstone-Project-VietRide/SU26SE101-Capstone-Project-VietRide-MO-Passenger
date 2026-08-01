import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Bus, Crosshair, MapPin, Van } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type LatLng,
  type MapViewProps,
} from 'react-native-maps';

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
import { motionTokens, useMotion } from '@shared/motion';
import type { TrackingPoint } from '../api/trackingApi';
import type { TrackingMapStop } from './trackingMapModel';

interface NativeTrackingMapProps {
  latest: TrackingPoint;
  points: readonly TrackingPoint[];
  stops: readonly TrackingMapStop[];
  vehicleKind: 'bus' | 'shuttle';
}

const MAP_PADDING = { top: 24, right: 24, bottom: 68, left: 24 } as const;
const INITIAL_VIEWPORT_PADDING = { top: 48, right: 40, bottom: 88, left: 40 } as const;
const VEHICLE_MARKER_ANCHOR = { x: 0.5, y: 0.5 } as const;
const STOP_MARKER_ANCHOR = { x: 0.5, y: 1 } as const;
const DEFAULT_FOLLOW_ZOOM = 15;
const MIN_ZOOM_LEVEL = 5;
const MAX_ZOOM_LEVEL = 19;
const MAP_MARKER_CONTRAST = '#FFFFFF';
const TRAIL_HALO_COLOR = 'rgba(255, 255, 255, 0.92)';

const hasMoved = (left: LatLng | null, right: LatLng): boolean => !left
  || Math.abs(left.latitude - right.latitude) > 0.000001
  || Math.abs(left.longitude - right.longitude) > 0.000001;

const toCoordinate = (point: GeoCoordinate): LatLng => ({
  latitude: point.latitude,
  longitude: point.longitude,
});

export const NativeTrackingMap = React.memo(function NativeTrackingMapComponent({
  latest,
  points,
  stops,
  vehicleKind,
}: NativeTrackingMapProps): React.JSX.Element {
  const mapRef = useRef<MapView | null>(null);
  const isMapReadyRef = useRef(false);
  const hasFittedInitialViewportRef = useRef(false);
  const lastFollowedCoordinateRef = useRef<LatLng | null>(null);
  const [isFollowingVehicle, setIsFollowingVehicle] = useState(true);
  const theme = useTheme();
  const { t } = useTranslation();
  const { reduceMotion } = useMotion();
  const { height: viewportHeight } = useWindowDimensions();
  const styles = useThemedStyles(createStyles);
  const mapFrameStyle = useMemo(
    () => ({
      height: Math.min(360, Math.max(260, viewportHeight * 0.4)),
    }),
    [viewportHeight],
  );
  const coordinates = useMemo(() => points.map(toCoordinate), [points]);
  const latestCoordinate = useMemo(() => toCoordinate(latest), [latest]);
  const initialRegion = useMemo(() => ({
    ...latestCoordinate,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  }), [latestCoordinate]);
  const heading = latest.headingDeg ?? 0;

  const stopCoordinates = useMemo(
    () => stops.map((stop) => ({ stop, coordinate: toCoordinate(stop) })),
    [stops],
  );
  const viewportCoordinates = useMemo(
    () => [...coordinates, ...stopCoordinates.map(({ coordinate }) => coordinate)],
    [coordinates, stopCoordinates],
  );

  useEffect(() => {
    if (
      !isFollowingVehicle
      || !isMapReadyRef.current
      || !mapRef.current
      || !hasMoved(lastFollowedCoordinateRef.current, latestCoordinate)
    ) {
      return;
    }

    lastFollowedCoordinateRef.current = latestCoordinate;
    mapRef.current.animateCamera(
      { center: latestCoordinate },
      {
        duration: reduceMotion
          ? 0
          : motionTokens.duration.emphasis,
      },
    );
  }, [isFollowingVehicle, latestCoordinate, reduceMotion]);

  const stopFollowingVehicle = useCallback(() => {
    setIsFollowingVehicle(false);
  }, []);

  const handleRegionChangeComplete = useCallback<
    NonNullable<MapViewProps['onRegionChangeComplete']>
  >((_region, details) => {
    if (details.isGesture) stopFollowingVehicle();
  }, [stopFollowingVehicle]);

  const handleMapReady = useCallback(() => {
    isMapReadyRef.current = true;
    lastFollowedCoordinateRef.current = latestCoordinate;

    if (hasFittedInitialViewportRef.current || viewportCoordinates.length < 2) return;

    hasFittedInitialViewportRef.current = true;
    mapRef.current?.fitToCoordinates(viewportCoordinates, {
      edgePadding: INITIAL_VIEWPORT_PADDING,
      animated: false,
    });
  }, [latestCoordinate, viewportCoordinates]);

  const handleRecenter = useCallback(() => {
    lastFollowedCoordinateRef.current = latestCoordinate;
    setIsFollowingVehicle(true);
    mapRef.current?.animateCamera(
      { center: latestCoordinate, zoom: DEFAULT_FOLLOW_ZOOM },
      {
        duration: reduceMotion
          ? 0
          : motionTokens.duration.emphasis,
      },
    );
  }, [latestCoordinate, reduceMotion]);

  return (
    <View style={[styles.mapFrame, mapFrameStyle]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
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
        onPanDrag={stopFollowingVehicle}
        onRegionChangeComplete={handleRegionChangeComplete}
        accessibilityLabel={t('tracking.map.accessibilityLabel')}
        accessibilityHint={t('tracking.map.accessibilityHint')}
      >
        {stopCoordinates.map(({ stop, coordinate }) => (
          <Marker
            key={stop.id}
            coordinate={coordinate}
            title={stop.name}
            anchor={STOP_MARKER_ANCHOR}
            tracksViewChanges={false}
            zIndex={1}
          >
            <View collapsable={false} style={styles.stopMarker}>
              <MapPin size={18} color={MAP_MARKER_CONTRAST} weight="fill" />
            </View>
          </Marker>
        ))}
        {coordinates.length > 1 ? (
          <>
            <Polyline
              coordinates={coordinates}
              strokeColor={TRAIL_HALO_COLOR}
              strokeWidth={8}
              lineCap="round"
              lineJoin="round"
              zIndex={1}
            />
            <Polyline
              coordinates={coordinates}
              strokeColor={theme.colors.primary}
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
              zIndex={2}
            />
          </>
        ) : null}
        <Marker
          coordinate={latestCoordinate}
          title={t('tracking.map.latestVehicle')}
          rotation={heading}
          anchor={VEHICLE_MARKER_ANCHOR}
          flat
          tracksViewChanges={false}
          zIndex={10}
        >
          <View collapsable={false} style={styles.vehicleMarker}>
            {vehicleKind === 'shuttle' ? (
              <Van size={20} color={MAP_MARKER_CONTRAST} weight="fill" />
            ) : (
              <Bus size={20} color={MAP_MARKER_CONTRAST} weight="fill" />
            )}
          </View>
        </Marker>
      </MapView>
      {!isFollowingVehicle ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('tracking.map.followAccessibility')}
          onPress={handleRecenter}
          style={({ pressed }) => [
            styles.recenterButton,
            pressed ? styles.recenterButtonPressed : null,
          ]}
          hitSlop={spacing.sm}
        >
          <Crosshair size={18} color={theme.colors.primary} weight="bold" />
          <Text
            style={styles.recenterLabel}
            numberOfLines={1}
          >
            {t('tracking.map.followVehicle')}
          </Text>
        </Pressable>
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
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surfaceAlt,
  },
  map: { flex: 1 },
  vehicleMarker: {
    width: 42,
    height: 42,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: borderRadius.full,
    borderWidth: 3,
    borderColor: MAP_MARKER_CONTRAST,
    backgroundColor: theme.colors.primary,
    ...theme.effects.floatingShadow,
  },
  stopMarker: {
    width: 30,
    height: 30,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: MAP_MARKER_CONTRAST,
    backgroundColor: theme.colors.textSecondary,
  },
  recenterButton: {
    position: 'absolute' as const,
    right: spacing.md,
    bottom: spacing.huge,
    minHeight: 48,
    maxWidth: '70%' as const,
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
  recenterButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
  recenterLabel: {
    flexShrink: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
});
