import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  Broadcast,
  Clock,
  MapPin,
  NavigationArrow,
  WarningCircle,
  WifiSlash,
} from 'phosphor-react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import { useTripDetail } from '@features/trip/hooks';
import type { TripLifecycleStatus, TripStop } from '@features/trip/types';
import { toApiError } from '@shared/api/errors';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useIsAppActive, useNetworkStatus, useThemedStyles } from '@shared/hooks';
import { borderRadius, fontFamilies, fontSizes, spacing, type AppTheme } from '@shared/theme';
import { formatDateTime } from '@shared/utils/format';
import { isUuid } from '@shared/utils/pathSegment';
import { TrackingMap, type TrackingMapStop } from './TrackingMap';
import { isTerminalTrackingStatus, useTripTracking } from '../hooks/useTripTracking';

interface LiveTripTrackingPanelProps {
  tripId: string;
  stopId?: string;
  tripStatus?: TripLifecycleStatus;
  sourceTerminal?: boolean;
  terminalMessage?: string;
}

const TRIP_STATUS_REFRESH_MS = 60_000;

const toMapStops = (stops?: readonly TripStop[]): TrackingMapStop[] => (
  stops?.flatMap((stop) => (
    stop.id && stop.latitude != null && stop.longitude != null
      ? [{
          id: stop.id,
          name: stop.name,
          latitude: stop.latitude,
          longitude: stop.longitude,
        }]
      : []
  )) ?? []
);

function InlineState({
  title,
  message,
}: {
  title: string;
  message: string;
}): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.inlineState} accessibilityRole="summary">
      <WarningCircle size={38} color={theme.colors.textTertiary} weight="duotone" />
      <Text style={styles.inlineStateTitle}>{title}</Text>
      <Text style={styles.inlineStateMessage}>{message}</Text>
    </View>
  );
}

