import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import {
  Package,
  Truck,
  WarningCircle,
} from 'phosphor-react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getLocalizedApiErrorMessage } from '@shared/api/errors';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import type { ParcelStackParamList } from '@app/navigation/types';
import {
  LiveTripTrackingPanel,
  TrackingHeader,
  type TrackingHeaderRoute,
} from '@features/tracking';
import { ErrorView, ParcelTrackingTimeline } from '../components';
import { useParcelDetail } from '../hooks/useParcelQueries';
import {
  buildParcelMilestones,
  formatParcelEventTime,
  formatParcelStatusLabel,
  isParcelLocationTrackingTerminal,
  isParcelRejected,
  isParcelTrackingEligible,
} from '../utils/parcelTracking';
import { PARCEL_ERROR_TRANSLATION_KEYS } from '../utils/parcelPresentation';

type ParcelTrackingRouteProp = RouteProp<ParcelStackParamList, 'ParcelTracking'>;
type ParcelTrackingNavProp = NativeStackNavigationProp<
  ParcelStackParamList,
  'ParcelTracking'
>;

/**
 * Same root structure as ticket TrackingScreen:
 * SafeArea → Header (+ route) → flex body → LiveTripTrackingPanel | scroll details.
 * Origin/destination live in header only (no duplicate route card).
 */
