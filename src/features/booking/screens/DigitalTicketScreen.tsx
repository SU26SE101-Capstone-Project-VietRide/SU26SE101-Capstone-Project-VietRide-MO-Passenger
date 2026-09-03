import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, Text, View } from 'react-native';
import {
  useNavigation,
  useRoute,
  type CompositeNavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  BellRinging,
  CalendarBlank,
  CheckCircle,
  ClockCountdown,
  File,
  Flask,
  MapPin,
  PathIcon,
  ShareNetwork,
  Ticket,
  Wallet,
  Van,
  WarningCircle,
  XCircle,
} from 'phosphor-react-native';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';

import type { BookingStackParamList, RootStackParamList } from '@app/navigation/types';
import type { PassengerTicketHistoryItem } from '@features/profile/types';
import { useQueryClient } from '@tanstack/react-query';
import { bookingHistoryKeys } from '../api/bookingHistoryApi';
import { ShuttleHistorySummary } from '@features/profile/components/ShuttleHistorySummary';
import { useTripDetail } from '@features/trip/hooks/useTripDetail';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { getLocalizedApiErrorMessage } from '@shared/api/errors';
import { ScannableCodeCard, StatusChip, VnPayLogo } from '@shared/components';
import { useResponsiveLayout, useThemedStyles } from '@shared/hooks';
import {
  borderRadius as BR,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { formatVnd } from '@shared/utils/format';
import { showSnackbar } from '@shared/store/useSnackbarStore';
import {
  cancelTripReminder,
  ensureNotificationChannels,
  getNotificationPermissionState,
  openSystemNotificationSettings,
  requestNotificationPermission,
  scheduleTripReminder,
} from '@shared/notifications';
import {
  VnPayPaymentOpenCoordinator,
} from '@shared/payments';
import {
  useBookingPaymentReconciliation,
  usePendingHistoryBookingReconciliation,
} from '../hooks/useBookingPaymentReconciliation';
import { useBookingHistoryTicketSnapshot } from '../hooks/useBookingHistory';
import { useCancelBooking } from '../hooks/useCancelBooking';
import { useBookingStore } from '../store/useBookingStore';
import type { BookingResult, RoundTripResult } from '../types';
import {
  buildCheckoutTicketViewModel,
  buildPassengerHistoryTicketViewModel,
  buildTicketPages,
  hydrateCheckoutBookingResultFromHistory,
  type TicketLegViewModel,
  type TicketPageViewModel,
  type TicketViewModel,
} from '../utils/ticketViewModel';
import { TICKET_JOURNEY_COLOR_TOKENS } from '../utils/ticketJourneyPresentation';
import {
  canShowBoardingQr,
  getTicketLifecyclePresentation,
  getTicketStatusPresentation,
  type TicketStatusPresentation,
} from '../utils/ticketPresentation';
import {
  canCancelBooking,
  parseDepartureMs,
} from '../utils/bookingCancellation';
import { reconcilePassengerHistoryBookingStatus } from '../utils/bookingPayment';

type DigitalTicketRoute = RouteProp<BookingStackParamList, 'DigitalTicket'>;
type DigitalTicketNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<BookingStackParamList, 'DigitalTicket'>,
  NativeStackNavigationProp<RootStackParamList>
>;
const CANCEL_BOOKING_ERROR_TRANSLATION_KEYS = {
  BOOKING_NOT_CANCELLABLE: 'booking.ticket.cancelNotAvailableDescription',
  BOOKING_NOT_FOUND: 'booking.ticket.cancelNotFound',
  TRIP_NOT_FOUND: 'booking.ticket.cancelTripUnavailable',
} as const;


interface TicketViewProps {
  model: TicketViewModel;
  source: 'checkout' | 'history';
  onBack: () => void;
  onViewBookings: () => void;
  onHome: () => void;
  onTrack: (leg: TicketLegViewModel) => void;
  pendingPaymentActions?: PendingPaymentActions;
  cancellationActions?: CancellationActions;
  reminderDepartureDateTime?: string;
}

interface PendingPaymentActions {
  isChecking: boolean;
  isOnline: boolean;
  errorMessage?: string;
  onCheck: () => void;
  onOpenPayment?: () => void;
}

interface CancellationActions {
  isCancelling: boolean;
  onCancel: () => void;
}

interface TicketSelectorProps {
  pages: readonly TicketPageViewModel[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

const TicketSelector = memo(function TicketSelectorComponent({
  pages,
  selectedKey,
  onSelect,
}: TicketSelectorProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  if (pages.length <= 1) return null;

  return (
    <View style={styles.ticketSelector}>
      <Text style={styles.ticketSelectorLabel}>{t('booking.ticket.selectTicket')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.ticketSelectorContent}
      >
        {pages.map((page) => {
          const selected = page.key === selectedKey;
          const seat = page.ticket?.seatNumber || page.leg.seatNumbers;
          return (
            <Pressable
              key={page.key}
              accessibilityRole="tab"
              accessibilityLabel={t('booking.ticket.ticketAccessibility', {
                index: page.index,
                total: pages.length,
                leg: page.leg.label,
                seat,
              })}
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.ticketSelectorItem,
                selected ? styles.ticketSelectorItemSelected : null,
                pressed ? styles.pressed : null,
              ]}
              onPress={() => onSelect(page.key)}
            >
              <Text style={[
                styles.ticketSelectorNumber,
                selected ? styles.ticketSelectorNumberSelected : null,
              ]}>
                {t('booking.ticket.ticketNumber', { index: page.index })}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.ticketSelectorMeta,
                  selected ? styles.ticketSelectorMetaSelected : null,
                ]}
              >
                {t('booking.ticket.ticketSelectorMeta', {
                  leg: page.leg.label,
                  seat,
                })}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});

function statusIconColor(
  theme: AppTheme,
  tone: TicketStatusPresentation['tone'],
): string {
  switch (tone) {
    case 'success':
      return theme.colors.success;
    case 'warning':
      return theme.colors.warningForeground;
    case 'error':
      return theme.colors.error;
    case 'info':
      return theme.colors.primary;
    default:
      return theme.colors.textSecondary;
  }
}

function StatusHeaderIcon({
  isPendingPayment,
  isChecking,
  tone,
}: {
  isPendingPayment: boolean;
  isChecking?: boolean;
  tone: TicketStatusPresentation['tone'];
}): React.JSX.Element {
  const theme = useTheme();
  if (isPendingPayment && isChecking) {
    return <ActivityIndicator size="large" color={theme.colors.primary} />;
  }
  if (isPendingPayment || tone === 'warning') {
    return <ClockCountdown size={48} color={statusIconColor(theme, 'warning')} weight="duotone" />;
  }
  if (tone === 'error') {
    return <XCircle size={48} color={theme.colors.error} weight="duotone" />;
  }
  if (tone === 'success') {
    return <CheckCircle size={48} color={theme.colors.success} weight="fill" />;
  }
  return <Ticket size={48} color={statusIconColor(theme, tone)} weight="duotone" />;
}

function JourneyTimeline({
  leg,
  hasTrailingShuttle = false,
}: {
  leg: TicketLegViewModel;
  hasTrailingShuttle?: boolean;
}): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const boardingUsesRouteEndpoint = leg.boardingUsesRouteEndpoint === true;
  const alightingUsesRouteEndpoint = leg.alightingUsesRouteEndpoint === true;
  const usesRouteEndpoints = boardingUsesRouteEndpoint || alightingUsesRouteEndpoint;

  const originLabel = boardingUsesRouteEndpoint
    ? (leg.boardingTime
      ? t('booking.ticket.routeStartWithTime', { time: leg.boardingTime })
      : t('booking.ticket.routeStart'))
    : (leg.boardingTime
      ? t('booking.ticket.boardingWithTime', { time: leg.boardingTime })
      : t('booking.ticket.boarding'));

  const destinationLabel = alightingUsesRouteEndpoint
    ? (leg.alightingTime
      ? t('booking.ticket.routeEndWithTime', { time: leg.alightingTime })
      : t('booking.ticket.routeEnd'))
    : (leg.alightingTime
      ? t('booking.ticket.alightingWithTime', { time: leg.alightingTime })
      : t('booking.ticket.alighting'));

  return (
    <View
      style={[
        styles.timeline,
        hasTrailingShuttle ? styles.timelineWithTrailingShuttle : null,
      ]}
    >
      <View style={styles.timelineRow}>
        <View style={styles.timelineRail}>
          <View style={[styles.timelineDot, styles.timelineDotOrigin]} />
          <View style={styles.timelineConnector} />
        </View>
        <View style={styles.timelineCopy}>
          <Text style={styles.timelineLabel}>{originLabel}</Text>
          <Text style={styles.timelineName}>{leg.boardingName}</Text>
          {leg.boardingAddress ? (
            <Text style={styles.timelineMeta}>{leg.boardingAddress}</Text>
          ) : null}
          {leg.boardingDate ? (
            <Text style={styles.timelineDate}>{leg.boardingDate}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.timelineRow}>
        <View style={styles.timelineRail}>
          <View style={[styles.timelineDot, styles.timelineDotDestination]} />
        </View>
        <View style={styles.timelineCopy}>
          <Text style={styles.timelineLabel}>{destinationLabel}</Text>
          <Text style={styles.timelineName}>{leg.alightingName}</Text>
          {leg.alightingAddress ? (
            <Text style={styles.timelineMeta}>{leg.alightingAddress}</Text>
          ) : null}
          {leg.alightingDate ? (
            <Text style={styles.timelineDate}>{leg.alightingDate}</Text>
          ) : null}
        </View>
      </View>
      {usesRouteEndpoints ? (
        <View style={styles.timelineHintRow}>
          <PathIcon size={14} color={theme.colors.textTertiary} weight="bold" />
          <Text style={styles.timelineHint}>{t('booking.ticket.routeEndpointsHint')}</Text>
        </View>
      ) : null}
    </View>
  );
}

function TicketView({
  model,
  source,
  onBack,
  onViewBookings,
  onHome,
  onTrack,
  pendingPaymentActions,
  cancellationActions,
  reminderDepartureDateTime,
}: TicketViewProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const { isCompact } = useResponsiveLayout();
  const pages = useMemo(() => buildTicketPages(model), [model]);
  const [requestedTicketKey, setRequestedTicketKey] = useState<string | null>(
    pages[0]?.key ?? null,
  );
  useEffect(() => {
    setRequestedTicketKey((current) => (
      current && pages.some((page) => page.key === current)
        ? current
        : pages[0]?.key ?? null
    ));
  }, [pages]);
  const activePage = useMemo(
    () => pages.find((page) => page.key === requestedTicketKey) ?? pages[0],
    [pages, requestedTicketKey],
  );
  const handleSelectTicket = useCallback((key: string) => {
    setRequestedTicketKey((current) => (current === key ? current : key));
  }, []);
  const activeLeg = activePage?.leg;
  const activeTicket = activePage?.ticket;
  const hasLegacyShuttleRequest = Boolean(
    activeLeg?.shuttlePickupAddress || activeLeg?.shuttleDropoffAddress,
  );
  const hasShuttleDetails = Boolean(
    activeLeg?.shuttleRequests?.length || hasLegacyShuttleRequest,
  );
  const canTrackActiveLeg = Boolean(activeLeg?.tripId) && activeLeg?.trackingEnabled === true;
  const statusPresentation = useMemo(
    () => getTicketStatusPresentation(model.bookingStatus),
    [model.bookingStatus],
  );
  const showBoardingQr = Boolean(
    activeTicket
    && canShowBoardingQr(activeTicket.status, model.isPendingPayment),
  );
  const paymentIcon = model.paymentMethod
    ? model.paymentMethod === 'WALLET'
      ? <Wallet size={12} color={theme.colors.primary} weight="bold" />
      : <VnPayLogo size="compact" />
    : null;
  const amountLabel = activeTicket?.paidAmount != null && pages.length > 1
    ? t('booking.ticket.ticketPaidAmount')
    : model.legs.length > 1
      ? t('booking.ticket.legAmount', { leg: activeLeg?.label ?? '' })
      : model.isPendingPayment
        ? t('booking.ticket.amountDue')
        : t('booking.ticket.totalAmount');
  const amountValue = activeTicket?.paidAmount != null && pages.length > 1
    ? activeTicket.paidAmount
    : activeLeg?.totalAmount ?? model.totalAmount;

  const handleShareTrip = useCallback(async () => {
    if (!activeLeg) return;

    const messageParts = [
      t('booking.ticket.shareHeading'),
      `${activeLeg.boardingName} → ${activeLeg.alightingName}`,
      activeLeg.boardingDate
        ? t('booking.ticket.shareDeparture', { date: activeLeg.boardingDate })
        : null,
      activeLeg.seatNumbers
        ? t('booking.ticket.shareSeats', { seats: activeLeg.seatNumbers })
        : null,
      t('booking.ticket.shareReference', { reference: activeLeg.reference }),
      t('booking.ticket.shareSecurityNote'),
    ].filter((part): part is string => Boolean(part));

    try {
      await Share.share(
        { message: messageParts.join('\n') },
        { dialogTitle: t('booking.ticket.shareTrip') },
      );
    } catch {
      showSnackbar({
        message: t('booking.ticket.shareFailed'),
        tone: 'error',
      });
    }
  }, [activeLeg, t]);

  const reminderAt = useMemo(() => {
    if (!reminderDepartureDateTime) return null;
    const departureMs = new Date(reminderDepartureDateTime).getTime();
    if (!Number.isFinite(departureMs)) return null;
    const timestamp = departureMs - 30 * 60 * 1000;
    return timestamp > Date.now() ? timestamp : null;
  }, [reminderDepartureDateTime]);
  const canScheduleTripReminder = Boolean(
    model.bookingStatus === 'CONFIRMED'
    && reminderAt !== null
    && activeLeg?.bookingId,
  );

  const handleScheduleTripReminder = useCallback(async () => {
    if (!canScheduleTripReminder || !activeLeg?.bookingId || reminderAt === null) return;

    try {
      let permission = await getNotificationPermissionState();
      if (permission === 'not_determined') {
        permission = await requestNotificationPermission();
      }

      if (permission !== 'authorized') {
        showSnackbar({
          message: t('booking.ticket.reminderPermissionDenied'),
          tone: 'warning',
          action: {
            label: t('booking.ticket.openNotificationSettings'),
            onPress: () => {
              openSystemNotificationSettings().catch(() => undefined);
            },
          },
          durationMs: 6000,
        });
        return;
      }

      await ensureNotificationChannels({
        updates: t('settings.notifications.updatesChannel'),
        reminders: t('settings.notifications.remindersChannel'),
      });
      await scheduleTripReminder({
        bookingId: activeLeg.bookingId,
        remindAt: reminderAt,
        title: t('booking.ticket.tripReminderTitle'),
        body: t('booking.ticket.tripReminderBody', {
          origin: activeLeg.boardingName,
          destination: activeLeg.alightingName,
        }),
      });
      showSnackbar({
        message: t('booking.ticket.tripReminderScheduled'),
        tone: 'success',
      });
    } catch {
      showSnackbar({
        message: t('booking.ticket.tripReminderFailed'),
        tone: 'error',
      });
    }
  }, [activeLeg, canScheduleTripReminder, reminderAt, t]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={source === 'history'
            ? t('common.back')
            : t('booking.ticket.backToDashboard')}
          style={({ pressed }) => [styles.navButton, pressed ? styles.pressed : null]}
          onPress={onBack}
        >
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.navTitleGroup}>
          <Text style={styles.navTitle} numberOfLines={1}>
            {model.title}
          </Text>
          {activeLeg ? (
            <Text
              selectable
              ellipsizeMode="middle"
              numberOfLines={1}
              style={styles.navReference}
            >
              {model.legs.length > 1
                ? t('booking.ticket.legBookingReference', {
                    leg: activeLeg.label,
                  })
                : t('booking.ticket.bookingReference')}
              {' · '}
              {activeLeg.reference}
            </Text>
          ) : null}
        </View>
        <View style={styles.navSpacer} />
      </View>

      {pages.length > 1 && activePage ? (
        <View style={styles.ticketSelectorHeader}>
          <TicketSelector
            pages={pages}
            selectedKey={activePage.key}
            onSelect={handleSelectTicket}
          />
        </View>
      ) : null}

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {model.isDemo ? (
          <View style={styles.demoBanner}>
            <Flask size={16} color={theme.colors.warningForeground} />
            <Text style={styles.demoBannerText}>{t('booking.ticket.demoDetail')}</Text>
          </View>
        ) : null}

        <View style={styles.statusHeader}>
          <StatusHeaderIcon
            isPendingPayment={model.isPendingPayment}
            isChecking={pendingPaymentActions?.isChecking}
            tone={statusPresentation.tone}
          />
          <StatusChip
            label={model.statusTitle}
            tone={statusPresentation.tone}
            style={styles.statusChip}
          />
          <Text style={styles.statusSubtitle}>{model.statusMessage}</Text>
          {model.createdAtLabel ? (
            <Text style={styles.createdAtLabel}>
              {t('history.createdOn', { date: model.createdAtLabel })}
            </Text>
          ) : null}
        </View>

        {model.isPendingPayment && pendingPaymentActions ? (
          <View style={styles.pendingPaymentCard}>
            <Text style={styles.pendingPaymentTitle}>{t('booking.ticket.vnpayConfirmationTitle')}</Text>
            <Text style={styles.pendingPaymentMessage}>
              {t('booking.ticket.vnpayConfirmationDescription')}
            </Text>
            {pendingPaymentActions.errorMessage ? (
              <Text style={styles.pendingPaymentError}>{pendingPaymentActions.errorMessage}</Text>
            ) : null}
            {pendingPaymentActions.onOpenPayment ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('booking.ticket.openVnpayAccessibility')}
                style={({ pressed }) => [
                  styles.primaryAction,
                  pressed ? styles.pressed : null,
                ]}
                onPress={pendingPaymentActions.onOpenPayment}
              >
                <VnPayLogo size="compact" />
                <Text style={styles.primaryActionText}>{t('booking.ticket.openVnpay')}</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('booking.ticket.checkPaymentAccessibility')}
              accessibilityState={{
                busy: pendingPaymentActions.isChecking,
                disabled: pendingPaymentActions.isChecking || !pendingPaymentActions.isOnline,
              }}
              disabled={pendingPaymentActions.isChecking || !pendingPaymentActions.isOnline}
              style={({ pressed }) => [
                styles.secondaryAction,
                pendingPaymentActions.isChecking || !pendingPaymentActions.isOnline
                  ? styles.actionDisabled
                  : null,
                pressed ? styles.pressed : null,
              ]}
              onPress={pendingPaymentActions.onCheck}
            >
              {pendingPaymentActions.isChecking ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : null}
              <Text style={styles.secondaryActionText}>
                {pendingPaymentActions.isChecking
                  ? t('booking.ticket.checkingPayment')
                  : t('booking.ticket.checkPayment')}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {activePage && activeLeg ? (
          <View style={styles.legBlock}>
            <View style={styles.ticketCard}>
              <View style={styles.detailsSection}>
                <View style={styles.ticketCardHeader}>
                  <View style={styles.ticketCardHeaderLeft}>
                    <View style={styles.ticketCardBadge}>
                      <Ticket size={13} color={theme.colors.primary} weight="bold" />
                      <Text style={styles.ticketCardBadgeText}>
                        {activeLeg.label || t('booking.ticket.detailTitle')}
                      </Text>
                    </View>
                    {activeLeg.reference ? (
                      <Text style={styles.ticketCardRefText} selectable>
                        #{activeLeg.reference}
                      </Text>
                    ) : null}
                  </View>

                  {!model.isPendingPayment ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('booking.ticket.shareTripAccessibility')}
                      accessibilityHint={t('booking.ticket.shareTrip')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={({ pressed }) => [
                        styles.ticketCardShareIconButton,
                        pressed ? styles.ticketCardShareIconButtonPressed : null,
                      ]}
                      onPress={() => {
                        handleShareTrip().catch(() => undefined);
                      }}
                    >
                      <ShareNetwork size={18} color={theme.colors.primary} weight="bold" />
                    </Pressable>
                  ) : null}
                </View>

                {!model.isPendingPayment && activeTicket ? (
                  showBoardingQr ? (
                    <View style={styles.codeList}>
                      <Text style={styles.codeListTitle}>
                        {t('booking.ticket.boardingQrCode')}
                      </Text>
                      <ScannableCodeCard
                        code={activeTicket.ticketCode}
                        title={t('history.ticketSeat', {
                          seat: activeTicket.seatNumber,
                        })}
                        description={activeTicket.status
                          ? t(getTicketLifecyclePresentation(activeTicket.status).labelKey)
                          : t('history.ticketScanHint')}
                      />
                    </View>
                  ) : (
                    <View style={styles.codeReferenceCard}>
                      <Text style={styles.codeListTitle}>
                        {t('booking.ticket.ticketCode')}
                      </Text>
                      <Text style={styles.codeReferenceValue} selectable>
                        {activeTicket.ticketCode}
                      </Text>
                      <Text style={styles.codeReferenceHint}>
                        {activeTicket.status
                          ? t(getTicketLifecyclePresentation(activeTicket.status).labelKey)
                          : t('booking.ticket.ticketCodeInactiveHint')}
                      </Text>
                    </View>
                  )
                ) : null}

                {activeLeg.ticketReferences && !activeTicket ? (
                  <Text style={styles.ticketReferencesText}>
                    {t('booking.ticket.references', {
                      count: activeLeg.ticketCount,
                      references: activeLeg.ticketReferences,
                    })}
                  </Text>
                ) : null}

                {activeLeg.routeName ? (
                  <Text style={styles.routeNameCaption} numberOfLines={2}>
                    {activeLeg.routeName}
                  </Text>
                ) : null}

                {activeLeg.boardingDate ? (
                  <View style={styles.travelDateRow}>
                    <CalendarBlank size={17} color={theme.colors.primary} weight="duotone" />
                    <Text style={styles.travelDateText}>
                      {activeLeg.isOvernight && activeLeg.alightingDate
                        ? t('booking.ticket.overnightDates', {
                            departure: activeLeg.boardingDate,
                            arrival: activeLeg.alightingDate,
                          })
                        : t('booking.ticket.travelDate', { date: activeLeg.boardingDate })}
                    </Text>
                  </View>
                ) : null}

                <JourneyTimeline
                  leg={activeLeg}
                  hasTrailingShuttle={hasShuttleDetails}
                />

                {hasShuttleDetails ? (
                  <View style={styles.shuttleDetailsGroup}>
                    {activeLeg.shuttleRequests?.length ? (
                      <ShuttleHistorySummary requests={activeLeg.shuttleRequests} />
                    ) : null}

                    {hasLegacyShuttleRequest ? (
                      <View style={styles.shuttleRequestCard}>
                        <Van size={20} color={theme.colors.primary} weight="duotone" />
                        <View style={styles.shuttleRequestCopy}>
                          <Text style={styles.shuttleRequestTitle}>
                            {t('booking.ticket.shuttleSent')}
                          </Text>
                          {activeLeg.shuttlePickupAddress ? (
                            <View style={styles.shuttleRequestItem}>
                              <Text style={styles.shuttleRequestLabel}>
                                {t('bookingHistory.shuttle.inbound')}
                              </Text>
                              <Text style={styles.shuttleRequestAddress}>
                                {activeLeg.shuttlePickupAddress}
                              </Text>
                            </View>
                          ) : null}
                          {activeLeg.shuttleDropoffAddress ? (
                            <View style={styles.shuttleRequestItem}>
                              <Text style={styles.shuttleRequestLabel}>
                                {t('bookingHistory.shuttle.outbound')}
                              </Text>
                              <Text style={styles.shuttleRequestAddress}>
                                {activeLeg.shuttleDropoffAddress}
                              </Text>
                            </View>
                          ) : null}
                          <Text style={styles.shuttleRequestHint}>
                            {t('booking.ticket.shuttleAwaiting')}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.specsGrid}>
                  {activeLeg.busType ? (
                    <View style={styles.gridItem}>
                      <Text style={styles.specLabel}>{t('booking.ticket.busType')}</Text>
                      <Text style={styles.specValue}>
                        {activeLeg.busType.toLowerCase().includes('sleeper')
                          ? t('booking.busType.sleeper')
                          : activeLeg.busType.toLowerCase().includes('limousine')
                            ? t('booking.busType.limousine')
                            : activeLeg.busType}
                      </Text>
                    </View>
                  ) : null}
                  {activeLeg.licensePlate ? (
                    <View style={styles.gridItem}>
                      <Text style={styles.specLabel}>{t('booking.ticket.licensePlate')}</Text>
                      <Text style={styles.specValue} selectable>
                        {activeLeg.licensePlate}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.gridItem}>
                    <Text style={styles.specLabel}>{t('booking.ticket.seats')}</Text>
                    <Text style={styles.specValue}>
                      {activeTicket?.seatNumber ?? activeLeg.seatNumbers}
                    </Text>
                  </View>
                  {model.paymentMethod ? (
                    <View style={styles.gridItem}>
                      <Text style={styles.specLabel}>{t('booking.ticket.paymentMethod')}</Text>
                      <View style={styles.paymentMethodLabel}>
                        {paymentIcon}
                        <Text style={styles.specValue}>
                          {model.paymentMethod === 'WALLET'
                            ? t('booking.paymentScreen.walletLabel')
                            : 'VNPAY'}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>

                <View style={[
                  styles.totalRow,
                  isCompact ? styles.summaryRowCompact : null,
                ]}>
                  <Text style={styles.totalLabel}>{amountLabel}</Text>
                  <Text style={styles.totalValue}>
                    {formatVnd(amountValue, { display: 'code', clampNegative: true })}
                  </Text>
                </View>
              </View>
            </View>

            {canTrackActiveLeg ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('booking.ticket.trackLeg', { leg: activeLeg.label })}
                style={({ pressed }) => [styles.primaryAction, pressed ? styles.pressed : null]}
                onPress={() => onTrack(activeLeg)}
              >
                <MapPin size={18} color={theme.colors.textInverse} weight="bold" />
                <Text style={styles.primaryActionText}>
                  {t('booking.ticket.trackLeg', { leg: activeLeg.label })}
                </Text>
              </Pressable>
            ) : null}

            {canScheduleTripReminder ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('booking.ticket.tripReminderAccessibility')}
                style={({ pressed }) => [
                  styles.secondaryAction,
                  pressed ? styles.pressed : null,
                ]}
                onPress={() => {
                  handleScheduleTripReminder().catch(() => undefined);
                }}
              >
                <BellRinging size={18} color={theme.colors.primary} weight="bold" />
                <Text style={styles.secondaryActionText}>
                  {t('booking.ticket.remindThirtyMinutes')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {model.legs.length > 1 ? (
          <View style={[
            styles.roundTripTotalCard,
            isCompact ? styles.summaryRowCompact : null,
          ]}>
            <Text style={styles.totalLabel}>
              {model.isPendingPayment
                ? t('booking.ticket.grandTotalDue')
                : t('booking.ticket.roundTripTotal')}
            </Text>
            <Text style={styles.totalValue}>
              {formatVnd(model.totalAmount, { display: 'code', clampNegative: true })}
            </Text>
          </View>
        ) : null}

        {cancellationActions ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('booking.ticket.cancelBookingAccessibility')}
            accessibilityState={{
              busy: cancellationActions.isCancelling,
              disabled: cancellationActions.isCancelling,
            }}
            disabled={cancellationActions.isCancelling}
            style={({ pressed }) => [
              styles.cancellationAction,
              cancellationActions.isCancelling ? styles.actionDisabled : null,
              pressed ? styles.pressed : null,
            ]}
            onPress={cancellationActions.onCancel}
          >
            {cancellationActions.isCancelling ? (
              <ActivityIndicator size="small" color={theme.colors.error} />
            ) : (
              <XCircle size={18} color={theme.colors.error} weight="bold" />
            )}
            <Text style={styles.cancellationActionText}>
              {cancellationActions.isCancelling
                ? t('booking.ticket.cancellingBooking')
                : t('booking.ticket.cancelBooking')}
            </Text>
          </Pressable>
        ) : null}

        {source === 'checkout' ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('booking.ticket.viewBookings')}
              style={({ pressed }) => [styles.primaryAction, pressed ? styles.pressed : null]}
              onPress={onViewBookings}
            >
              <File size={18} color={theme.colors.textInverse} weight="bold" />
              <Text style={styles.primaryActionText}>{t('booking.ticket.viewBookings')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('booking.ticket.backToDashboard')}
              style={({ pressed }) => [styles.homeButton, pressed ? styles.pressed : null]}
              onPress={onHome}
            >
              <Text style={styles.homeButtonText}>
                {t('booking.ticket.backToDashboard')}
              </Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

interface UnavailableTicketProps {
  title: string;
  message: string;
  isLoading?: boolean;
  onBack: () => void;
}

function UnavailableTicket({
  title,
  message,
  isLoading = false,
  onBack,
}: UnavailableTicketProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={({ pressed }) => [styles.navButton, pressed ? styles.pressed : null]}
          onPress={onBack}
        >
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.navTitle}>{t('booking.ticket.detailTitle')}</Text>
        <View style={styles.navSpacer} />
      </View>
      <View style={styles.unavailableContainer}>
        {isLoading
          ? <ActivityIndicator color={theme.colors.primary} />
          : <WarningCircle size={52} color={theme.colors.textTertiary} weight="duotone" />}
        <Text style={styles.unavailableTitle}>{title}</Text>
        <Text style={styles.unavailableMessage}>{message}</Text>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.homeButton, styles.unavailableButton, pressed ? styles.pressed : null]}
          onPress={onBack}
        >
          <Text style={styles.homeButtonText}>{t('common.back')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function CheckoutTicketContent(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<DigitalTicketNavigation>();
  const userId = useAuthStore(state => state.user?.id);
  const paymentOpenCoordinator = useMemo(
    () => new VnPayPaymentOpenCoordinator(),
    [],
  );
  const {
    selectedTrip,
    paymentMethod,
    bookingPaymentMethod,
    selectedPickUp,
    selectedDropOff,
    selectedShuttlePickup,
    selectedShuttleDropoff,
    outboundState,
    returnState,
    bookingResult,
  } = useBookingStore(useShallow((state) => ({
    selectedTrip: state.selectedTrip,
    paymentMethod: state.paymentMethod,
    bookingPaymentMethod: state.bookingPaymentMethod,
    selectedPickUp: state.selectedPickUp,
    selectedDropOff: state.selectedDropOff,
    selectedShuttlePickup: state.selectedShuttlePickup,
    selectedShuttleDropoff: state.selectedShuttleDropoff,
    outboundState: state.outboundState,
    returnState: state.returnState,
    bookingResult: state.bookingResult,
  })));
  const paymentReconciliation = useBookingPaymentReconciliation(bookingResult);
  const queryClient = useQueryClient();
  const markCheckoutBookingConfirmed = useBookingStore(
    state => state.markCheckoutBookingConfirmed,
  );
  const checkPaymentStatus = paymentReconciliation.checkNow;

  useEffect(() => {
    if (paymentReconciliation.phase !== 'confirmed') return;
    markCheckoutBookingConfirmed();
    if (userId) {
      queryClient.invalidateQueries({
        queryKey: bookingHistoryKeys.user(userId),
      }).catch(() => undefined);
    }
  }, [
    markCheckoutBookingConfirmed,
    paymentReconciliation.phase,
    queryClient,
    userId,
  ]);

  const statusReconciledBookingResult = useMemo<BookingResult | RoundTripResult | null>(() => {
    if (
      paymentReconciliation.phase !== 'confirmed'
      || bookingResult?.status !== 'PENDING_PAYMENT'
    ) {
      return bookingResult;
    }

    return { ...bookingResult, status: 'CONFIRMED' };
  }, [bookingResult, paymentReconciliation.phase]);
  const effectiveBookingResult = useMemo(
    () => hydrateCheckoutBookingResultFromHistory(
      statusReconciledBookingResult,
      paymentReconciliation.freshHistoryItems,
    ),
    [paymentReconciliation.freshHistoryItems, statusReconciledBookingResult],
  );

  const model = useMemo(
    () => buildCheckoutTicketViewModel(
      {
        bookingResult: effectiveBookingResult,
        paymentMethod: bookingPaymentMethod ?? paymentMethod,
        selectedTrip: outboundState?.trip ?? selectedTrip,
        selectedPickUp: outboundState?.pickUp ?? selectedPickUp,
        selectedDropOff: outboundState?.dropOff ?? selectedDropOff,
        selectedShuttlePickup: outboundState?.shuttlePickup ?? selectedShuttlePickup,
        selectedShuttleDropoff: outboundState?.shuttleDropoff ?? selectedShuttleDropoff,
        outboundState,
        returnState,
      },
      t,
    ),
    [
      effectiveBookingResult,
      bookingPaymentMethod,
      outboundState,
      paymentMethod,
      returnState,
      selectedDropOff,
      selectedShuttlePickup,
      selectedShuttleDropoff,
      selectedPickUp,
      selectedTrip,
      t,
    ],
  );

  const handleHome = useCallback(
    () => navigation.navigate('Main', { screen: 'Home' }),
    [navigation],
  );
  const handleViewBookings = useCallback(
    () => navigation.navigate('Main', {
      screen: 'BookingHistory',
      params: { initialTab: 'ticket' },
    }),
    [navigation],
  );
  const handleTrack = useCallback((leg: TicketLegViewModel) => {
    if (!leg.tripId || !leg.trackingEnabled) return;
    navigation.navigate('Tracking', {
      source: 'trip',
      tripId: leg.tripId,
      bookingId: leg.bookingId,
      ...(leg.trackingTarget ? { trackingTarget: leg.trackingTarget } : {}),
      tripStatus: leg.tripStatus,
    });
  }, [navigation]);

  const handleCheckPayment = useCallback(() => {
    checkPaymentStatus().catch(() => undefined);
  }, [checkPaymentStatus]);

  const handleOpenPayment = useCallback(() => {
    if (!userId || !bookingResult || paymentOpenCoordinator.isRunning) return;
    if (!bookingResult.paymentRedirectUrl || !bookingResult.vnpaySdk) return;

    const businessId =
      'bookingId' in bookingResult
        ? bookingResult.bookingId
        : bookingResult.outbound.bookingId;

    paymentOpenCoordinator
      .open({
        result: bookingResult,
        kind: 'booking',
        businessId,
        ownerUserId: userId,
      })
      .catch(() => {
        Alert.alert(
          t('booking.paymentRedirect.errorTitle'),
          t('booking.paymentRedirect.errorDescription'),
        );
      });
  }, [bookingResult, paymentOpenCoordinator, t, userId]);

  const canOpenPayment = Boolean(
    bookingResult?.paymentRedirectUrl && bookingResult?.vnpaySdk,
  );

  const pendingPaymentActions = useMemo<PendingPaymentActions | undefined>(() => {
    if (!model?.isPendingPayment) return undefined;

    return {
      isChecking: paymentReconciliation.isChecking,
      isOnline: paymentReconciliation.isOnline,
      errorMessage: paymentReconciliation.errorMessage,
      onCheck: handleCheckPayment,
      onOpenPayment: canOpenPayment ? handleOpenPayment : undefined,
    };
  }, [
    canOpenPayment,
    handleCheckPayment,
    handleOpenPayment,
    model?.isPendingPayment,
    paymentReconciliation.errorMessage,
    paymentReconciliation.isChecking,
    paymentReconciliation.isOnline,
  ]);

  if (paymentReconciliation.phase === 'expired') {
    return (
      <UnavailableTicket
        title={t('booking.ticket.paymentNotCompleted')}
        message={t('booking.ticket.paymentExpiredDescription')}
        onBack={handleHome}
      />
    );
  }

  if (paymentReconciliation.phase === 'inactive') {
    const statusPresentation = getTicketStatusPresentation(
      paymentReconciliation.terminalStatus,
    );
    return (
      <UnavailableTicket
        title={t('booking.ticket.statusChanged')}
        message={t('booking.ticket.inactiveDescription', {
          status: t(statusPresentation.labelKey),
        })}
        onBack={handleHome}
      />
    );
  }

  if (paymentReconciliation.phase === 'unavailable') {
    return (
      <UnavailableTicket
        title={t('booking.ticket.statusUnavailable')}
        message={paymentReconciliation.errorMessage
          ?? t('booking.ticket.statusUnavailableDescription')}
        onBack={handleHome}
      />
    );
  }

  if (!model) {
    return (
      <UnavailableTicket
        title={t('booking.ticket.detailsUnavailable')}
        message={t('booking.ticket.detailsUnavailableDescription')}
        onBack={handleHome}
      />
    );
  }

  return (
    <TicketView
      model={model}
      source="checkout"
      onBack={handleHome}
      onViewBookings={handleViewBookings}
      onHome={handleHome}
      onTrack={handleTrack}
      pendingPaymentActions={pendingPaymentActions}
    />
  );
}

function HistoryTicketContent({
  bookingId,
  historyItem,
}: {
  bookingId: string;
  historyItem?: PassengerTicketHistoryItem;
}): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<DigitalTicketNavigation>();
  const cancelMutation = useCancelBooking();
  const liveHistoryItem = useBookingHistoryTicketSnapshot(bookingId, historyItem);
  const paymentReconciliation = usePendingHistoryBookingReconciliation(
    bookingId,
    liveHistoryItem?.status === 'PENDING_PAYMENT',
  );
  const effectiveHistoryItem = useMemo(() => {
    if (!liveHistoryItem) return undefined;

    const reconciledItem = reconcilePassengerHistoryBookingStatus(
      liveHistoryItem,
      paymentReconciliation.statuses[0],
    );
    if (cancelMutation.data?.bookingId !== bookingId) {
      return reconciledItem;
    }
    return { ...reconciledItem, status: cancelMutation.data.status };
  }, [
    bookingId,
    cancelMutation.data,
    liveHistoryItem,
    paymentReconciliation.statuses,
  ]);
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const model = useMemo<TicketViewModel | null>(() => {
    if (effectiveHistoryItem?.id === bookingId) {
      return buildPassengerHistoryTicketViewModel(effectiveHistoryItem, t);
    }
    return null;
  }, [bookingId, effectiveHistoryItem, t]);

  const handleTrack = useCallback((leg: TicketLegViewModel) => {
    if (!leg.tripId || !leg.trackingEnabled) return;
    navigation.navigate('Tracking', {
      source: 'trip',
      tripId: leg.tripId,
      bookingId: leg.bookingId,
      ...(leg.trackingTarget ? { trackingTarget: leg.trackingTarget } : {}),
      tripStatus: leg.tripStatus,
    });
  }, [navigation]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const liveTripQuery = useTripDetail(effectiveHistoryItem?.tripId, {
    enabled: Boolean(
      effectiveHistoryItem && canCancelBooking({
        bookingStatus: effectiveHistoryItem.status,
        departureDateTime: effectiveHistoryItem.departureDateTime,
        nowMs,
      }),
    ),
    staleTimeMs: 15_000,
    getRefetchInterval: (trip) => (
      trip?.status === 'SCHEDULED' || trip?.status === 'BOARDING'
        ? 15_000
        : false
    ),
  });
  const liveTripStatus = liveTripQuery.data?.status ?? model?.legs[0]?.tripStatus;
  const departureDateTime = liveTripQuery.data?.departureDateTime
    ?? effectiveHistoryItem?.departureDateTime;
  const cancelEligibility = useMemo(() => ({
    bookingStatus: effectiveHistoryItem?.status ?? '',
    tripStatus: liveTripStatus,
    departureDateTime,
    nowMs,
  }), [
    departureDateTime,
    effectiveHistoryItem?.status,
    liveTripStatus,
    nowMs,
  ]);
  const waitingForLiveTripStatus = Boolean(
    effectiveHistoryItem
    && canCancelBooking({
      bookingStatus: effectiveHistoryItem.status,
      departureDateTime,
      nowMs,
    })
    && liveTripQuery.isPending
    && !liveTripStatus,
  );
  const cancellationAvailable = Boolean(
    effectiveHistoryItem
    && !waitingForLiveTripStatus
    && canCancelBooking(cancelEligibility),
  );

  useEffect(() => {
    const departureMs = parseDepartureMs(departureDateTime);
    if (departureMs === null || departureMs <= nowMs) {
      return undefined;
    }

    const waitMs = Math.min(departureMs - Date.now(), 2_147_483_647);
    const timeoutId = setTimeout(() => {
      setNowMs(Date.now());
    }, waitMs);
    return () => clearTimeout(timeoutId);
  }, [departureDateTime, nowMs]);

  const handleConfirmCancel = useCallback(async () => {
    if (
      !effectiveHistoryItem
      || !canCancelBooking(cancelEligibility)
      || cancelMutation.isPending
    ) {
      return;
    }

    try {
      const result = await cancelMutation.mutateAsync({
        bookingId: effectiveHistoryItem.id,
      });
      await cancelTripReminder(effectiveHistoryItem.id).catch(() => undefined);
      Alert.alert(
        t('booking.ticket.cancelSuccessTitle'),
        result.refundAmount > 0
          ? t('booking.ticket.cancelSuccessWithRefund', {
            amount: formatVnd(result.refundAmount, {
              display: 'code',
              clampNegative: true,
            }),
          })
          : t('booking.ticket.cancelSuccessNoRefund'),
        [{ text: t('common.ok') }],
      );
    } catch (error) {
      Alert.alert(
        t('booking.ticket.cancelErrorTitle'),
        getLocalizedApiErrorMessage(
          error,
          t,
          CANCEL_BOOKING_ERROR_TRANSLATION_KEYS,
        ),
        [{ text: t('common.ok') }],
      );
    }
  }, [cancelEligibility, cancelMutation, effectiveHistoryItem, t]);
  const handleCancel = useCallback(() => {
    if (
      !effectiveHistoryItem
      || !canCancelBooking(cancelEligibility)
      || cancelMutation.isPending
    ) {
      return;
    }

    const confirmationParts = [
      t('booking.ticket.cancelConfirmationDescription', {
        count: effectiveHistoryItem.ticket.tickets.length,
      }),
      t('booking.ticket.cancelRefundNotice'),
    ];
    if (effectiveHistoryItem.ticket.bookingGroupId) {
      confirmationParts.push(t('booking.ticket.cancelRoundTripNote'));
    }

    Alert.alert(
      t('booking.ticket.cancelConfirmationTitle'),
      confirmationParts.join('\n\n'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('booking.ticket.confirmCancellation'),
          style: 'destructive',
          onPress: () => {
            handleConfirmCancel().catch(() => undefined);
          },
        },
      ],
    );
  }, [
    cancelEligibility,
    cancelMutation.isPending,
    effectiveHistoryItem,
    handleConfirmCancel,
    t,
  ]);
  const cancellationActions = useMemo<CancellationActions | undefined>(
    () => cancellationAvailable
      ? {
        isCancelling: cancelMutation.isPending,
        onCancel: handleCancel,
      }
      : undefined,
    [cancelMutation.isPending, cancellationAvailable, handleCancel],
  );


  if (!model) {
    return (
      <UnavailableTicket
        title={t('booking.ticket.unavailable')}
        message={t('booking.ticket.unavailableDescription')}
        onBack={handleBack}
      />
    );
  }

  return (
    <TicketView
      model={model}
      source="history"
      onBack={handleBack}
      onViewBookings={handleBack}
      onHome={handleBack}
      onTrack={handleTrack}
      cancellationActions={cancellationActions}
      reminderDepartureDateTime={
        effectiveHistoryItem?.ticket.pickupPoint?.plannedAt
        ?? effectiveHistoryItem?.departureDateTime
        ?? undefined
      }
    />
  );
}

export function DigitalTicketScreen(): React.JSX.Element {
  const route = useRoute<DigitalTicketRoute>();
  return route.params.source === 'history'
    ? (
      <HistoryTicketContent
        bookingId={route.params.bookingId}
        historyItem={route.params.historyItem}
      />
    )
    : <CheckoutTicketContent />;
}

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  navbar: {
    minHeight: 56,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.contentBorder,
    backgroundColor: theme.effects.contentSurface,
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: BR.full,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.effects.contentSurfaceSoft,
  },
  navTitleGroup: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center' as const,
  },
  navSpacer: { width: 44 },
  pressed: { opacity: 0.8 },
  navTitle: {
    maxWidth: '100%' as const,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    textAlign: 'center' as const,
  },
  navReference: {
    maxWidth: '100%' as const,
    marginTop: 2,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
  demoBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: BR.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.warningLight,
  },
  demoBannerText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.warningForeground,
  },
  statusHeader: {
    alignItems: 'center' as const,
    gap: spacing.sm,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  statusChip: {
    marginTop: spacing.xs,
    // StatusChip defaults to alignSelf:flex-start; force center under the header icon.
    alignSelf: 'center' as const,
  },
  statusSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  createdAtLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    textAlign: 'center' as const,
  },
  routeNameCaption: {
    marginBottom: spacing.md,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    textAlign: 'center' as const,
  },
  codeReferenceCard: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: BR.lg,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.effects.contentSurfaceSoft,
    alignItems: 'center' as const,
  },
  codeReferenceValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  codeReferenceHint: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  timeline: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  timelineWithTrailingShuttle: {
    marginBottom: 0,
  },
  timelineRow: {
    flexDirection: 'row' as const,
    alignItems: 'stretch' as const,
    gap: spacing.md,
  },
  timelineRail: {
    width: 18,
    alignItems: 'center' as const,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineDotOrigin: {
    backgroundColor: theme.colors[TICKET_JOURNEY_COLOR_TOKENS.pickup],
  },
  timelineDotDestination: {
    backgroundColor: theme.colors[TICKET_JOURNEY_COLOR_TOKENS.dropoff],
    borderWidth: 2,
    borderColor: theme.colors[TICKET_JOURNEY_COLOR_TOKENS.dropoffHalo],
  },
  timelineConnector: {
    flex: 1,
    width: 2,
    marginVertical: 4,
    backgroundColor: theme.colors[TICKET_JOURNEY_COLOR_TOKENS.connector],
    minHeight: 28,
  },
  timelineCopy: {
    flex: 1,
    minWidth: 0,
    paddingBottom: spacing.sm,
  },
  timelineLabel: {
    marginBottom: 2,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  timelineName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  timelineMeta: {
    marginTop: 2,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  timelineDate: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  timelineHintRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing.xs,
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderRadius: BR.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.effects.contentSurfaceSoft,
  },
  timelineHint: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 16,
    color: theme.colors.textTertiary,
  },
  pendingPaymentCard: {
    ...theme.components.card,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: BR.lg,
    borderCurve: 'continuous' as const,
  },
  pendingPaymentTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  pendingPaymentMessage: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 21,
    color: theme.colors.textSecondary,
  },
  pendingPaymentError: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.error,
  },
  legBlock: {
    gap: spacing.sm,
  },
  ticketSelector: {
    gap: spacing.sm,
  },
  ticketSelectorHeader: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.contentBorder,
    backgroundColor: theme.effects.contentSurface,
  },
  ticketSelectorLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  ticketSelectorContent: {
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  ticketSelectorItem: {
    minWidth: 116,
    minHeight: 56,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: theme.effects.contentBorder,
    borderRadius: BR.lg,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.effects.contentSurfaceSoft,
  },
  ticketSelectorItemSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  ticketSelectorNumber: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  ticketSelectorNumberSelected: {
    color: theme.colors.textInverse,
  },
  ticketSelectorMeta: {
    marginTop: 2,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  ticketSelectorMetaSelected: {
    color: theme.colors.textInverse,
  },
  ticketCard: {
    ...theme.components.elevatedCard,
    overflow: 'visible' as const,
    marginBottom: spacing.md,
    borderRadius: BR.xl,
    borderCurve: 'continuous' as const,
  },
  ticketCardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
  },
  ticketCardHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  ticketCardBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: BR.sm,
    backgroundColor: theme.colors.primaryFaded,
  },
  ticketCardBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
    textTransform: 'uppercase' as const,
  },
  ticketCardRefText: {
    flexShrink: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  ticketCardShareIconButton: {
    width: 36,
    height: 36,
    borderRadius: BR.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.colors.primaryFaded,
  },
  ticketCardShareIconButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.92 }],
  },
  detailsSection: { padding: spacing.xl },
  shuttleDetailsGroup: {
    marginBottom: spacing.xl,
  },
  shuttleRequestCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderRadius: BR.lg,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.primaryFaded,
  },
  shuttleRequestCopy: {
    flex: 1,
    minWidth: 0,
  },
  shuttleRequestTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  shuttleRequestItem: {
    marginTop: spacing.sm,
    gap: 2,
  },
  shuttleRequestLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  shuttleRequestAddress: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.textPrimary,
  },
  ticketReferencesText: {
    marginBottom: spacing.lg,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.4,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  codeList: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  codeListTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    textAlign: 'center' as const,
  },
  shuttleRequestHint: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  routeRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  travelDateRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: BR.md,
    backgroundColor: theme.colors.primaryFaded,
  },
  travelDateText: {
    flex: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  routeItem: { flex: 1 },
  routeLabel: {
    marginBottom: 4,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  routeName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  routeCity: {
    marginTop: 2,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  routeDate: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  alignRight: { textAlign: 'right' as const },
  specsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    marginBottom: spacing.lg,
  },
  gridItem: {
    width: '50%' as const,
    marginBottom: spacing.md,
  },
  specLabel: {
    marginBottom: 4,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  specValue: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
  },
  paymentMethodLabel: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  totalRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  roundTripTotalCard: {
    ...theme.components.card,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: BR.lg,
    borderCurve: 'continuous' as const,
  },
  summaryRowCompact: {
    flexDirection: 'column' as const,
    alignItems: 'stretch' as const,
  },
  totalLabel: {
    minWidth: 0,
    flexShrink: 1,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  totalValue: {
    minWidth: 0,
    flexShrink: 1,
    textAlign: 'right' as const,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.primary,
  },
  primaryAction: {
    minHeight: 48,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    borderRadius: BR.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.primary,
  },
  primaryActionText: {
    flexShrink: 1,
    textAlign: 'center' as const,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textInverse,
  },
  cancellationAction: {
    ...theme.components.dangerButton,
    minHeight: 48,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  cancellationActionText: {
    flexShrink: 1,
    textAlign: 'center' as const,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.error,
  },
  secondaryAction: {
    minHeight: 48,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    borderRadius: BR.md,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
  },
  secondaryActionText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.primary,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  homeButton: {
    minHeight: 48,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: BR.md,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: theme.effects.contentBorder,
    backgroundColor: theme.effects.contentSurfaceSoft,
  },
  homeButtonText: {
    flexShrink: 1,
    textAlign: 'center' as const,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  unavailableContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
  },
  unavailableTitle: {
    marginTop: spacing.lg,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.textPrimary,
  },
  unavailableMessage: {
    maxWidth: 360,
    marginTop: spacing.sm,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 21,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  unavailableButton: {
    minWidth: 150,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
});
