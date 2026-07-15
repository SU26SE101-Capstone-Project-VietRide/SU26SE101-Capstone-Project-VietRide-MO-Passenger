import React, { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import MapView, { Marker, Polyline, type LatLng } from 'react-native-maps';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import { borderRadius, type AppTheme } from '@shared/theme';
import type { TrackingPoint } from '../api/trackingApi';

interface NativeTrackingMapProps {
  latest: TrackingPoint | null;
  points: readonly TrackingPoint[];
}

const toCoordinate = (point: TrackingPoint): LatLng => ({
  latitude: point.latitude,
  longitude: point.longitude,
});

export const NativeTrackingMap = React.memo(function NativeTrackingMapComponent({
  latest,
  points,
}: NativeTrackingMapProps): React.JSX.Element {
  const mapRef = useRef<MapView | null>(null);
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const coordinates = useMemo(() => points.map(toCoordinate), [points]);
  const latestCoordinate = useMemo(
    () => latest ? toCoordinate(latest) : coordinates[coordinates.length - 1],
    [coordinates, latest],
  );

  useEffect(() => {
    if (!latestCoordinate || !mapRef.current) return;
    mapRef.current.animateCamera(
      { center: latestCoordinate, zoom: 15 },
      { duration: 500 },
    );
  }, [latestCoordinate]);

  return (
    <View style={styles.mapFrame}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          ...latestCoordinate,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        accessibilityLabel="Live trip map"
      >
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
          rotation={latest?.headingDeg ?? 0}
          tracksViewChanges={false}
        />
      </MapView>
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
});
