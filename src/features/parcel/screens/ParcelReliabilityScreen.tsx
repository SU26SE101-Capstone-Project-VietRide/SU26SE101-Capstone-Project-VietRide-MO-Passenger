import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowClockwise,
  CaretDown,
  FileText,
  Package,
  WarningCircle,
} from 'phosphor-react-native';

import type { ParcelStackParamList } from '@app/navigation/types';
import {
  LiveTripTrackingPanel,
  TrackingHeader,
  type TrackingHeaderRoute,
} from '@features/tracking';
import { getLocalizedApiErrorMessage } from '@shared/api/errors';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { formatDateTime } from '@shared/utils/format';
import { isUuid } from '@shared/utils/pathSegment';
import type { TrackingTarget } from '@features/tracking/types/trackingTarget';
import { ErrorView } from '../components';
import { useParcelTrace } from '../hooks/useParcelReliabilityQueries';
import {
  isParcelLocationTrackingTerminal,
  isParcelTrackingEligible,
} from '../utils/parcelTracking';
import { PARCEL_ERROR_TRANSLATION_KEYS } from '../utils/parcelPresentation';
import type { ParcelCustodyEvent, ParcelTrace } from '../types';

type ReliabilityRoute = RouteProp<ParcelStackParamList, 'ParcelTracking'>;
type ReliabilityNavigation = NativeStackNavigationProp<
  ParcelStackParamList,
  'ParcelTracking'
>;

const dedupeTimeline = (pages: ParcelTrace[]): ParcelCustodyEvent[] => {
  const seen = new Set<string>();
  return pages.flatMap((page) => page.timeline.items).filter((event) => {
    if (seen.has(event.eventId)) return false;
    seen.add(event.eventId);
    return true;
  }).sort((left, right) => right.sequence - left.sequence);
};

