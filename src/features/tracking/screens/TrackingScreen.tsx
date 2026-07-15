import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Broadcast,
  Clock,
  MapPin,
  NavigationArrow,
  WarningCircle,
  WifiSlash,
} from 'phosphor-react-native';

import type { RootStackParamList } from '@app/navigation/types';
import { toApiError } from '@shared/api/errors';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import { borderRadius, fontFamilies, fontSizes, spacing, type AppTheme } from '@shared/theme';
import { formatDateTime } from '@shared/utils/format';
import { TrackingMap } from '../components/TrackingMap';
import { useTripTracking } from '../hooks/useTripTracking';

type TrackingRoute = RouteProp<RootStackParamList, 'Tracking'>;
type TrackingNavigation = NativeStackNavigationProp<RootStackParamList, 'Tracking'>;

const distanceLabel = (distanceMeters: number): string => (
  distanceMeters >= 1_000
    ? `${(distanceMeters / 1_000).toFixed(1)} km`
    : `${distanceMeters} m`
);

interface BlockingStateProps {
  title: string;
  message: string;
  onBack: () => void;
}

function BlockingState({ title, message, onBack }: BlockingStateProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.blockingState}>
      <WarningCircle size={52} color={theme.colors.textTertiary} weight="duotone" />
      <Text style={styles.blockingTitle}>{title}</Text>
      <Text style={styles.blockingMessage}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}
        onPress={onBack}
      >
        <Text style={styles.primaryButtonText}>Go back</Text>
      </Pressable>
    </View>
  );
}

export function TrackingScreen(): React.JSX.Element {
  const route = useRoute<TrackingRoute>();
  const navigation = useNavigation<TrackingNavigation>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { tripId, stopId, bookingId, tripStatus } = route.params;
  const tracking = useTripTracking({ tripId, stopId, tripStatus });
  const refetchAll = tracking.refetchAll;

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleRetry = useCallback(() => {
    refetchAll().catch(() => undefined);
  }, [refetchAll]);

  const requestErrors = useMemo(
    () => [
      tracking.latestQuery.error,
      tracking.trailQuery.error,
      tracking.etaQuery.error,
    ].filter((error): error is NonNullable<typeof error> => Boolean(error)),
    [tracking.etaQuery.error, tracking.latestQuery.error, tracking.trailQuery.error],
  );
  const fatalError = requestErrors
    .map(toApiError)
    .find((error) => error.statusCode === 403 || error.statusCode === 404);
  const transientError = requestErrors.length > 0 && !fatalError
    ? toApiError(requestErrors[0])
    : null;
  const isInitialLoading = tracking.isQueryEnabled && (
    tracking.latestQuery.isPending
    || tracking.trailQuery.isPending
  ) && !tracking.latest && tracking.trailPoints.length === 0;

  if (!tracking.hasValidTripId) {
    return (
      <SafeAreaView style={styles.container}>
        <BlockingState
          title="Tracking unavailable"
          message="This trip does not have a valid tracking identifier."
          onBack={handleBack}
        />
      </SafeAreaView>
    );
  }

  if (!tracking.hasAuthenticatedUser) {
    return (
      <SafeAreaView style={styles.container}>
        <BlockingState
          title="Sign in required"
          message="Sign in with the passenger account that owns this booking to view tracking."
          onBack={handleBack}
        />
      </SafeAreaView>
    );
  }

  if (fatalError) {
    const isForbidden = fatalError.statusCode === 403;
    return (
      <SafeAreaView style={styles.container}>
        <BlockingState
          title={isForbidden ? 'Tracking access denied' : 'Trip not found'}
          message={isForbidden
            ? 'This passenger account is not allowed to track the selected trip.'
            : 'The tracking service could not find this trip.'}
          onBack={handleBack}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.headerButton, pressed ? styles.pressed : null]}
          onPress={handleBack}
        >
          <ArrowLeft size={23} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Live tracking</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {bookingId ? `Booking ${bookingId}` : `Trip ${tripId}`}
          </Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!tracking.isOnline ? (
          <View style={styles.warningBanner}>
            <WifiSlash size={18} color={theme.colors.warning} />
            <Text style={styles.warningBannerText}>
              Offline. Showing the last location saved on this device.
            </Text>
          </View>
        ) : null}

        {tracking.isTerminal ? (
          <View style={styles.neutralBanner}>
            <Clock size={18} color={theme.colors.textSecondary} />
            <Text style={styles.neutralBannerText}>
              {tripStatus === 'CANCELLED'
                ? 'This trip was cancelled. Automatic location updates are stopped.'
                : tripStatus === 'DISRUPTED'
                  ? 'This trip was disrupted. Automatic location updates are stopped.'
                  : 'This trip is complete. Automatic location updates are stopped.'}
            </Text>
          </View>
        ) : null}

        {transientError ? (
          <View style={styles.errorBanner}>
            <WarningCircle size={18} color={theme.colors.error} />
            <Text style={styles.errorBannerText} numberOfLines={2}>
              {transientError.message}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={handleRetry}
              style={({ pressed }) => [styles.retryButton, pressed ? styles.pressed : null]}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {isInitialLoading && tracking.isOnline ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading the latest trip location...</Text>
          </View>
        ) : (
          <TrackingMap latest={tracking.latest} points={tracking.trailPoints} />
        )}

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Broadcast size={22} color={theme.colors.primary} weight="duotone" />
            <Text style={styles.metricLabel}>LAST UPDATE</Text>
            <Text style={styles.metricValue}>
              {tracking.latest ? formatDateTime(tracking.latest.recordedAt) : 'Waiting for GPS'}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <NavigationArrow size={22} color={theme.colors.primary} weight="duotone" />
            <Text style={styles.metricLabel}>SPEED</Text>
            <Text style={styles.metricValue}>
              {tracking.latest?.speedKmh !== undefined
                ? `${Math.round(tracking.latest.speedKmh)} km/h`
                : 'Not reported'}
            </Text>
          </View>
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailHeading}>
            <MapPin size={21} color={theme.colors.primary} weight="duotone" />
            <Text style={styles.detailTitle}>Location details</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Coordinates</Text>
            <Text style={styles.detailValue}>
              {tracking.latest
                ? `${tracking.latest.latitude.toFixed(6)}, ${tracking.latest.longitude.toFixed(6)}`
                : 'Not available'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Trail points</Text>
            <Text style={styles.detailValue}>{tracking.trailPoints.length}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ETA</Text>
            <Text style={styles.detailValue}>
              {!stopId
                ? 'Select a destination stop'
                : !tracking.hasValidStopId
                  ? 'Invalid destination stop'
                  : tracking.eta
                    ? `${tracking.eta.etaMinutes} min (${distanceLabel(tracking.eta.distanceMeters)})`
                    : 'Waiting for ETA'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    minHeight: 58,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: borderRadius.full,
    borderCurve: 'continuous' as const,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center' as const,
    gap: 2,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    maxWidth: 260,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.huge,
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
  blockingState: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  blockingTitle: {
    marginTop: spacing.sm,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.textPrimary,
    textAlign: 'center' as const,
  },
  blockingMessage: {
    maxWidth: 360,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 21,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  primaryButton: {
    minWidth: 140,
    minHeight: 46,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.primary,
  },
  primaryButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
});