export const LiveTripTrackingPanel = React.memo(function LiveTripTrackingPanelComponent({
  tripId,
  stopId,
  tripStatus,
  sourceTerminal = false,
  terminalMessage,
}: LiveTripTrackingPanelProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const userId = useAuthStore((state) => state.user?.id);
  const isFocused = useIsFocused();
  const isAppActive = useIsAppActive();
  const isOnline = useNetworkStatus();
  const hasValidRouteTripId = isUuid(tripId);
  const canLoadTrip = Boolean(
    userId && hasValidRouteTripId && isFocused && isAppActive && isOnline,
  );
  const getTripRefetchInterval = useCallback(
    (trip: { status: TripLifecycleStatus } | undefined): number | false => (
      canLoadTrip
      && !sourceTerminal
      && !isTerminalTrackingStatus(trip?.status ?? tripStatus)
        ? TRIP_STATUS_REFRESH_MS
        : false
    ),
    [canLoadTrip, sourceTerminal, tripStatus],
  );
  const tripQuery = useTripDetail(
    hasValidRouteTripId ? tripId : undefined,
    {
      enabled: canLoadTrip,
      staleTimeMs: TRIP_STATUS_REFRESH_MS,
      getRefetchInterval: getTripRefetchInterval,
    },
  );
  const effectiveTripStatus = tripQuery.data?.status ?? tripStatus;
  const tracking = useTripTracking({
    tripId,
    stopId,
    tripStatus: effectiveTripStatus,
    sourceTerminal,
  });
  const refetchAll = tracking.refetchAll;

  const stops = useMemo(() => toMapStops(tripQuery.data?.stops), [tripQuery.data?.stops]);
  const requestErrors = useMemo(
    () => [
      tracking.latestQuery.error,
      tracking.trailQuery.error,
      tracking.etaQuery.error,
    ].filter((error): error is NonNullable<typeof error> => Boolean(error)),
    [tracking.etaQuery.error, tracking.latestQuery.error, tracking.trailQuery.error],
  );
  const fatalError = tracking.fatalError;
  const transientError = requestErrors
    .map(toApiError)
    .find((error) => error.statusCode !== 403 && error.statusCode !== 404) ?? null;
  const isInitialLoading = tracking.isQueryEnabled && (
    tracking.latestQuery.isPending
    || tracking.trailQuery.isPending
  ) && !tracking.latest && tracking.trailPoints.length === 0;

  const handleRetry = useCallback(() => {
    refetchAll().catch(() => undefined);
  }, [refetchAll]);
  const formatDistance = useCallback(
    (distanceMeters: number): string =>
      distanceMeters >= 1_000
        ? t('tracking.distanceKilometers', {
            value: (distanceMeters / 1_000).toFixed(1),
          })
        : t('tracking.distanceMeters', { value: distanceMeters }),
    [t],
  );

  if (!tracking.hasValidTripId) {
    return (
      <InlineState
        title={t('tracking.states.unavailableTitle')}
        message={t('tracking.states.invalidTripId')}
      />
    );
  }

  if (!tracking.hasAuthenticatedUser) {
    return (
      <InlineState
        title={t('tracking.states.signInTitle')}
        message={t('tracking.states.signInMessage')}
      />
    );
  }

  if (fatalError) {
    const isForbidden = fatalError.statusCode === 403;
    return (
      <InlineState
        title={
          isForbidden
            ? t('tracking.states.deniedTitle')
            : t('tracking.states.notFoundTitle')
        }
        message={isForbidden
          ? t('tracking.states.deniedMessage')
          : t('tracking.states.notFoundMessage')}
      />
    );
  }

  return (
    <View style={styles.container}>
      {!tracking.isOnline ? (
        <View style={styles.warningBanner}>
          <WifiSlash size={18} color={theme.colors.warning} />
          <Text style={styles.warningBannerText}>
            {t('tracking.connection.offline')}
          </Text>
        </View>
      ) : null}

      {tracking.isOnline && !tracking.isTerminal && tracking.realtimeStatus === 'connected' ? (
        <View style={styles.liveBanner}>
          <Broadcast size={18} color={theme.colors.success} weight="fill" />
          <Text style={styles.liveBannerText}>
            {t('tracking.connection.connected')}
          </Text>
        </View>
      ) : null}

      {tracking.isOnline && !tracking.isTerminal && tracking.realtimeStatus === 'connecting' ? (
        <View style={styles.neutralBanner}>
          <Broadcast size={18} color={theme.colors.textSecondary} weight="duotone" />
          <Text style={styles.neutralBannerText}>
            {t('tracking.connection.connecting')}
          </Text>
        </View>
      ) : null}

      {tracking.isOnline && !tracking.isTerminal && tracking.realtimeStatus === 'fallback' ? (
        <View style={styles.warningBanner}>
          <WifiSlash size={18} color={theme.colors.warning} />
          <Text style={styles.warningBannerText}>
            {t('tracking.connection.fallback')}
          </Text>
        </View>
      ) : null}

      {tracking.delay && !tracking.isTerminal ? (
        <View style={styles.warningBanner}>
          <Clock size={18} color={theme.colors.warning} />
          <Text style={styles.warningBannerText}>
            {t('tracking.delayMinutes', {
              count: tracking.delay.delayMinutes,
            })}
          </Text>
        </View>
      ) : null}

      {tracking.isTerminal ? (
        <View style={styles.neutralBanner}>
          <Clock size={18} color={theme.colors.textSecondary} />
          <Text style={styles.neutralBannerText}>
            {terminalMessage ?? t('tracking.tripComplete')}
          </Text>
        </View>
      ) : null}

      {transientError ? (
        <View style={styles.errorBanner}>
          <WarningCircle size={18} color={theme.colors.error} />
          <Text style={styles.errorBannerText} numberOfLines={2}>
            {t('tracking.errors.refresh')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={handleRetry}
            style={({ pressed }) => [styles.retryButton, pressed ? styles.pressed : null]}
          >
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : null}

      {isInitialLoading && tracking.isOnline ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>
            {t('tracking.loadingLatest')}
          </Text>
        </View>
      ) : (
        <TrackingMap latest={tracking.latest} points={tracking.trailPoints} stops={stops} />
      )}

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Broadcast size={22} color={theme.colors.primary} weight="duotone" />
          <Text style={styles.metricLabel}>
            {t('tracking.metrics.lastUpdate')}
          </Text>
          <Text style={styles.metricValue}>
            {tracking.latest
              ? formatDateTime(tracking.latest.recordedAt)
              : t('tracking.metrics.waitingGps')}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <NavigationArrow size={22} color={theme.colors.primary} weight="duotone" />
          <Text style={styles.metricLabel}>
            {t('tracking.metrics.speed')}
          </Text>
          <Text style={styles.metricValue}>
            {tracking.latest?.speedKmh !== undefined
              ? `${Math.round(tracking.latest.speedKmh)} km/h`
              : t('tracking.metrics.notReported')}
          </Text>
        </View>
      </View>

      <View style={styles.detailCard}>
        <View style={styles.detailHeading}>
          <MapPin size={21} color={theme.colors.primary} weight="duotone" />
          <Text style={styles.detailTitle}>
            {t('tracking.details.title')}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            {t('tracking.details.coordinates')}
          </Text>
          <Text style={styles.detailValue}>
            {tracking.latest
              ? `${tracking.latest.latitude.toFixed(6)}, ${tracking.latest.longitude.toFixed(6)}`
              : t('common.notAvailable')}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            {t('tracking.details.trailPoints')}
          </Text>
          <Text style={styles.detailValue}>{tracking.trailPoints.length}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            {t('tracking.eta')}
          </Text>
          <Text style={styles.detailValue}>
            {!stopId
              ? t('tracking.details.destinationUnavailable')
              : !tracking.hasValidStopId
                ? t('tracking.details.invalidDestination')
                : tracking.eta
                  ? t('tracking.details.etaValue', {
                      count: tracking.eta.etaMinutes,
                      distance: formatDistance(
                        tracking.eta.distanceMeters,
                      ),
                    })
                  : t('tracking.details.waitingEta')}
          </Text>
        </View>
      </View>
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  container: {
    gap: spacing.lg,
  },
  pressed: {
    opacity: 0.78,
  },
  warningBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.warningLight,
  },
  warningBannerText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.warning,
  },
  liveBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.successLight,
  },
  liveBannerText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.success,
  },
  neutralBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.surfaceAlt,
  },
  neutralBannerText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  errorBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.errorLight,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.error,
  },
  retryButton: {
    minHeight: 36,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.error,
  },
  retryButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textInverse,
  },
  loadingState: {
    minHeight: 240,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.md,
    borderRadius: borderRadius.xl,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.surfaceAlt,
  },
  loadingText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  metricsGrid: {
    flexDirection: 'row' as const,
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    minHeight: 116,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  metricLabel: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: theme.colors.textTertiary,
  },
  metricValue: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: theme.colors.textPrimary,
  },
  detailCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  detailHeading: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  detailTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  detailRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.md,
  },
  detailLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    flex: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    textAlign: 'right' as const,
  },
  inlineState: {
    minHeight: 220,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  inlineStateTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
    textAlign: 'center' as const,
  },
  inlineStateMessage: {
    maxWidth: 360,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 21,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
});
