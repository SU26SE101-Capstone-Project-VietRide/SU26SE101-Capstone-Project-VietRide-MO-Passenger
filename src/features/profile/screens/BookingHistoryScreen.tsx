import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import {
  useNavigation,
  useRoute,
  type CompositeNavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  CalendarBlank,
  Clock,
  CreditCard,
  NavigationArrow,
  Package,
  Ticket,
  User,
  WarningCircle,
} from 'phosphor-react-native';

import type {
  MainTabParamList,
  RootStackParamList,
} from '@app/navigation/types';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { getTicketStatusPresentation } from '@features/booking/utils/ticketPresentation';
import {
  getParcelSizePresentation,
  getParcelStatusPresentation,
} from '@features/parcel/utils/parcelPresentation';
import { getParcelPaymentStage } from '@features/parcel/utils/parcelPayment';
import { StatusChip } from '@shared/components';
import { useTheme } from '@shared/contexts/ThemeContext';
import {
  useIsAppActive,
  useTabBarScrollBehavior,
  useThemedStyles,
} from '@shared/hooks';
import {
  borderRadius as BR,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import {
  formatDate,
  formatTime,
  formatVnd,
} from '@shared/utils/format';
import {
  getPendingVnPaySession,
  reopenPendingVnPayPayment,
} from '@shared/payments';
import {
  PaymentReturnGate,
} from '@shared/utils/paymentRedirect';
import { PASSENGER_HISTORY_DEFAULT_PAGE_SIZE } from '../api/passengerHistoryApi';
import { usePassengerHistory } from '../hooks/usePassengerHistory';
import type {
  PassengerParcelHistoryItem,
  PassengerTicketHistoryItem,
} from '../types';

type HistoryTab = 'ticket' | 'parcel';
type HistoryPaymentType = 'TICKET' | 'PARCEL';
type TicketFilter = 'ALL' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
type BookingHistoryRoute = RouteProp<MainTabParamList, 'BookingHistory'>;
type BookingHistoryNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'BookingHistory'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const ticketKeyExtractor = (item: PassengerTicketHistoryItem): string => item.id;
const parcelKeyExtractor = (item: PassengerParcelHistoryItem): string => item.id;
const getPaymentItemKey = (type: HistoryPaymentType, id: string): string => `${type}:${id}`;

interface PendingPaymentReturn {
  itemKey: string;
  type: HistoryPaymentType;
  userId: string;
}

type ContinuePaymentHandler = (
  itemId: string,
  type: HistoryPaymentType,
  redirectUrl: string,
) => void;

const getRouteLabel = (
  originName: string | null,
  destinationName: string | null,
  unavailableLabel: string,
): string => {
  if (originName && destinationName) return `${originName} → ${destinationName}`;
  return originName ?? destinationName ?? unavailableLabel;
};

interface TicketFilterChipProps {
  label: string;
  selected: boolean;
  value: TicketFilter;
  onSelect: (value: TicketFilter) => void;
}

const TicketFilterChip = memo(function TicketFilterChipComponent({
  label,
  selected,
  value,
  onSelect,
}: TicketFilterChipProps): React.JSX.Element {
  const styles = useThemedStyles(createStyles);
  const handlePress = useCallback(() => onSelect(value), [onSelect, value]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={handlePress}
      style={[styles.filterTab, selected ? styles.activeFilterTab : null]}
    >
      <Text style={[styles.filterLabel, selected ? styles.activeFilterLabel : null]}>
        {label}
      </Text>
    </Pressable>
  );
});

interface TicketHistoryRowProps {
  item: PassengerTicketHistoryItem;
  onOpen: (item: PassengerTicketHistoryItem) => void;
  onTrack: (
    tripId: string,
    bookingId: string,
    trackingTarget: PassengerTicketHistoryItem['trackingTarget'],
  ) => void;
  onContinuePayment: ContinuePaymentHandler;
  isOpeningPayment: boolean;
}

const TicketHistoryRow = memo(function TicketHistoryRowComponent({
  item,
  onOpen,
  onTrack,
  onContinuePayment,
  isOpeningPayment,
}: TicketHistoryRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const statusPresentation = getTicketStatusPresentation(item.status);
  const canTrack = statusPresentation.trackingEnabled;
  const paymentRedirectUrl = statusPresentation.pendingPayment
    ? item.paymentRedirectUrl
    : null;
  const seatNumbers = useMemo(
    () => item.ticket.tickets.map((ticket) => ticket.seatNumber).join(', ')
      || t('common.notAvailable'),
    [item.ticket.tickets, t],
  );
  const handleOpen = useCallback(() => onOpen(item), [item, onOpen]);
  const handleTrack = useCallback(
    () => onTrack(item.tripId, item.id, item.trackingTarget),
    [item.id, item.trackingTarget, item.tripId, onTrack],
  );
  const handleContinuePayment = useCallback(() => {
    if (paymentRedirectUrl) onContinuePayment(item.id, item.type, paymentRedirectUrl);
  }, [item.id, item.type, onContinuePayment, paymentRedirectUrl]);
  const paymentAccessibilityState = useMemo(
    () => ({ busy: isOpeningPayment, disabled: isOpeningPayment }),
    [isOpeningPayment],
  );
  const bodyStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.ticketBody,
      pressed ? styles.pressedCard : null,
    ],
    [styles],
  );
  const trackStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.trackButton,
      pressed ? styles.pressedCard : null,
    ],
    [styles],
  );

  return (
    <View style={styles.ticketCard}>
      <Pressable
        style={bodyStyle}
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityLabel={t('bookingHistory.bookingAccessibility', {
          code: item.code,
        })}
      >
        <View style={styles.ticketHeader}>
          <View style={styles.refRow}>
            <Ticket size={18} color={theme.colors.primary} />
            <Text style={styles.refText} numberOfLines={1}>
              {getRouteLabel(
                item.originName,
                item.destinationName,
                t('history.routeUnavailable'),
              )}
            </Text>
          </View>
          <StatusChip
            label={t(statusPresentation.labelKey)}
            tone={statusPresentation.tone}
            style={styles.statusBadge}
          />
        </View>

        <Text selectable style={styles.referenceCode} numberOfLines={1}>{item.code}</Text>

        {item.ticket.routeName ? (
          <Text style={styles.routeNameLabel} numberOfLines={1}>
            {item.ticket.routeName}
          </Text>
        ) : null}

        <View style={styles.routeContainer}>
          <View style={styles.timelineDots}>
            <View style={styles.greenDot} />
            <View style={styles.timelineLine} />
            <View style={styles.redDot} />
          </View>
          <View style={styles.routeTextContainer}>
            <Text style={styles.stationText} numberOfLines={1}>
              {item.originName ?? t('history.originUnavailable')}
            </Text>
            <Text style={styles.stationText} numberOfLines={1}>
              {item.destinationName ?? t('history.destinationUnavailable')}
            </Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          {item.departureDateTime ? (
            <>
              <View style={styles.detailItem}>
                <CalendarBlank size={16} color={theme.colors.textSecondary} />
                <Text style={styles.detailValueText}>
                  {formatDate(item.departureDateTime)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Clock size={16} color={theme.colors.textSecondary} />
                <Text style={styles.detailValueText}>
                  {formatTime(item.departureDateTime)}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.detailValueText}>
              {t('history.departureUnavailable')}
            </Text>
          )}
          <Text style={styles.seatSummary} numberOfLines={1}>
            {t('history.seats')}: {seatNumbers}
          </Text>
        </View>
      </Pressable>

      <View style={styles.ticketFooter}>
        <View style={styles.footerLeft}>
          <Text style={styles.priceLabel}>{t('booking.totalPrice')}</Text>
          <Text style={styles.priceValue}>
            {formatVnd(item.totalAmount, { display: 'code', clampNegative: true })}
          </Text>
        </View>
        <View style={styles.footerActions}>
          <Text style={styles.ticketCountLabel}>
            {t('history.ticketCount', {
              count: item.ticket.tickets.length,
            })}
          </Text>
          {paymentRedirectUrl ? (
            <Pressable
              style={trackStyle}
              onPress={handleContinuePayment}
              disabled={isOpeningPayment}
              accessibilityRole="button"
              accessibilityState={paymentAccessibilityState}
              accessibilityLabel={t('bookingHistory.continuePaymentAccessibility', {
                code: item.code,
              })}
            >
              {isOpeningPayment ? (
                <ActivityIndicator size="small" color={theme.colors.textInverse} />
              ) : (
                <CreditCard size={15} color={theme.colors.textInverse} weight="bold" />
              )}
              <Text style={styles.trackButtonText} numberOfLines={2}>
                {t('bookingHistory.continuePayment')}
              </Text>
            </Pressable>
          ) : null}
          {canTrack ? (
            <Pressable
              style={trackStyle}
              onPress={handleTrack}
              accessibilityRole="button"
              accessibilityLabel={t('bookingHistory.trackAccessibility', {
                code: item.code,
              })}
            >
              <NavigationArrow size={14} color={theme.colors.textInverse} weight="fill" />
              <Text style={styles.trackButtonText}>{t('bookingHistory.track')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
});

interface ParcelHistoryRowProps {
  item: PassengerParcelHistoryItem;
  onOpen: (
    parcelId: string,
    trackingTarget?: PassengerParcelHistoryItem['trackingTarget'],
  ) => void;
  onContinuePayment: ContinuePaymentHandler;
  isOpeningPayment: boolean;
}

const ParcelHistoryRow = memo(function ParcelHistoryRowComponent({
  item,
  onOpen,
  onContinuePayment,
  isOpeningPayment,
}: ParcelHistoryRowProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const statusPresentation = getParcelStatusPresentation(item.status);
  const sizePresentation = getParcelSizePresentation(item.parcel.sizeCategory);
  const paymentRedirectUrl = getParcelPaymentStage(item.status)
    ? item.paymentRedirectUrl
    : null;
  const handleOpen = useCallback(
    () => onOpen(item.id, item.trackingTarget),
    [item.id, item.trackingTarget, onOpen],
  );
  const handleContinuePayment = useCallback(() => {
    if (paymentRedirectUrl) onContinuePayment(item.id, item.type, paymentRedirectUrl);
  }, [item.id, item.type, onContinuePayment, paymentRedirectUrl]);
  const paymentAccessibilityState = useMemo(
    () => ({ busy: isOpeningPayment, disabled: isOpeningPayment }),
    [isOpeningPayment],
  );
  const cardStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.parcelBody,
      pressed ? styles.pressedCard : null,
    ],
    [styles],
  );
  const paymentStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.paymentButton,
      pressed ? styles.pressedCard : null,
    ],
    [styles],
  );

  return (
    <View style={styles.parcelCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('bookingHistory.parcelAccessibility', {
          code: item.code,
        })}
        style={cardStyle}
        onPress={handleOpen}
      >
        <View style={styles.parcelIconContainer}>
          <Package size={25} color={theme.colors.primary} weight="duotone" />
        </View>
        <View style={styles.parcelInfo}>
          <View style={styles.parcelHeader}>
            <Text style={styles.parcelCode} numberOfLines={1}>
              {getRouteLabel(
                item.originName,
                item.destinationName,
                t('history.routeUnavailable'),
              )}
            </Text>
            <StatusChip
              label={t(statusPresentation.labelKey)}
              tone={statusPresentation.tone}
              style={styles.parcelBadge}
            />
          </View>
          <Text selectable style={styles.parcelReference} numberOfLines={1}>{item.code}</Text>
          <View style={styles.parcelMetaRow}>
            <User size={14} color={theme.colors.textTertiary} />
            <Text style={styles.parcelMeta} numberOfLines={1}>
              {t('history.toRecipient', {
                name: item.parcel.recipientName,
              })} · {t(sizePresentation.labelKey)}
            </Text>
          </View>
          <View style={styles.parcelAmountRow}>
            <Text style={styles.parcelDate} numberOfLines={1}>
              {item.estimatedArrivalTime
                ? t('history.estimatedArrival', {
                  date: formatDate(item.estimatedArrivalTime),
                })
                : t('history.createdOn', {
                  date: formatDate(item.createdAt),
                })}
            </Text>
            <Text style={styles.parcelAmount}>
              {formatVnd(item.totalAmount, { display: 'code', clampNegative: true })}
            </Text>
          </View>
        </View>
      </Pressable>
      {paymentRedirectUrl ? (
        <View style={styles.parcelPaymentFooter}>
          <Pressable
            style={paymentStyle}
            onPress={handleContinuePayment}
            disabled={isOpeningPayment}
            accessibilityRole="button"
            accessibilityState={paymentAccessibilityState}
            accessibilityLabel={t('bookingHistory.continuePaymentAccessibility', {
              code: item.code,
            })}
          >
            {isOpeningPayment ? (
              <ActivityIndicator size="small" color={theme.colors.textInverse} />
            ) : (
              <CreditCard size={15} color={theme.colors.textInverse} weight="bold" />
            )}
            <Text style={styles.trackButtonText} numberOfLines={2}>
              {t('bookingHistory.continuePayment')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
});

interface HistoryEmptyStateProps {
  kind: HistoryTab;
  isAuthenticated: boolean;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  onSignIn: () => void;
}

const HistoryEmptyState = memo(function HistoryEmptyStateComponent({
  kind,
  isAuthenticated,
  isPending,
  error,
  onRetry,
  onSignIn,
}: HistoryEmptyStateProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const Icon = kind === 'ticket' ? Ticket : Package;

  if (!isAuthenticated) {
    return (
      <View style={styles.emptyContainer} accessibilityRole="summary">
        <Icon size={48} color={theme.colors.textTertiary} weight="thin" />
        <Text style={styles.emptyTitle}>
          {t('bookingHistory.signInRequiredTitle')}
        </Text>
        <Text style={styles.emptyText}>
          {kind === 'ticket'
            ? t('bookingHistory.signInTicketsDescription')
            : t('bookingHistory.signInParcelsDescription')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('bookingHistory.signInAction')}
          onPress={onSignIn}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonText}>
            {t('bookingHistory.signInAction')}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (isPending) {
    return (
      <View style={styles.emptyContainer} accessibilityRole="summary">
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={styles.emptyText}>{t('bookingHistory.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyContainer} accessibilityRole="summary">
        <WarningCircle size={48} color={theme.colors.error} weight="duotone" />
        <Text style={styles.emptyTitle}>
          {t('bookingHistory.unavailableTitle')}
        </Text>
        <Text style={styles.emptyText}>
          {t('bookingHistory.unavailableDescription')}
        </Text>
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.emptyContainer} accessibilityRole="summary">
      <Icon size={48} color={theme.colors.textTertiary} weight="thin" />
      <Text style={styles.emptyTitle}>
        {kind === 'ticket'
          ? t('bookingHistory.emptyTicketsTitle')
          : t('bookingHistory.emptyParcelsTitle')}
      </Text>
      <Text style={styles.emptyText}>
        {kind === 'ticket'
          ? t('bookingHistory.emptyTicketsDescription')
          : t('bookingHistory.emptyParcelsDescription')}
      </Text>
    </View>
  );
});

const PaginationFooter = memo(function PaginationFooterComponent({
  loading,
}: {
  loading: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.paginationFooter}>
      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
    </View>
  );
});

const HistoryStaleBanner = memo(function HistoryStaleBannerComponent({
  onRetry,
}: {
  onRetry: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.staleBanner} accessibilityRole="alert">
      <WarningCircle size={18} color={theme.colors.warning} weight="fill" />
      <Text style={styles.staleBannerText}>
        {t('bookingHistory.staleDescription')}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.retry')}
        onPress={onRetry}
        hitSlop={8}
      >
        <Text style={styles.staleRetryText}>{t('common.retry')}</Text>
      </Pressable>
    </View>
  );
});

export function BookingHistoryScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<BookingHistoryNavigation>();
  const route = useRoute<BookingHistoryRoute>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleTabBarScroll = useTabBarScrollBehavior();
  const isAppActive = useIsAppActive();
  const paymentReturnGate = useMemo(() => new PaymentReturnGate(), []);
  const paymentOpenInFlightRef = useRef(false);
  const pendingPaymentReturnRef = useRef<PendingPaymentReturn | null>(null);
  const userId = useAuthStore((state) => state.user?.id);
  const [openingPaymentItemKey, setOpeningPaymentItemKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HistoryTab>(
    route.params?.initialTab ?? 'ticket',
  );
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>('ALL');
  const selectedTicketStatus = ticketFilter === 'ALL' ? undefined : ticketFilter;
  const ticketQuery = usePassengerHistory(
    {
      type: 'TICKET',
      ...(selectedTicketStatus ? { status: selectedTicketStatus } : {}),
      pageSize: PASSENGER_HISTORY_DEFAULT_PAGE_SIZE,
    },
    activeTab === 'ticket',
  );
  const parcelQuery = usePassengerHistory(
    {
      type: 'PARCEL',
      pageSize: PASSENGER_HISTORY_DEFAULT_PAGE_SIZE,
    },
    activeTab === 'parcel',
  );
  const {
    data: ticketData,
    error: ticketError,
    fetchNextPage: fetchNextTicketPage,
    hasNextPage: hasNextTicketPage,
    isError: isTicketError,
    isFetchingNextPage: isFetchingNextTicketPage,
    isPending: isTicketPending,
    isRefetchError: isTicketRefetchError,
    isRefetching: isTicketRefetching,
    refetch: refetchTickets,
  } = ticketQuery;
  const {
    data: parcelData,
    error: parcelError,
    fetchNextPage: fetchNextParcelPage,
    hasNextPage: hasNextParcelPage,
    isError: isParcelError,
    isFetchingNextPage: isFetchingNextParcelPage,
    isPending: isParcelPending,
    isRefetchError: isParcelRefetchError,
    isRefetching: isParcelRefetching,
    refetch: refetchParcels,
  } = parcelQuery;

  useEffect(() => {
    const pendingPaymentReturn = pendingPaymentReturnRef.current;
    if (!pendingPaymentReturn) return;

    if (!paymentReturnGate.consume(isAppActive ? 'active' : 'background')) return;

    pendingPaymentReturnRef.current = null;
    setOpeningPaymentItemKey(null);

    if (pendingPaymentReturn.userId !== userId) return;

    const refreshActiveHistory = pendingPaymentReturn.type === 'TICKET'
      ? refetchTickets
      : refetchParcels;
    refreshActiveHistory().catch(() => undefined);
  }, [
    isAppActive,
    paymentReturnGate,
    refetchParcels,
    refetchTickets,
    userId,
  ]);

  useEffect(() => {
    paymentReturnGate.cancel();
    pendingPaymentReturnRef.current = null;
    setOpeningPaymentItemKey(null);
  }, [paymentReturnGate, userId]);

  useEffect(() => {
    if (route.params?.initialTab) setActiveTab(route.params.initialTab);
  }, [route.params?.initialTab]);

  const ticketItems = useMemo(
    () => ticketData?.pages.flatMap((page) => page.items)
      .filter((item): item is PassengerTicketHistoryItem => item.type === 'TICKET') ?? [],
    [ticketData?.pages],
  );
  const parcelItems = useMemo(
    () => parcelData?.pages.flatMap((page) => page.items)
      .filter((item): item is PassengerParcelHistoryItem => item.type === 'PARCEL') ?? [],
    [parcelData?.pages],
  );

  const showTickets = useCallback(() => setActiveTab('ticket'), []);
  const showParcels = useCallback(() => setActiveTab('parcel'), []);
  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleSignIn = useCallback(() => {
    navigation.navigate('Auth', { screen: 'Login' });
  }, [navigation]);

  const handleTicketOpen = useCallback((item: PassengerTicketHistoryItem) => {
    // Signed redirect URLs stay in the authenticated query cache and are not
    // serialized into navigation state.
    const historyItem = item.paymentRedirectUrl
      ? { ...item, paymentRedirectUrl: null }
      : item;
    navigation.navigate('Booking', {
      screen: 'DigitalTicket',
      params: {
        source: 'history',
        bookingId: item.id,
        historyItem,
      },
    });
  }, [navigation]);

  const handleTrack = useCallback((
    tripId: string,
    bookingId: string,
    trackingTarget: PassengerTicketHistoryItem['trackingTarget'],
  ) => {
    navigation.navigate('Tracking', {
      source: 'trip',
      tripId,
      bookingId,
      ...(trackingTarget ? { trackingTarget } : {}),
    });
  }, [navigation]);

  const handleParcelOpen = useCallback((
    parcelId: string,
    trackingTarget?: PassengerParcelHistoryItem['trackingTarget'],
  ) => {
    navigation.navigate('Parcel', {
      screen: 'ParcelDetail',
      params: {
        parcelId,
        fromHistory: true,
        ...(trackingTarget ? { trackingTarget } : {}),
      },
    });
  }, [navigation]);

  const handleContinuePayment = useCallback<ContinuePaymentHandler>((
    itemId,
    type,
    _redirectUrl,
  ) => {
    if (
      !userId
      || paymentOpenInFlightRef.current
      || pendingPaymentReturnRef.current
    ) {
      return;
    }

    const itemKey = getPaymentItemKey(type, itemId);
    pendingPaymentReturnRef.current = { itemKey, type, userId };
    paymentReturnGate.arm(isAppActive ? 'active' : 'background');
    setOpeningPaymentItemKey(itemKey);
    paymentOpenInFlightRef.current = true;

    (async () => {
      try {
        const pending = await getPendingVnPaySession();
        if (
          !pending?.paymentRedirectUrl
          || pending?.ownerUserId !== userId
          || !pending.vnpaySdk
          || (pending.businessId && pending.businessId !== itemId)
        ) {
          throw new Error('PENDING_VNPAY_SESSION_UNAVAILABLE');
        }

        await reopenPendingVnPayPayment(pending, userId);
      } catch {
        const pendingPaymentReturn = pendingPaymentReturnRef.current;
        if (pendingPaymentReturn?.itemKey === itemKey) {
          pendingPaymentReturnRef.current = null;
          paymentReturnGate.cancel();
          setOpeningPaymentItemKey(null);
        }

        if (type === 'PARCEL') {
          Alert.alert(
            t('parcel.payment.redirectErrorTitle'),
            t('parcel.payment.redirectErrorDescription'),
          );
        } else {
          Alert.alert(
            t('booking.paymentRedirect.errorTitle'),
            t('booking.paymentRedirect.errorDescription'),
          );
        }
      } finally {
        paymentOpenInFlightRef.current = false;
      }
    })().catch(() => undefined);
  }, [
    isAppActive,
    paymentReturnGate,
    t,
    userId,
  ]);

  const renderTicket = useCallback(
    ({ item }: ListRenderItemInfo<PassengerTicketHistoryItem>) => (
      <TicketHistoryRow
        item={item}
        onOpen={handleTicketOpen}
        onTrack={handleTrack}
        onContinuePayment={handleContinuePayment}
        isOpeningPayment={openingPaymentItemKey === getPaymentItemKey(item.type, item.id)}
      />
    ),
    [
      handleContinuePayment,
      handleTicketOpen,
      handleTrack,
      openingPaymentItemKey,
    ],
  );
  const renderParcel = useCallback(
    ({ item }: ListRenderItemInfo<PassengerParcelHistoryItem>) => (
      <ParcelHistoryRow
        item={item}
        onOpen={handleParcelOpen}
        onContinuePayment={handleContinuePayment}
        isOpeningPayment={openingPaymentItemKey === getPaymentItemKey(item.type, item.id)}
      />
    ),
    [handleContinuePayment, handleParcelOpen, openingPaymentItemKey],
  );

  const refreshTickets = useCallback(() => {
    refetchTickets().catch(() => undefined);
  }, [refetchTickets]);
  const refreshParcels = useCallback(() => {
    refetchParcels().catch(() => undefined);
  }, [refetchParcels]);
  const loadMoreTickets = useCallback(() => {
    if (hasNextTicketPage && !isFetchingNextTicketPage) {
      fetchNextTicketPage().catch(() => undefined);
    }
  }, [fetchNextTicketPage, hasNextTicketPage, isFetchingNextTicketPage]);
  const loadMoreParcels = useCallback(() => {
    if (hasNextParcelPage && !isFetchingNextParcelPage) {
      fetchNextParcelPage().catch(() => undefined);
    }
  }, [fetchNextParcelPage, hasNextParcelPage, isFetchingNextParcelPage]);

  const ticketEmpty = useMemo(() => (
    <HistoryEmptyState
      kind="ticket"
      isAuthenticated={Boolean(userId)}
      isPending={isTicketPending}
      error={isTicketError ? ticketError : null}
      onRetry={refreshTickets}
      onSignIn={handleSignIn}
    />
  ), [handleSignIn, isTicketError, isTicketPending, refreshTickets, ticketError, userId]);
  const parcelEmpty = useMemo(() => (
    <HistoryEmptyState
      kind="parcel"
      isAuthenticated={Boolean(userId)}
      isPending={isParcelPending}
      error={isParcelError ? parcelError : null}
      onRetry={refreshParcels}
      onSignIn={handleSignIn}
    />
  ), [handleSignIn, isParcelError, isParcelPending, parcelError, refreshParcels, userId]);
  const ticketFooter = useMemo(
    () => <PaginationFooter loading={isFetchingNextTicketPage} />,
    [isFetchingNextTicketPage],
  );
  const parcelFooter = useMemo(
    () => <PaginationFooter loading={isFetchingNextParcelPage} />,
    [isFetchingNextParcelPage],
  );
  const ticketHeader = useMemo(
    () => isTicketRefetchError && ticketItems.length > 0
      ? <HistoryStaleBanner onRetry={refreshTickets} />
      : null,
    [isTicketRefetchError, refreshTickets, ticketItems.length],
  );
  const parcelHeader = useMemo(
    () => isParcelRefetchError && parcelItems.length > 0
      ? <HistoryStaleBanner onRetry={refreshParcels} />
      : null,
    [isParcelRefetchError, parcelItems.length, refreshParcels],
  );

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <View style={styles.headerGroup}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel={t('common.back')}
            accessibilityRole="button"
            onPress={handleGoBack}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={theme.colors.textPrimary} />
          </Pressable>
          <Text style={styles.topBarTitle}>{t('profile.history')}</Text>
          <View style={styles.topBarRightPlaceholder} />
        </View>

        <View style={styles.mainTabs} accessibilityRole="tablist">
          <Pressable
            style={[
              styles.mainTab,
              activeTab === 'ticket' ? styles.activeMainTab : null,
            ]}
            onPress={showTickets}
            accessibilityRole="tab"
            accessibilityLabel={t('bookingHistory.ticketsTab')}
            accessibilityState={{ selected: activeTab === 'ticket' }}
          >
            <Ticket
              size={18}
              color={activeTab === 'ticket'
                ? theme.colors.textInverse
                : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.mainTabText,
                activeTab === 'ticket' ? styles.activeMainTabText : null,
              ]}
            >
              {t('bookingHistory.ticketsTab')}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.mainTab,
              activeTab === 'parcel' ? styles.activeMainTab : null,
            ]}
            onPress={showParcels}
            accessibilityRole="tab"
            accessibilityLabel={t('bookingHistory.parcelsTab')}
            accessibilityState={{ selected: activeTab === 'parcel' }}
          >
            <Package
              size={18}
              color={activeTab === 'parcel'
                ? theme.colors.textInverse
                : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.mainTabText,
                activeTab === 'parcel' ? styles.activeMainTabText : null,
              ]}
            >
              {t('bookingHistory.parcelsTab')}
            </Text>
          </Pressable>
        </View>

        {activeTab === 'ticket' ? (
          <View style={styles.filterContainer}>
            <TicketFilterChip
              label={t('bookingHistory.filters.all')}
              value="ALL"
              selected={ticketFilter === 'ALL'}
              onSelect={setTicketFilter}
            />
            <TicketFilterChip
              label={t('bookingHistory.filters.confirmed')}
              value="CONFIRMED"
              selected={ticketFilter === 'CONFIRMED'}
              onSelect={setTicketFilter}
            />
            <TicketFilterChip
              label={t('bookingHistory.filters.completed')}
              value="COMPLETED"
              selected={ticketFilter === 'COMPLETED'}
              onSelect={setTicketFilter}
            />
            <TicketFilterChip
              label={t('bookingHistory.filters.cancelled')}
              value="CANCELLED"
              selected={ticketFilter === 'CANCELLED'}
              onSelect={setTicketFilter}
            />
          </View>
        ) : null}
      </View>

      {activeTab === 'ticket' ? (
          <FlashList
            data={ticketItems}
            renderItem={renderTicket}
            keyExtractor={ticketKeyExtractor}
            ListEmptyComponent={ticketEmpty}
            ListFooterComponent={ticketFooter}
            ListHeaderComponent={ticketHeader}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMoreTickets}
            onEndReachedThreshold={0.35}
            onRefresh={refreshTickets}
            refreshing={isTicketRefetching && !isFetchingNextTicketPage}
            onScroll={handleTabBarScroll}
            scrollEventThrottle={16}
          />
      ) : (
        <FlashList
          data={parcelItems}
          renderItem={renderParcel}
          keyExtractor={parcelKeyExtractor}
          ListEmptyComponent={parcelEmpty}
          ListFooterComponent={parcelFooter}
          ListHeaderComponent={parcelHeader}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMoreParcels}
          onEndReachedThreshold={0.35}
          onRefresh={refreshParcels}
          refreshing={isParcelRefetching && !isFetchingNextParcelPage}
          onScroll={handleTabBarScroll}
          scrollEventThrottle={16}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerGroup: {
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceElevated
      : theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.effects.isLiquid
      ? theme.effects.contentBorderStrong
      : theme.colors.divider,
    ...theme.effects.cardShadow,
  },
  topBar: {
    height: 56,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.md,
    backgroundColor: theme.colors.transparent,
  },
  backButton: {
    ...theme.components.headerButton,
    width: 40,
    height: 40,
    borderRadius: BR.full,
  },
  topBarTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  topBarRightPlaceholder: { width: 40 },
  mainTabs: {
    flexDirection: 'row' as const,
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: theme.colors.transparent,
  },
  mainTab: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    borderRadius: BR.lg,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
  },
  activeMainTab: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  mainTabText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  activeMainTabText: { color: theme.colors.textInverse },
  filterContainer: {
    flexDirection: 'row' as const,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.transparent,
  },
  filterTab: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.xs,
    borderRadius: BR.full,
    borderCurve: 'continuous' as const,
  },
  activeFilterTab: { backgroundColor: theme.colors.primaryFaded },
  filterLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  activeFilterLabel: { color: theme.colors.primary },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 96,
  },
  emptyContainer: {
    minHeight: 320,
    paddingVertical: 64,
    paddingHorizontal: spacing.xl,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  emptyText: {
    marginTop: spacing.sm,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.45,
    color: theme.colors.textTertiary,
    textAlign: 'center' as const,
  },
  retryButton: {
    minHeight: 44,
    marginTop: spacing.lg,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.xl,
    borderRadius: BR.full,
    backgroundColor: theme.colors.primary,
  },
  retryButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
  paginationFooter: {
    minHeight: 56,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  staleBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: BR.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.warningLight,
  },
  staleBannerText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.warning,
  },
  staleRetryText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.warning,
  },
  ticketCard: {
    ...theme.components.card,
    marginBottom: spacing.xl,
    overflow: 'hidden' as const,
    borderRadius: BR.xl,
    borderCurve: 'continuous' as const,
  },
  ticketBody: { padding: spacing.lg },
  pressedCard: { opacity: 0.82 },
  ticketHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  refRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  refText: {
    flex: 1,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  statusBadge: {
    maxWidth: '48%' as const,
  },
  activeStatusBadge: { backgroundColor: theme.colors.infoLight },
  completedBadge: { backgroundColor: theme.colors.successLight },
  statusText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  activeStatusText: { color: theme.colors.info },
  completedStatusText: { color: theme.colors.success },
  routeNameLabel: {
    marginBottom: spacing.sm,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  referenceCode: {
    marginBottom: spacing.sm,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  routeContainer: {
    flexDirection: 'row' as const,
    marginBottom: spacing.md,
  },
  timelineDots: {
    width: 24,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 6,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
    marginVertical: 4,
    backgroundColor: theme.colors.border,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.error,
  },
  routeTextContainer: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    justifyContent: 'space-between' as const,
    marginLeft: spacing.sm,
  },
  stationText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  detailsRow: {
    minHeight: 44,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: BR.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : theme.colors.surfaceAlt,
  },
  detailItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
  },
  detailValueText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
  },
  seatSummary: {
    flexShrink: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  ticketFooter: {
    minHeight: 70,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
  },
  footerLeft: { flex: 1 },
  footerActions: {
    minWidth: 120,
    flexShrink: 1,
    alignItems: 'flex-end' as const,
    gap: spacing.sm,
  },
  priceLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  priceValue: {
    marginTop: 2,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.primary,
  },
  ticketCountLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  trackButton: {
    minHeight: 44,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: BR.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.primary,
  },
  trackButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textInverse,
  },
  parcelCard: {
    ...theme.components.card,
    marginBottom: spacing.md,
    borderRadius: BR.xl,
    borderCurve: 'continuous' as const,
    overflow: 'hidden' as const,
  },
  parcelBody: {
    minHeight: 128,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    padding: spacing.md,
  },
  parcelIconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: BR.lg,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : theme.colors.surfaceAlt,
  },
  parcelInfo: { flex: 1, minWidth: 0 },
  parcelHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
  },
  parcelCode: {
    flex: 1,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  parcelBadge: {
    maxWidth: '52%' as const,
  },
  parcelBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  parcelReference: {
    marginTop: spacing.sm,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  parcelMetaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  parcelMeta: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  parcelAmountRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  parcelDate: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  parcelAmount: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  parcelPaymentFooter: {
    alignItems: 'flex-end' as const,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
  },
  paymentButton: {
    minHeight: 44,
    maxWidth: '100%' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: BR.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.primary,
  },
});
