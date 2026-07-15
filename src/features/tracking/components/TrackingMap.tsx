import React, { Suspense } from 'react';
import { Platform, Text, View } from 'react-native';
import { MapPin } from 'phosphor-react-native';

import { appConfig } from '@shared/constants/config';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import { borderRadius, fontFamilies, fontSizes, spacing, type AppTheme } from '@shared/theme';
import type { TrackingPoint } from '../api/trackingApi';

interface TrackingMapProps {
  latest: TrackingPoint | null;
  points: readonly TrackingPoint[];
}

const LazyNativeTrackingMap = React.lazy(async () => {
  const module = await import('./NativeTrackingMap');
  return { default: module.NativeTrackingMap };
});

const isPlaceholderMapKey = (key: string): boolean =>
  key.length === 0 || key.toUpperCase().includes('YOUR_KEY');

export function isNativeTrackingMapConfigured(): boolean {
  return Platform.OS === 'ios' || !isPlaceholderMapKey(appConfig.googleMapsApiKey.trim());
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
}: TrackingMapProps): React.JSX.Element {
  if (!isNativeTrackingMapConfigured()) {
    return (
      <MapPlaceholder
        title="Map unavailable"
        message="Live coordinates remain available below. Configure the native Google Maps key to enable the map on this build."
      />
    );
  }

  if (!latest && points.length === 0) {
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
      <LazyNativeTrackingMap latest={latest} points={points} />
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