export function ParcelReliabilityScreen(): React.JSX.Element {
  const route = useRoute<ReliabilityRoute>();
  const navigation = useNavigation<ReliabilityNavigation>();
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { parcelId, trackingTarget: routeTrackingTarget } = route.params;
  const traceQuery = useParcelTrace(parcelId);
  const trace = traceQuery.data?.pages[0];
  const timeline = useMemo(
    () => dedupeTimeline(traceQuery.data?.pages ?? []),
    [traceQuery.data?.pages],
  );

  const trackingTarget = useMemo<TrackingTarget | undefined>(() => {
    if (routeTrackingTarget) return routeTrackingTarget;
    const location = trace?.dropoffLocation;
    if (!location?.id || !isUuid(location.id)) return undefined;
    return location.type?.toUpperCase().includes('STOP')
      ? { kind: 'STOP', stopId: location.id }
      : { kind: 'STATION', stationId: location.id };
  }, [routeTrackingTarget, trace?.dropoffLocation]);

  const headerRoute = useMemo<TrackingHeaderRoute | undefined>(() => {
    const routeSummary = trace?.trip.route;
    if (!routeSummary) return undefined;
    return {
      originName: routeSummary.origin.name ?? undefined,
      destinationName: routeSummary.destination.name ?? undefined,
    };
  }, [trace?.trip.route]);

  const handleRefresh = useCallback(() => {
    traceQuery.refetch().catch(() => undefined);
  }, [traceQuery]);
  const handleLoadMore = useCallback(() => {
    if (!traceQuery.hasNextPage || traceQuery.isFetchingNextPage) return;
    traceQuery.fetchNextPage().catch(() => undefined);
  }, [traceQuery]);
  const handleReportIncident = useCallback(() => {
    navigation.navigate('ReportParcelIncident', { parcelId });
  }, [navigation, parcelId]);
  const handleOpenClaim = useCallback(() => {
    navigation.navigate('ParcelClaim', { parcelId });
  }, [navigation, parcelId]);

  const hasReportAction = trace?.availableActions.includes('REPORT_INCIDENT') ?? false;
  const hasClaimSurface = Boolean(
    trace?.claimSummary
    || trace?.availableActions.includes('SUBMIT_CLAIM')
    || trace?.availableActions.includes('APPEAL'),
  );
  const trackingEligible = isParcelTrackingEligible(trace?.parcelStatus);
  const trackingTerminal = isParcelLocationTrackingTerminal(trace?.parcelStatus);

  const details = useMemo(() => {
    if (!trace) return null;
    return (
      <View style={styles.details}>
        <View style={styles.summaryCard} accessibilityRole="summary">
          <View style={styles.summaryHeader}>
            <Package size={22} color={theme.colors.primary} weight="duotone" />
            <View style={styles.summaryCopy}>
              <Text style={styles.eyebrow}>{t('parcel.reliability.latestStatus')}</Text>
              <Text style={styles.summaryTitle}>{trace.parcelStatus}</Text>
            </View>
          </View>
          {trace.currentCustody ? (
            <>
              <Text style={styles.summaryText}>
                {t('parcel.reliability.lastCustody', {
                  event: trace.currentCustody.lastEventType,
                  location: trace.currentCustody.lastLocationSnapshot
                    ?? t('common.notAvailable'),
                })}
              </Text>
              <Text style={styles.summaryMuted}>
                {t('parcel.reliability.confidence', {
                  value: trace.currentCustody.trackingConfidence,
                })}
              </Text>
            </>
          ) : null}
          {trace.nextUpdateAt ? (
            <Text style={styles.summaryMuted}>
              {t('parcel.reliability.nextUpdate', {
                time: formatDateTime(trace.nextUpdateAt),
              })}
            </Text>
          ) : null}
        </View>

        {trace.activeIncident ? (
          <View style={styles.warningCard}>
            <WarningCircle size={20} color={theme.colors.warning} weight="fill" />
            <View style={styles.warningCopy}>
              <Text style={styles.warningTitle}>
                {t('parcel.reliability.activeIncident')}
              </Text>
              <Text style={styles.warningText}>
                {trace.activeIncident.type} · {trace.activeIncident.status}
              </Text>
              <Text style={styles.warningText}>
                {t('parcel.reliability.searchDeadline', {
                  time: formatDateTime(trace.activeIncident.searchDeadline),
                })}
              </Text>
            </View>
          </View>
        ) : null}

        {trace.forwardingTrip ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>{t('parcel.reliability.forwarding')}</Text>
            <Text style={styles.infoText}>
              {trace.forwardingTrip.route?.name ?? trace.forwardingTrip.tripId}
            </Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          {hasReportAction ? (
            <Pressable
              accessibilityRole="button"
              onPress={handleReportIncident}
              style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}
            >
              <WarningCircle size={18} color={theme.colors.primary} />
              <Text style={styles.secondaryButtonText}>
                {t('parcel.reliability.reportIncident')}
              </Text>
            </Pressable>
          ) : null}
          {hasClaimSurface ? (
            <Pressable
              accessibilityRole="button"
              onPress={handleOpenClaim}
              style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}
            >
              <FileText size={18} color={theme.colors.textInverse} />
              <Text style={styles.primaryButtonText}>
                {t('parcel.reliability.openClaim')}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>{t('parcel.reliability.timeline')}</Text>
          {timeline.map((event, index) => (
            <View key={event.eventId} style={styles.timelineRow}>
              <View style={styles.timelineRail}>
                <View style={styles.timelineDot} />
                {index < timeline.length - 1 ? <View style={styles.timelineLine} /> : null}
              </View>
              <View style={styles.timelineCopy}>
                <Text style={styles.timelineTitle}>{event.eventType}</Text>
                <Text style={styles.timelineText}>
                  {event.locationSnapshot ?? event.actualLocationType ?? t('common.notAvailable')}
                </Text>
                <Text style={styles.timelineTime}>{formatDateTime(event.occurredAt)}</Text>
              </View>
            </View>
          ))}
          {traceQuery.hasNextPage ? (
            <Pressable
              accessibilityRole="button"
              disabled={traceQuery.isFetchingNextPage}
              onPress={handleLoadMore}
              style={({ pressed }) => [styles.loadMore, pressed ? styles.pressed : null]}
            >
              {traceQuery.isFetchingNextPage
                ? <ActivityIndicator size="small" color={theme.colors.primary} />
                : <CaretDown size={18} color={theme.colors.primary} />}
              <Text style={styles.loadMoreText}>{t('parcel.reliability.loadEarlier')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }, [
    handleLoadMore,
    handleOpenClaim,
    handleReportIncident,
    hasClaimSurface,
    hasReportAction,
    styles,
    t,
    theme.colors.primary,
    theme.colors.textInverse,
    theme.colors.warning,
    timeline,
    trace,
    traceQuery.hasNextPage,
    traceQuery.isFetchingNextPage,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <TrackingHeader
        title={t('parcel.reliability.title')}
        subtitle={trace ? `${trace.parcelCode} · ${trace.parcelStatus}` : parcelId}
        onBack={() => navigation.goBack()}
        route={headerRoute}
      />

      {traceQuery.isLoading ? (
        <View style={styles.state}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>{t('parcel.reliability.loading')}</Text>
        </View>
      ) : !trace ? (
        <ErrorView
          message={getLocalizedApiErrorMessage(
            traceQuery.error,
            t,
            PARCEL_ERROR_TRANSLATION_KEYS,
          )}
          onRetry={handleRefresh}
        />
      ) : trackingEligible ? (
        <View style={styles.body}>
          <LiveTripTrackingPanel
            source="trip"
            tripId={trace.trip.tripId}
            trackingTarget={trackingTarget}
            fallbackToTripDestinationTarget={!trackingTarget}
            sourceTerminal={trackingTerminal}
            terminalMessage={t('parcel.tracking.transportComplete')}
            refreshing={traceQuery.isRefetching}
            onRefresh={handleRefresh}
            detailsFooter={details}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.scrollContent}
          refreshControl={(
            <RefreshControl
              refreshing={traceQuery.isRefetching}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          )}
        >
          <Pressable
            accessibilityRole="button"
            onPress={handleRefresh}
            style={styles.refreshHint}
          >
            <ArrowClockwise size={18} color={theme.colors.primary} />
            <Text style={styles.refreshHintText}>{t('parcel.actions.refresh')}</Text>
          </Pressable>
          {details}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  body: { flex: 1, minHeight: 0 },
  state: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.md,
    padding: spacing.xl,
  },
  stateText: {
    color: theme.colors.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
  },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.huge },
  details: { gap: spacing.md },
  summaryCard: {
    ...theme.components.card,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  summaryHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.md },
  summaryCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: theme.colors.textTertiary, fontFamily: fontFamilies.bold, fontSize: fontSizes.xs },
  summaryTitle: { color: theme.colors.textPrimary, fontFamily: fontFamilies.bold, fontSize: fontSizes.md },
  summaryText: { color: theme.colors.textPrimary, fontFamily: fontFamilies.medium, fontSize: fontSizes.sm },
  summaryMuted: { color: theme.colors.textSecondary, fontFamily: fontFamilies.regular, fontSize: fontSizes.xs },
  warningCard: {
    flexDirection: 'row' as const,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.warningLight,
  },
  warningCopy: { flex: 1, minWidth: 0 },
  warningTitle: { color: theme.colors.textPrimary, fontFamily: fontFamilies.bold, fontSize: fontSizes.sm },
  warningText: { color: theme.colors.textSecondary, fontFamily: fontFamilies.regular, fontSize: fontSizes.xs, marginTop: 2 },
  infoCard: { padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: theme.colors.surfaceAlt },
  infoTitle: { color: theme.colors.textPrimary, fontFamily: fontFamilies.bold, fontSize: fontSizes.sm },
  infoText: { marginTop: spacing.xs, color: theme.colors.textSecondary, fontFamily: fontFamilies.regular, fontSize: fontSizes.xs },
  actionRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm },
  primaryButton: {
    minHeight: 44,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  primaryButtonText: { color: theme.colors.textInverse, fontFamily: fontFamilies.bold, fontSize: fontSizes.sm },
  secondaryButton: {
    minHeight: 44,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  secondaryButtonText: { color: theme.colors.primary, fontFamily: fontFamilies.bold, fontSize: fontSizes.sm },
  timelineCard: { ...theme.components.card, padding: spacing.lg, borderRadius: borderRadius.lg },
  sectionTitle: { color: theme.colors.textPrimary, fontFamily: fontFamilies.bold, fontSize: fontSizes.md, marginBottom: spacing.md },
  timelineRow: { flexDirection: 'row' as const, minHeight: 72 },
  timelineRail: { width: 20, alignItems: 'center' as const },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, backgroundColor: theme.colors.primary },
  timelineLine: { width: 2, flex: 1, marginVertical: 3, backgroundColor: theme.colors.divider },
  timelineCopy: { flex: 1, paddingLeft: spacing.sm, paddingBottom: spacing.md },
  timelineTitle: { color: theme.colors.textPrimary, fontFamily: fontFamilies.bold, fontSize: fontSizes.sm },
  timelineText: { color: theme.colors.textSecondary, fontFamily: fontFamilies.regular, fontSize: fontSizes.xs, marginTop: 2 },
  timelineTime: { color: theme.colors.textTertiary, fontFamily: fontFamilies.regular, fontSize: fontSizes.xs, marginTop: 2 },
  loadMore: { minHeight: 44, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: spacing.xs },
  loadMoreText: { color: theme.colors.primary, fontFamily: fontFamilies.bold, fontSize: fontSizes.sm },
  refreshHint: { alignSelf: 'flex-end' as const, minHeight: 44, flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.xs },
  refreshHintText: { color: theme.colors.primary, fontFamily: fontFamilies.bold, fontSize: fontSizes.sm },
  pressed: { opacity: 0.78 },
});