export function ParcelTrackingScreen(): React.JSX.Element {
  const route = useRoute<ParcelTrackingRouteProp>();
  const navigation = useNavigation<ParcelTrackingNavProp>();
  const { i18n, t } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { parcelId } = route.params;
  const {
    data: parcel,
    error,
    isError,
    isLoading,
    isRefetching,
    refetch,
  } = useParcelDetail(parcelId);

  const milestones = useMemo(
    () => (parcel ? buildParcelMilestones(parcel, locale) : []),
    [locale, parcel],
  );

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(() => refetch(), [refetch]);

  const isRejected = parcel ? isParcelRejected(parcel) : false;
  const isTrackingEligible = isParcelTrackingEligible(parcel?.status);
  const isTrackingTerminal = isParcelLocationTrackingTerminal(parcel?.status);
  const rejectedTime = formatParcelEventTime(parcel?.rejectedAt, locale);
  const eta = formatParcelEventTime(parcel?.eta, locale);
  const statusLabel = parcel ? formatParcelStatusLabel(parcel.status) : '';

  const headerRoute = useMemo<TrackingHeaderRoute | undefined>(() => {
    if (!parcel?.originStationName && !parcel?.destinationStationName) {
      return undefined;
    }
    return {
      originName: parcel.originStationName ?? undefined,
      destinationName: parcel.destinationStationName ?? undefined,
    };
  }, [parcel?.destinationStationName, parcel?.originStationName]);

  const headerSubtitle = useMemo(() => {
    const code = parcel?.parcelCode || parcelId;
    if (!statusLabel) return code;
    return `${code} · ${statusLabel}`;
  }, [parcel?.parcelCode, parcelId, statusLabel]);

  /** Compact sheet content under the map (no origin/dest card — header owns that). */
  const detailsFooter = useMemo(() => {
    if (!parcel) return null;

    return (
      <>
        <View style={styles.statusStrip} accessibilityRole="summary">
          <View
            style={[
              styles.statusIcon,
              isRejected ? styles.statusIconError : null,
            ]}
          >
            {isRejected ? (
              <WarningCircle size={20} color={theme.colors.error} weight="fill" />
            ) : (
              <Package size={20} color={theme.colors.primary} weight="fill" />
            )}
          </View>
          <View style={styles.statusCopy}>
            <Text style={styles.statusEyebrow}>
              {t('parcel.tracking.latestStatus')}
            </Text>
            <Text
              style={[
                styles.statusValue,
                isRejected ? styles.rejectedText : null,
              ]}
              numberOfLines={1}
            >
              {statusLabel}
            </Text>
            {eta ? (
              <Text style={styles.etaText} numberOfLines={1}>
                {t('parcel.tracking.estimatedArrival', { time: eta })}
              </Text>
            ) : null}
          </View>
        </View>

        {isRejected ? (
          <View style={styles.rejectedNotice}>
            <WarningCircle size={18} color={theme.colors.error} weight="fill" />
            <View style={styles.noticeContent}>
              <Text style={styles.noticeTitle}>
                {t('parcel.tracking.rejectedTitle')}
              </Text>
              <Text style={styles.noticeText}>
                {rejectedTime
                  ? t('parcel.tracking.rejectedAt', { time: rejectedTime })
                  : t('parcel.tracking.rejectedContactSupport')}
              </Text>
            </View>
          </View>
        ) : null}

        <ParcelTrackingTimeline milestones={milestones} />
      </>
    );
  }, [
    eta,
    isRejected,
    milestones,
    parcel,
    rejectedTime,
    statusLabel,
    styles,
    t,
    theme.colors.error,
    theme.colors.primary,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <TrackingHeader
        title={t('parcel.tracking.title')}
        subtitle={headerSubtitle}
        onBack={handleGoBack}
        route={headerRoute}
      />

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={styles.stateText}>{t('parcel.tracking.loading')}</Text>
        </View>
      ) : isError || !parcel ? (
        <ErrorView
          message={getLocalizedApiErrorMessage(
            error,
            t,
            PARCEL_ERROR_TRANSLATION_KEYS,
          )}
          onRetry={handleRefresh}
        />
      ) : isTrackingEligible ? (
        <View style={styles.body}>
          <LiveTripTrackingPanel
            source="trip"
            tripId={parcel.tripId}
            stopId={parcel.dropoffStopId ?? undefined}
            sourceTerminal={isTrackingTerminal}
            terminalMessage={t('parcel.tracking.transportComplete')}
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            detailsFooter={detailsFooter}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.fallbackScroll}
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={(
            <RefreshControl
              colors={[theme.colors.primary]}
              onRefresh={handleRefresh}
              refreshing={isRefetching}
              tintColor={theme.colors.primary}
            />
          )}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.trackingUnavailable} accessibilityRole="summary">
            <Truck size={28} color={theme.colors.textTertiary} weight="duotone" />
            <Text style={styles.trackingUnavailableTitle}>
              {t('parcel.tracking.mapUnavailableTitle')}
            </Text>
            <Text style={styles.trackingUnavailableText}>
              {t('parcel.tracking.mapUnavailableDescription')}
            </Text>
          </View>
          {detailsFooter}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    minHeight: 0,
    backgroundColor: theme.colors.background,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  fallbackScroll: {
    flex: 1,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  stateText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  scrollContent: {
    gap: spacing.md,
    padding: spacing.xl,
    paddingBottom: spacing.huge,
  },
  statusStrip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceElevated
      : theme.colors.surface,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.colors.primaryFaded,
  },
  statusIconError: {
    backgroundColor: theme.colors.errorLight,
  },
  statusCopy: {
    flex: 1,
    minWidth: 0,
  },
  statusEyebrow: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    letterSpacing: 0.4,
    color: theme.colors.textTertiary,
  },
  statusValue: {
    marginTop: 2,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  rejectedText: {
    color: theme.colors.error,
  },
  etaText: {
    marginTop: 2,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  rejectedNotice: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.errorLight,
  },
  noticeContent: {
    flex: 1,
    minWidth: 0,
  },
  noticeTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.error,
  },
  noticeText: {
    marginTop: 2,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.35,
    color: theme.colors.textSecondary,
  },
  trackingUnavailable: {
    minHeight: 140,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.surfaceAlt,
  },
  trackingUnavailableTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    textAlign: 'center' as const,
  },
  trackingUnavailableText: {
    maxWidth: 340,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.4,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
});
