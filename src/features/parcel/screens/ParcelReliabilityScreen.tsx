import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowClockwise,
  CaretDown,
  FileText,
  LinkBreak,
  Package,
  ShareNetwork,
  WarningCircle,
} from 'phosphor-react-native';

import type { ParcelStackParamList } from '@app/navigation/types';
import {
  LiveTripTrackingPanel,
  TrackingHeader,
  type TrackingHeaderAction,
  type TrackingHeaderRoute,
  type TrackingShareQuickAction,
  type TrackingSupplementalListItem,
  type TrackingSupplementalListSection,
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
import { ErrorView, ParcelSkeleton } from '../components';
import { useParcelTrace } from '../hooks/useParcelReliabilityQueries';
import {
  isParcelLocationTrackingTerminal,
  resolveParcelLiveTrackingTrip,
} from '../utils/parcelTracking';
import {
  getParcelCustodyEventLabelKey,
  getParcelIncidentStatusLabelKey,
  getParcelStatusPresentation,
  getParcelTrackingConfidenceDescriptionKey,
  shouldShowParcelIncidentSearchDeadline,
  PARCEL_ERROR_TRANSLATION_KEYS,
} from '../utils/parcelPresentation';
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

interface ParcelTimelineRowProps {
  eventType: string;
  locationSnapshot: string | null;
  occurredAt: string;
  showLine: boolean;
}

const ParcelTimelineRow = React.memo(function ParcelTimelineRowComponent({
  eventType,
  locationSnapshot,
  occurredAt,
  showLine,
}: ParcelTimelineRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.timelineEventCard}>
      <View style={styles.timelineRow}>
        <View style={styles.timelineRail}>
          <View style={styles.timelineDot} />
          {showLine ? <View style={styles.timelineLine} /> : null}
        </View>
        <View style={styles.timelineCopy}>
          <Text style={styles.timelineTitle}>
            {t(getParcelCustodyEventLabelKey(eventType))}
          </Text>
          <Text style={styles.timelineText}>
            {locationSnapshot ?? t('parcel.reliability.locationUnavailable')}
          </Text>
          <Text style={styles.timelineTime}>{formatDateTime(occurredAt)}</Text>
        </View>
      </View>
    </View>
  );
});

