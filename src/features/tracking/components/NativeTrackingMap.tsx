import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, Text, View } from 'react-native';
import { Bus, Crosshair, MapPin } from 'phosphor-react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type LatLng,
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
import type { TrackingPoint } from '../api/trackingApi';
import type { TrackingMapStop } from './trackingMapModel';

interface NativeTrackingMapProps {
  latest: TrackingPoint;
  points: readonly TrackingPoint[];
  stops: readonly TrackingMapStop[];
}

const MAP_PADDING = { top: 16, right: 16, bottom: 52, left: 16 } as const;
const VEHICLE_MARKER_ANCHOR = { x: 0.5, y: 0.5 } as const;
const STOP_MARKER_ANCHOR = { x: 0.5, y: 1 } as const;

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
}: NativeTrackingMapProps): React.JSX.Element {
  const mapRef = useRef<MapView | null>(null);
  const lastFollowedCoordinateRef = useRef<LatLng | null>(null);
  const [isFollowingVehicle, setIsFollowingVehicle] = useState(true);
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const coordinates = useMemo(() => points.map(toCoordinate), [points]);
  const latestCoordinate = useMemo(() => toCoordinate(latest), [latest]);
  const heading = latest.headingDeg ?? 0;

  const stopCoordinates = useMemo(
    () => stops.map((stop) => ({ stop, coordinate: toCoordinate(stop) })),
    [stops],
  );

  useEffect(() => {
    if (
      !isFollowingVehicle
      || !mapRef.current
      || !hasMoved(lastFollowedCoordinateRef.current, latestCoordinate)
    ) {
      return;
    }

    lastFollowedCoordinateRef.current = latestCoordinate;
    mapRef.current.animateCamera(
      { center: latestCoordinate },
      { duration: 350 },
    );
  }, [isFollowingVehicle, latestCoordinate]);

  const handlePanDrag = useCallback(() => {
    setIsFollowingVehicle(false);
  }, []);

  const handleRecenter = useCallback(() => {
    lastFollowedCoordinateRef.current = latestCoordinate;
    setIsFollowingVehicle(true);
    mapRef.current?.animateCamera(
      { center: latestCoordinate, zoom: 15 },
      { duration: 350 },
    );
  }, [latestCoordinate]);

  return (
    <View style={styles.mapFrame}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          ...latestCoordinate,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        mapPadding={MAP_PADDING}
        userInterfaceStyle={theme.isDark ? 'dark' : 'light'}
        showsMyLocationButton={false}
        showsUserLocation={false}
        toolbarEnabled={false}
        onPanDrag={handlePanDrag}
        accessibilityLabel="Live trip map"
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
              <MapPin size={18} color="#FFFFFF" weight="fill" />
            </View>
          </Marker>
        ))}
        {coordinates.length > 1 ? (
          <Polyline
            coordinates={coordinates}
            strokeColor={theme.colors.primary}
            strokeWidth={4}
          />
        ) : null}
        <Marker
          coordinate={latestCoordinate}
          title="Latest bus location"
          rotation={heading}
          anchor={VEHICLE_MARKER_ANCHOR}
          flat
          tracksViewChanges={false}
          zIndex={10}
        >
          <View collapsable={false} style={styles.vehicleMarker}>
            <Bus size={20} color="#FFFFFF" weight="fill" />
          </View>
        </Marker>
      </MapView>
      {!isFollowingVehicle ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Follow the live bus location"
          onPress={handleRecenter}
          style={({ pressed }) => [
            styles.recenterButton,
            pressed && styles.recenterButtonPressed,
          ]}
          hitSlop={spacing.sm}
        >
          <Crosshair size={18} color={theme.colors.primary} weight="bold" />
          <Text
            style={styles.recenterLabel}
            numberOfLines={1}
          >
            Follow bus
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  mapFrame: {
    height: 320,
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
    borderColor: '#FFFFFF',
    backgroundColor: '#007D78',
    ...theme.effects.floatingShadow,
  },
  stopMarker: {
    width: 30,
    height: 30,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#435A57',
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
