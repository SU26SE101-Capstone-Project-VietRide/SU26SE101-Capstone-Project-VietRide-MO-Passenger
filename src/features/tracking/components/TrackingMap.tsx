import React, { Suspense } from 'react';
import { Platform, Text, View } from 'react-native';
import { MapPin } from 'phosphor-react-native';

import { appConfig } from '@shared/constants/config';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks/useThemedStyles';
import { borderRadius, fontFamilies, fontSizes, spacing, type AppTheme } from '@shared/theme';
import type { TrackingPoint } from '../api/trackingApi';
import {
  prepareTrackingMapData,
  type TrackingMapStop,
} from './trackingMapModel';

export type { TrackingMapStop } from './trackingMapModel';

interface TrackingMapProps {
  latest: TrackingPoint | null;
  points: readonly TrackingPoint[];
  stops?: readonly TrackingMapStop[];
}

const LazyNativeTrackingMap = React.lazy(async () => {
  const module = await import('./NativeTrackingMap');
  return { default: module.NativeTrackingMap };
});

const EMPTY_STOPS: readonly TrackingMapStop[] = [];

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
  points,
  stops = EMPTY_STOPS,
}: TrackingMapProps): React.JSX.Element {
  const mapData = React.useMemo(
    () => prepareTrackingMapData(latest, points, stops),
    [latest, points, stops],
  );

  if (!isNativeTrackingMapConfigured()) {
    return (
      <MapPlaceholder
        title="Map unavailable"
        message={appConfig.isProd
          ? 'Live map is not available in this build. Verified trip coordinates remain visible below.'
          : 'Live coordinates remain available below. Configure an eligible native map build to enable the map.'}
      />
    );
  }

  if (!mapData.latest) {
    return (
      <MapPlaceholder
        title="Waiting for location"
        message="The driver has not published a GPS point for this trip yet."
      />
    );
  }

  return (
    <Suspense
      fallback={(
        <MapPlaceholder
          title="Loading map"
          message="Preparing the native trip map..."
        />
      )}
    >
      <LazyNativeTrackingMap
        latest={mapData.latest}
        points={mapData.points}
        stops={mapData.stops}
      />
    </Suspense>
  );
});

const createStyles = (theme: AppTheme) => ({
  unavailableMap: {
    minHeight: 240,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surfaceAlt,
  },
  unavailableTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
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
