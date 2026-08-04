import React, { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
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
  CheckCircle,
  Coins,
  File,
  Flask,
  MapPin,
  Ticket,
  Wallet,
  Van,
  WarningCircle,
} from 'phosphor-react-native';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';

import type { BookingStackParamList, RootStackParamList } from '@app/navigation/types';
import type { PassengerTicketHistoryItem } from '@features/profile/types';
import { useTheme } from '@shared/contexts/ThemeContext';
import { ScannableCodeCard } from '@shared/components';
import { useThemedStyles } from '@shared/hooks';
import { MotionFade } from '@shared/motion';
import {
  borderRadius as BR,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { formatVnd } from '@shared/utils/format';
import {
  PaymentRedirectCoordinator,
} from '@shared/utils/paymentRedirect';
import { useBookingPaymentReconciliation } from '../hooks/useBookingPaymentReconciliation';
import { useBookingStore } from '../store/useBookingStore';
import type { BookingResult, RoundTripResult } from '../types';
import {
  buildCheckoutTicketViewModel,
  buildPassengerHistoryTicketViewModel,
  buildTicketPages,
  type TicketLegViewModel,
  type TicketPageViewModel,
  type TicketViewModel,
} from '../utils/ticketViewModel';
import {
  getTicketLifecyclePresentation,
  getTicketStatusPresentation,
} from '../utils/ticketPresentation';

type DigitalTicketRoute = RouteProp<BookingStackParamList, 'DigitalTicket'>;
type DigitalTicketNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<BookingStackParamList, 'DigitalTicket'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface TicketViewProps {
  model: TicketViewModel;
  source: 'checkout' | 'history';
  onBack: () => void;
  onViewBookings: () => void;
  onHome: () => void;
  onTrack: (leg: TicketLegViewModel) => void;
  pendingPaymentActions?: PendingPaymentActions;
}

interface PendingPaymentActions {
  isChecking: boolean;
  isOnline: boolean;
  errorMessage?: string;
  onCheck: () => void;
  onOpenPayment?: () => void;
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

function TicketView({
  model,
  source,
  onBack,
  onViewBookings,
  onHome,
  onTrack,
  pendingPaymentActions,
}: TicketViewProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const pages = useMemo(() => buildTicketPages(model), [model]);
  const [requestedTicketKey, setRequestedTicketKey] = useState<string | null>(
    pages[0]?.key ?? null,
  );
  const activePage = useMemo(
    () => pages.find((page) => page.key === requestedTicketKey) ?? pages[0],
    [pages, requestedTicketKey],
  );
  const handleSelectTicket = useCallback((key: string) => {
    setRequestedTicketKey(key);
  }, []);
  const activeLeg = activePage?.leg;
  const activeTicket = activePage?.ticket;
  const canTrackActiveLeg = Boolean(activeLeg?.tripId) && activeLeg?.trackingEnabled === true;
  const paymentIcon = model.paymentMethod
    ? model.paymentMethod === 'WALLET'
      ? <Wallet size={12} color={theme.colors.primary} weight="bold" />
      : <Coins size={12} color={theme.colors.primary} weight="bold" />
    : null;

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
        <Text style={styles.navTitle}>{model.title}</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {model.isDemo ? (
          <View style={styles.demoBanner}>
            <Flask size={16} color={theme.colors.warning} />
            <Text style={styles.demoBannerText}>{t('booking.ticket.demoDetail')}</Text>
          </View>
        ) : null}

        <View style={styles.successHeader}>
          {model.isPendingPayment && pendingPaymentActions?.isChecking ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : (
            <CheckCircle
              size={56}
              color={model.isPendingPayment ? theme.colors.primary : theme.colors.success}
              weight="fill"
            />
          )}
          <Text style={styles.successTitle}>{model.statusTitle}</Text>
          <Text style={styles.successSubtitle}>{model.statusMessage}</Text>
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
                <Coins size={18} color={theme.colors.textInverse} weight="bold" />
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

        {activePage ? (
          <TicketSelector
            pages={pages}
            selectedKey={activePage.key}
            onSelect={handleSelectTicket}
          />
        ) : null}

        {activePage && activeLeg ? (
            <MotionFade key={activePage.key} style={styles.legBlock}>
              <View style={styles.ticketCard}>
                <View style={styles.referenceSection}>
                  <View style={styles.referenceIconContainer}>
                    <Ticket size={64} color={theme.colors.primary} weight="duotone" />
                  </View>
                  <Text style={styles.referenceCaption}>
                    {model.legs.length > 1
                      ? t('booking.ticket.legBookingReference', { leg: activeLeg.label })
                      : t('booking.ticket.bookingReference')}
                  </Text>
                  <Text style={styles.ticketIdText}>{activeLeg.reference}</Text>
                  {activeLeg.ticketReferences && !activeTicket ? (
                    <Text style={styles.ticketReferencesText}>
                      {t('booking.ticket.references', {
                        count: activeLeg.ticketCount,
                        references: activeLeg.ticketReferences,
                      })}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.dashedDivider}>
                  <View style={styles.sideCutoutLeft} />
                  <View style={styles.sideCutoutRight} />
                </View>

                <View style={styles.detailsSection}>
                  {!model.isPendingPayment && activeTicket ? (
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
                        size={156}
                      />
                    </View>
                  ) : null}
                  {activeLeg.shuttlePickupAddress ? (
                    <View style={styles.shuttleRequestCard}>
                      <Van size={20} color={theme.colors.primary} weight="duotone" />
                      <View style={styles.shuttleRequestCopy}>
                        <Text style={styles.shuttleRequestTitle}>{t('booking.ticket.shuttleSent')}</Text>
                        <Text style={styles.shuttleRequestAddress}>{activeLeg.shuttlePickupAddress}</Text>
                        <Text style={styles.shuttleRequestHint}>{t('booking.ticket.shuttleAwaiting')}</Text>
                      </View>
                    </View>
                  ) : null}
                  <View style={styles.routeRow}>
                    <View style={styles.routeItem}>
                      <Text style={styles.routeLabel}>
                        {activeLeg.boardingTime
                          ? t('booking.ticket.boardingWithTime', { time: activeLeg.boardingTime })
                          : t('booking.ticket.boarding')}
                      </Text>
                      <Text style={styles.routeName}>{activeLeg.boardingName}</Text>
                      {activeLeg.boardingAddress ? (
                        <Text style={styles.routeCity}>{activeLeg.boardingAddress}</Text>
                      ) : null}
                    </View>
                    <View style={styles.routeItem}>
                      <Text style={[styles.routeLabel, styles.alignRight]}>
                        {activeLeg.alightingTime
                          ? t('booking.ticket.alightingWithTime', { time: activeLeg.alightingTime })
                          : t('booking.ticket.alighting')}
                      </Text>
                      <Text style={[styles.routeName, styles.alignRight]}>{activeLeg.alightingName}</Text>
                      {activeLeg.alightingAddress ? (
                        <Text style={[styles.routeCity, styles.alignRight]}>
                          {activeLeg.alightingAddress}
                        </Text>
                      ) : null}
                    </View>
                  </View>

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
                    <View style={styles.gridItem}>
                      <Text style={styles.specLabel}>{t('booking.ticket.seats')}</Text>
                      <Text style={styles.specValue}>
                        {activeTicket?.seatNumber ?? activeLeg.seatNumbers}
                      </Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.specLabel}>{t('booking.ticket.tickets')}</Text>
                      <Text style={styles.specValue}>
                        {pages.length > 1
                          ? t('booking.ticket.ticketPosition', {
                            current: activePage.index,
                            total: pages.length,
                          })
                          : activeLeg.ticketCount}
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

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>
                      {model.legs.length > 1
                        ? t('booking.ticket.legAmount', { leg: activeLeg.label })
                        : model.isPendingPayment
                          ? t('booking.ticket.amountDue')
                          : t('booking.ticket.totalAmount')}
                    </Text>
                    <Text style={styles.totalValue}>
                      {formatVnd(activeLeg.totalAmount, { display: 'code', clampNegative: true })}
                    </Text>
                  </View>
                </View>
              </View>

              {canTrackActiveLeg ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('booking.ticket.trackLeg', { leg: activeLeg.label })}
                  style={({ pressed }) => [styles.secondaryAction, pressed ? styles.pressed : null]}
                  onPress={() => onTrack(activeLeg)}
                >
                  <MapPin size={18} color={theme.colors.primary} weight="bold" />
                  <Text style={styles.secondaryActionText}>
                    {t('booking.ticket.trackLeg', { leg: activeLeg.label })}
                  </Text>
                </Pressable>
              ) : null}
            </MotionFade>
        ) : null}

        {model.legs.length > 1 ? (
          <View style={styles.roundTripTotalCard}>
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

        {source === 'checkout' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('booking.ticket.viewBookings')}
            style={({ pressed }) => [styles.primaryAction, pressed ? styles.pressed : null]}
            onPress={onViewBookings}
          >
            <File size={18} color={theme.colors.textInverse} weight="bold" />
            <Text style={styles.primaryActionText}>{t('booking.ticket.viewBookings')}</Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={source === 'history'
            ? t('common.back')
            : t('booking.ticket.backToDashboard')}
          style={({ pressed }) => [styles.homeButton, pressed ? styles.pressed : null]}
          onPress={source === 'history' ? onBack : onHome}
        >
          <Text style={styles.homeButtonText}>
            {source === 'history'
              ? t('common.back')
              : t('booking.ticket.backToDashboard')}
          </Text>
        </Pressable>
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
  const paymentRedirectCoordinator = useMemo(
    () => new PaymentRedirectCoordinator(),
    [],
  );
  const {
    selectedTrip,
    paymentMethod,
    bookingPaymentMethod,
    selectedPickUp,
    selectedDropOff,
    selectedShuttlePickup,
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
    outboundState: state.outboundState,
    returnState: state.returnState,
    bookingResult: state.bookingResult,
  })));
  const paymentReconciliation = useBookingPaymentReconciliation(bookingResult);
  const checkPaymentStatus = paymentReconciliation.checkNow;

  const effectiveBookingResult = useMemo<BookingResult | RoundTripResult | null>(() => {
    if (
      paymentReconciliation.phase !== 'confirmed'
      || bookingResult?.status !== 'PENDING_PAYMENT'
    ) {
      return bookingResult;
    }

    return { ...bookingResult, status: 'CONFIRMED' };
  }, [bookingResult, paymentReconciliation.phase]);

  const model = useMemo(
    () => buildCheckoutTicketViewModel(
      {
        bookingResult: effectiveBookingResult,
        paymentMethod: bookingPaymentMethod ?? paymentMethod,
        selectedTrip: outboundState?.trip ?? selectedTrip,
        selectedPickUp: outboundState?.pickUp ?? selectedPickUp,
        selectedDropOff: outboundState?.dropOff ?? selectedDropOff,
        selectedShuttlePickup: outboundState?.shuttlePickup ?? selectedShuttlePickup,
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
      stopId: leg.stopId,
      tripStatus: leg.tripStatus,
    });
  }, [navigation]);

  const handleCheckPayment = useCallback(() => {
    checkPaymentStatus().catch(() => undefined);
  }, [checkPaymentStatus]);

  const handleOpenPayment = useCallback(() => {
    const redirectUrl = bookingResult?.paymentRedirectUrl;
    if (!redirectUrl || paymentRedirectCoordinator.isRunning) return;

    paymentRedirectCoordinator.open(redirectUrl).catch(() => {
      Alert.alert(
        t('booking.paymentRedirect.errorTitle'),
        t('booking.paymentRedirect.errorDescription'),
      );
    });
  }, [bookingResult?.paymentRedirectUrl, paymentRedirectCoordinator, t]);

  const pendingPaymentActions = useMemo<PendingPaymentActions | undefined>(() => {
    if (!model?.isPendingPayment) return undefined;

    return {
      isChecking: paymentReconciliation.isChecking,
      isOnline: paymentReconciliation.isOnline,
      errorMessage: paymentReconciliation.errorMessage,
      onCheck: handleCheckPayment,
      onOpenPayment: bookingResult?.paymentRedirectUrl ? handleOpenPayment : undefined,
    };
  }, [
    bookingResult?.paymentRedirectUrl,
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
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const model = useMemo<TicketViewModel | null>(() => {
    if (historyItem?.id === bookingId) {
      return buildPassengerHistoryTicketViewModel(historyItem, t);
    }
    return null;
  }, [bookingId, historyItem, t]);

  const handleTrack = useCallback((leg: TicketLegViewModel) => {
    if (!leg.tripId || !leg.trackingEnabled) return;
    navigation.navigate('Tracking', {
      source: 'trip',
      tripId: leg.tripId,
      bookingId: leg.bookingId,
      stopId: leg.stopId,
      tripStatus: leg.tripStatus,
    });
  }, [navigation]);

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
  navSpacer: { width: 40 },
  pressed: { opacity: 0.8 },
  navTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
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
    color: theme.colors.warning,
  },
  successHeader: {
    alignItems: 'center' as const,
    marginVertical: spacing.md,
  },
  successTitle: {
    marginTop: spacing.md,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.textPrimary,
  },
  successSubtitle: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
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
  referenceSection: {
    alignItems: 'center' as const,
    padding: spacing.xl,
  },
  referenceIconContainer: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: BR.lg,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.effects.contentSurfaceSoft,
  },
  referenceCaption: {
    marginBottom: 4,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  ticketIdText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  dashedDivider: {
    height: 2,
    position: 'relative' as const,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderStyle: 'dashed' as const,
  },
  sideCutoutLeft: {
    position: 'absolute' as const,
    left: -10,
    top: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.background,
  },
  sideCutoutRight: {
    position: 'absolute' as const,
    right: -10,
    top: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.background,
  },
  detailsSection: { padding: spacing.xl },
  shuttleRequestCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
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
  shuttleRequestAddress: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.textPrimary,
  },
  ticketReferencesText: {
    marginTop: spacing.sm,
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
    justifyContent: 'space-between' as const,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  routeItem: { flex: 1 },
  routeLabel: {
    marginBottom: 4,
    fontFamily: fontFamilies.bold,
    fontSize: 9,
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
    fontSize: 9,
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
  totalLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  totalValue: {
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
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textInverse,
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