export function ParcelReliabilityScreen(): React.JSX.Element {
  const route = useRoute<ReliabilityRoute>();
  const navigation = useNavigation<ReliabilityNavigation>();
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { parcelId, trackingTarget: routeTrackingTarget } = route.params;
  const traceQuery = useParcelTrace(parcelId);
  const trace = traceQuery.data?.pages[0];
  const [shareQuickAction, setShareQuickAction] = useState<TrackingShareQuickAction | null>(null);
  const timeline = useMemo(
    () => dedupeTimeline(traceQuery.data?.pages ?? []),
    [traceQuery.data?.pages],
  );
  const liveTrackingTrip = trace
    ? resolveParcelLiveTrackingTrip({
        parcelStatus: trace.parcelStatus,
        trip: trace.trip,
        forwardingTrip: trace.forwardingTrip,
      })
    : null;
  const normalizedParcelStatus = trace?.parcelStatus.trim().toUpperCase();
  const isTransferPending = normalizedParcelStatus === 'PENDING_TRANSFER_CONFIRM';
  const isTransferEscalated = normalizedParcelStatus === 'TRANSFER_ESCALATED';
  const hasTransferState = isTransferPending || isTransferEscalated;
  const isShowingStaleTrace = Boolean(trace && traceQuery.isError);

  const trackingTarget = useMemo<TrackingTarget | undefined>(() => {
    if (routeTrackingTarget) return routeTrackingTarget;
    const location = trace?.dropoffLocation;
    if (!location?.id || !isUuid(location.id)) return undefined;
    return location.type?.toUpperCase().includes('STOP')
      ? { kind: 'STOP', stopId: location.id }
      : { kind: 'STATION', stationId: location.id };
  }, [routeTrackingTarget, trace?.dropoffLocation]);

  const headerRoute = useMemo<TrackingHeaderRoute | undefined>(() => {
    const routeSummary = (liveTrackingTrip ?? trace?.trip)?.route;
    if (!routeSummary) return undefined;
    return {
      originName: routeSummary.origin.name ?? undefined,
      destinationName: routeSummary.destination.name ?? undefined,
    };
  }, [liveTrackingTrip, trace?.trip]);

  const handleRefresh = useCallback(() => {
    traceQuery.refetch().catch(() => undefined);
  }, [traceQuery]);
  const handleLoadMore = useCallback(() => {
    if (!traceQuery.hasNextPage || traceQuery.isFetchingNextPage) return;
    traceQuery.fetchNextPage().catch(() => undefined);
  }, [traceQuery]);
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);
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
    || trace?.availableActions.includes('ADD_EVIDENCE')
    || trace?.availableActions.includes('APPEAL'),
  );
  const trackingTerminal = isParcelLocationTrackingTerminal(trace?.parcelStatus);
  const headerActions = useMemo<readonly TrackingHeaderAction[]>(() => {
    const actions: TrackingHeaderAction[] = [];
    if (hasReportAction) {
      actions.push({
        key: 'report-incident',
        accessibilityLabel: t('parcel.reliability.reportIncident'),
        icon: <WarningCircle size={20} color={theme.colors.warningForeground} weight="bold" />,
        onPress: handleReportIncident,
      });
    }
    if (shareQuickAction && shareQuickAction.scopeKey === liveTrackingTrip?.tripId) {
      const isRevoke = shareQuickAction.mode === 'revoke';
      actions.push({
        key: 'share-location',
        accessibilityLabel: t(isRevoke
          ? 'tracking.share.revokeAction'
          : 'tracking.share.action'),
        accessibilityHint: t(isRevoke
          ? 'tracking.share.revokeActionHint'
          : 'tracking.share.actionHint'),
        busy: shareQuickAction.pending,
        disabled: shareQuickAction.disabled,
        tone: isRevoke ? 'destructive' : 'default',
        icon: isRevoke
          ? <LinkBreak size={20} color={theme.colors.error} weight="bold" />
          : <ShareNetwork size={20} color={theme.colors.primary} weight="bold" />,
        onPress: shareQuickAction.onPress,
      });
    }
    return actions;
  }, [
    handleReportIncident,
    hasReportAction,
    shareQuickAction,
    t,
    theme.colors.error,
    theme.colors.primary,
    theme.colors.warningForeground,
    liveTrackingTrip?.tripId,
  ]);

  const detailsHeader = useMemo(() => {
    if (!trace) return null;
    return (
      <View style={styles.details}>
        {isShowingStaleTrace ? (
          <View style={styles.staleNotice} accessibilityRole="alert">
            <WarningCircle
              size={18}
              color={theme.colors.warningForeground}
              weight="fill"
            />
            <Text style={styles.staleNoticeText}>
              {t('parcel.reliability.staleData')}
            </Text>
          </View>
        ) : null}

        <View style={styles.summaryCard} accessibilityRole="summary">
          <View style={styles.summaryHeader}>
            <Package size={22} color={theme.colors.primary} weight="duotone" />
            <View style={styles.summaryCopy}>
              <Text style={styles.eyebrow}>{t('parcel.reliability.latestStatus')}</Text>
              <Text style={styles.summaryTitle}>
                {t(getParcelStatusPresentation(trace.parcelStatus).labelKey)}
              </Text>
            </View>
          </View>
          {trace.currentCustody ? (
            <>
              <Text style={styles.summaryText}>
                {t('parcel.reliability.lastCustody', {
                  event: t(getParcelCustodyEventLabelKey(
                    trace.currentCustody.lastEventType,
                  )),
                  location: trace.currentCustody.lastLocationSnapshot
                    ?? t('parcel.reliability.locationUnavailable'),
                })}
              </Text>
              <Text style={styles.summaryMuted}>
                {t(getParcelTrackingConfidenceDescriptionKey(
                  trace.currentCustody.trackingConfidence,
                ))}
              </Text>
            </>
          ) : null}
        </View>

        {trace.activeIncident ? (
          <View style={styles.warningCard}>
            <WarningCircle size={20} color={theme.colors.warningForeground} weight="fill" />
            <View style={styles.warningCopy}>
              <Text style={styles.warningTitle}>
                {t('parcel.reliability.activeIncident')}
              </Text>
              <Text style={styles.warningText}>
                {t(`parcel.incident.types.${trace.activeIncident.type}`)}
                {' · '}
                {t(getParcelIncidentStatusLabelKey(trace.activeIncident.status))}
              </Text>
              {trace.activeIncident.searchDeadline !== null
              && shouldShowParcelIncidentSearchDeadline(
                trace.activeIncident.status,
                trace.activeIncident.slaState,
                trace.activeIncident.searchDeadline,
              ) ? (
                <Text style={styles.warningText}>
                  {t('parcel.reliability.searchDeadline', {
                    time: formatDateTime(trace.activeIncident.searchDeadline),
                  })}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {hasTransferState ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>
              {t(isTransferEscalated
                ? 'parcel.reliability.transferEscalatedTitle'
                : 'parcel.reliability.transferPendingTitle')}
            </Text>
            <Text style={styles.infoText}>
              {t(isTransferEscalated
                ? trace.operator.contactPhone
                  ? 'parcel.reliability.transferEscalatedDescriptionWithPhone'
                  : 'parcel.reliability.transferEscalatedDescription'
                : liveTrackingTrip
                  ? 'parcel.reliability.transferPendingLiveDescription'
                  : 'parcel.reliability.transferPendingDescription', {
                operator: trace.operator.name
                  ?? t('parcel.reliability.operatorFallback'),
                phone: trace.operator.contactPhone ?? '',
              })}
            </Text>
            {trace.forwardingTrip?.vehicle?.licensePlate ? (
              <Text style={styles.infoMeta}>
                {t('parcel.reliability.replacementVehicle', {
                  licensePlate: trace.forwardingTrip.vehicle.licensePlate,
                })}
              </Text>
            ) : null}
          </View>
        ) : trace.forwardingTrip ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>{t('parcel.reliability.forwarding')}</Text>
            <Text style={styles.infoText}>
              {trace.forwardingTrip.route?.name
                ?? t('parcel.reliability.forwardingDescription')}
            </Text>
          </View>
        ) : null}

        {hasClaimSurface ? (
          <View style={styles.actionRow}>
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
          </View>
        ) : null}

        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>{t('parcel.reliability.timeline')}</Text>
        </View>
      </View>
    );
  }, [
    handleOpenClaim,
    hasTransferState,
    hasClaimSurface,
    isTransferEscalated,
    isShowingStaleTrace,
    liveTrackingTrip,
    styles,
    t,
    theme.colors.primary,
    theme.colors.textInverse,
    theme.colors.warningForeground,
    trace,
  ]);

  const renderTimelineItem = useCallback<ListRenderItem<ParcelCustodyEvent>>(
    ({ index, item }) => (
      <ParcelTimelineRow
        eventType={item.eventType}
        locationSnapshot={item.locationSnapshot}
        occurredAt={item.occurredAt}
        showLine={index < timeline.length - 1}
      />
    ),
    [timeline.length],
  );
  const timelineKeyExtractor = useCallback(
    (item: ParcelCustodyEvent) => item.eventId,
    [],
  );
  const getTimelineItemType = useCallback(
    () => 'parcel-timeline-event',
    [],
  );
  const supplementalTimelineItems = useMemo<
    TrackingSupplementalListItem[]
  >(
    () => timeline.map((event, index) => ({
      content: (
        <ParcelTimelineRow
          eventType={event.eventType}
          locationSnapshot={event.locationSnapshot}
          occurredAt={event.occurredAt}
          showLine={index < timeline.length - 1}
        />
      ),
      key: event.eventId,
      type: 'parcel-timeline-event',
    })),
    [timeline],
  );
  const loadMoreControl = useMemo(() => {
    if (!traceQuery.hasNextPage) return null;
    return (
      <Pressable
        accessibilityRole="button"
        disabled={traceQuery.isFetchingNextPage}
        onPress={handleLoadMore}
        style={({ pressed }) => [
          styles.loadMore,
          pressed ? styles.pressed : null,
        ]}
      >
        {traceQuery.isFetchingNextPage
          ? <ActivityIndicator size="small" color={theme.colors.primary} />
          : <CaretDown size={18} color={theme.colors.primary} />}
        <Text style={styles.loadMoreText}>
          {t('parcel.reliability.loadEarlier')}
        </Text>
      </Pressable>
    );
  }, [
    handleLoadMore,
    styles,
    t,
    theme.colors.primary,
    traceQuery.hasNextPage,
    traceQuery.isFetchingNextPage,
  ]);
  const timelineListSection = useMemo<TrackingSupplementalListSection>(
    () => ({
      footer: loadMoreControl,
      items: supplementalTimelineItems,
    }),
    [loadMoreControl, supplementalTimelineItems],
  );
  const nonTrackingHeader = useMemo(() => (
    <View style={styles.nonTrackingHeader}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('parcel.actions.refresh')}
        onPress={handleRefresh}
        style={({ pressed }) => [
          styles.refreshHint,
          pressed ? styles.pressed : null,
        ]}
      >
        <ArrowClockwise size={18} color={theme.colors.primary} />
        <Text style={styles.refreshHintText}>
          {t('parcel.actions.refresh')}
        </Text>
      </Pressable>
      {detailsHeader}
    </View>
  ), [
    detailsHeader,
    handleRefresh,
    styles,
    t,
    theme.colors.primary,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <TrackingHeader
        title={t('parcel.reliability.title')}
        subtitle={trace
          ? t('parcel.reliability.headerSubtitle', {
              code: trace.parcelCode,
              status: t(getParcelStatusPresentation(trace.parcelStatus).labelKey),
            })
          : t('parcel.reliability.loadingSubtitle')}
        onBack={handleBack}
        route={headerRoute}
        actions={headerActions}
      />

      {traceQuery.isLoading ? (
        <View
          accessibilityLabel={t('parcel.reliability.loading')}
          style={styles.loadingBody}
        >
          <ParcelSkeleton type="summary" count={1} />
          <ParcelSkeleton type="shipment" count={3} />
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
      ) : liveTrackingTrip ? (
        <View style={styles.body}>
          <LiveTripTrackingPanel
            source="trip"
            tripId={liveTrackingTrip.tripId}
            trackingTarget={trackingTarget}
            fallbackToTripDestinationTarget={!trackingTarget}
            sourceTerminal={trackingTerminal}
            terminalMessage={t('parcel.tracking.transportComplete')}
            refreshing={traceQuery.isRefetching}
            onRefresh={handleRefresh}
            onShareQuickActionChange={setShareQuickAction}
            detailsFooter={detailsHeader}
            detailsListSection={timelineListSection}
          />
        </View>
      ) : (
        <FlashList
          style={styles.body}
          contentContainerStyle={styles.scrollContent}
          data={timeline}
          getItemType={getTimelineItemType}
          keyExtractor={timelineKeyExtractor}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={loadMoreControl}
          ListHeaderComponent={nonTrackingHeader}
          onRefresh={handleRefresh}
          refreshing={traceQuery.isRefetching}
          renderItem={renderTimelineItem}
          showsVerticalScrollIndicator
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  body: { flex: 1, minHeight: 0 },
  loadingBody: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.huge },
  nonTrackingHeader: { gap: spacing.md },
  details: { gap: spacing.md },
  staleNotice: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.warningLight,
  },
  staleNoticeText: {
    flex: 1,
    color: theme.colors.warningForeground,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
  },
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
  infoMeta: { marginTop: spacing.sm, color: theme.colors.textPrimary, fontFamily: fontFamilies.bold, fontSize: fontSizes.xs },
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
  timelineCard: { ...theme.components.card, padding: spacing.lg, borderRadius: borderRadius.lg },
  sectionTitle: { color: theme.colors.textPrimary, fontFamily: fontFamilies.bold, fontSize: fontSizes.md, marginBottom: spacing.md },
  timelineEventCard: {
    ...theme.components.card,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  timelineRow: { flexDirection: 'row' as const, minHeight: 72 },
  timelineRail: { width: 20, alignItems: 'center' as const },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, backgroundColor: theme.colors.primary },
  timelineLine: { width: 2, flex: 1, marginVertical: 3, backgroundColor: theme.colors.divider },
  timelineCopy: { flex: 1, paddingLeft: spacing.sm, paddingBottom: spacing.md },
  timelineTitle: { color: theme.colors.textPrimary, fontFamily: fontFamilies.bold, fontSize: fontSizes.sm },
  timelineText: { color: theme.colors.textSecondary, fontFamily: fontFamilies.regular, fontSize: fontSizes.xs, marginTop: 2 },
  timelineTime: { color: theme.colors.textTertiary, fontFamily: fontFamilies.regular, fontSize: fontSizes.xs, marginTop: 2 },
  loadMore: { minHeight: 44, marginTop: spacing.sm, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: spacing.xs },
  loadMoreText: { color: theme.colors.primary, fontFamily: fontFamilies.bold, fontSize: fontSizes.sm },
  refreshHint: { alignSelf: 'flex-end' as const, minHeight: 44, flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.xs },
  refreshHintText: { color: theme.colors.primary, fontFamily: fontFamilies.bold, fontSize: fontSizes.sm },
  pressed: { opacity: 0.78 },
});
