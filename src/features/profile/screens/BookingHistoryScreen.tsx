import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
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
  Flask,
  NavigationArrow,
  Package,
  Ticket,
} from 'phosphor-react-native';

import type {
  MainTabParamList,
  RootStackParamList,
} from '@app/navigation/types';
import { getApiErrorMessage } from '@shared/api/errors';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useTabBarScrollBehavior, useThemedStyles } from '@shared/hooks';
import {
  borderRadius as BR,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { formatDate, formatDateTime, formatTime, formatVnd } from '@shared/utils/format';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useBookingHistory } from '../../booking/hooks/useBookingHistory';
import type { BookingHistoryItem } from '../../booking/types/booking';
import { useReceivedParcels } from '../../parcel/hooks/useParcelQueries';
import type { ReceivedParcel } from '../../parcel/types';

type HistoryTab = 'ticket' | 'parcel';
type TicketFilter = 'all' | 'upcoming' | 'past';
type BookingHistoryRoute = RouteProp<MainTabParamList, 'BookingHistory'>;
type BookingHistoryNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'BookingHistory'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const ACTIVE_STATUSES = new Set<BookingHistoryItem['status']>([
  'PENDING_PAYMENT',
  'CONFIRMED',
]);
const EMPTY_RECEIVED_PARCELS: ReceivedParcel[] = [];

interface BookingHistoryRowProps {
  id: string;
  bookingCode: string;
  tripId: string;
  originStationName: string;
  destinationStationName: string;
  departureDateTime: string;
  status: BookingHistoryItem['status'];
  totalAmount: number;
  trackingEnabled: boolean;
  onOpen: (bookingId: string) => void;
  onTrack: (tripId: string, bookingId: string) => void;
}

const BookingHistoryRow = memo(function BookingHistoryRowComponent({
  id,
  bookingCode,
  tripId,
  originStationName,
  destinationStationName,
  departureDateTime,
  status,
  totalAmount,
  trackingEnabled,
  onOpen,
  onTrack,
}: BookingHistoryRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isUpcoming = status === 'PENDING_PAYMENT' || status === 'CONFIRMED';
  const isCompleted = status === 'COMPLETED';
  const canTrack = Boolean(tripId) && trackingEnabled;
  const handleOpen = useCallback(() => onOpen(id), [id, onOpen]);
  const handleTrack = useCallback(
    () => onTrack(tripId, id),
    [id, onTrack, tripId],
  );

  return (
    <View style={styles.ticketCard}>
      <Pressable
        style={({ pressed }) => [styles.ticketBody, pressed ? styles.pressedCard : null]}
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityLabel={`Booking ${bookingCode}`}
      >
        <View style={styles.ticketHeader}>
          <View style={styles.refRow}>
            <Ticket size={18} color={theme.colors.primary} />
            <Text style={styles.refText}>{bookingCode}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              isUpcoming ? styles.upcomingBadge : null,
              isCompleted ? styles.completedBadge : null,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isUpcoming ? styles.upcomingStatusText : null,
                isCompleted ? styles.completedStatusText : null,
              ]}
            >
              {status}
            </Text>
          </View>
        </View>

        <View style={styles.routeContainer}>
          <View style={styles.timelineDots}>
            <View style={styles.greenDot} />
            <View style={styles.timelineLine} />
            <View style={styles.redDot} />
          </View>
          <View style={styles.routeTextContainer}>
            <Text style={styles.stationText} numberOfLines={1}>{originStationName}</Text>
            <Text style={styles.stationText} numberOfLines={1}>{destinationStationName}</Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <CalendarBlank size={16} color={theme.colors.textSecondary} />
            <Text style={styles.detailValueText}>{formatDate(departureDateTime)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Clock size={16} color={theme.colors.textSecondary} />
            <Text style={styles.detailValueText}>{formatTime(departureDateTime)}</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.ticketFooter}>
        <View style={styles.footerLeft}>
          <Text style={styles.priceLabel}>{t('booking.totalPrice', 'Total Price')}</Text>
          <Text style={styles.priceValue}>{formatVnd(totalAmount)}</Text>
        </View>
        {canTrack ? (
          <Pressable
            style={({ pressed }) => [styles.trackButton, pressed ? styles.pressedCard : null]}
            onPress={handleTrack}
            accessibilityRole="button"
            accessibilityLabel={`Track booking ${bookingCode}`}
          >
            <NavigationArrow size={14} color={theme.colors.textInverse} weight="fill" />
            <Text style={styles.trackButtonText}>{t('booking.track', 'Track')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

interface ParcelHistoryRowProps {
  parcelId: string;
  parcelCode: string;
  status: string;
  originName: string;
  destinationName: string;
  eta: string | null;
  sizeCategory: string;
  onOpen: (parcelId: string) => void;
}

const ParcelHistoryRow = memo(function ParcelHistoryRowComponent({
  parcelId,
  parcelCode,
  status,
  originName,
  destinationName,
  eta,
  sizeCategory,
  onOpen,
}: ParcelHistoryRowProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleOpen = useCallback(() => onOpen(parcelId), [onOpen, parcelId]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Parcel ${parcelCode}`}
      style={({ pressed }) => [styles.parcelCard, pressed ? styles.pressedCard : null]}
      onPress={handleOpen}
    >
      <View style={styles.parcelIconContainer}>
        <Package size={25} color={theme.colors.primary} weight="duotone" />
      </View>
      <View style={styles.parcelInfo}>
        <View style={styles.parcelHeader}>
          <Text style={styles.parcelCode}>{parcelCode}</Text>
          <View style={styles.parcelBadge}>
            <Text style={styles.parcelBadgeText}>{status.replaceAll('_', ' ')}</Text>
          </View>
        </View>
        <Text style={styles.parcelRoute} numberOfLines={1}>
          {originName} → {destinationName}
        </Text>
        <Text style={styles.parcelMeta} numberOfLines={1}>
          {sizeCategory}{eta ? ` · ETA ${formatDateTime(eta)}` : ' · ETA unavailable'}
        </Text>
      </View>
    </Pressable>
  );
});

interface ParcelHistoryListProps {
  onOpen: (parcelId: string) => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

function ParcelHistoryList({ onOpen, onScroll }: ParcelHistoryListProps): React.JSX.Element {
  const { t } = useTranslation();
  const userId = useAuthStore((state) => state.user?.id);
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const parcelQuery = useReceivedParcels(1, 50);
  const parcels = parcelQuery.data?.items ?? EMPTY_RECEIVED_PARCELS;
  const refetch = parcelQuery.refetch;

  const renderParcel = useCallback(({ item }: { item: ReceivedParcel }) => (
    <ParcelHistoryRow
      parcelId={item.parcelId}
      parcelCode={item.parcelCode}
      status={item.status}
      originName={item.originStation?.name ?? 'Origin station'}
      destinationName={item.destinationStation?.name ?? 'Destination station'}
      eta={item.eta}
      sizeCategory={item.sizeCategory}
      onOpen={onOpen}
    />
  ), [onOpen]);

  const emptyContent = useMemo(() => {
    if (!userId) {
      return (
        <View style={styles.emptyContainer}>
          <Package size={48} color={theme.colors.textTertiary} weight="thin" />
          <Text style={styles.emptyTitle}>Sign in required</Text>
          <Text style={styles.emptyText}>
            Sign in to view parcels associated with your passenger account.
          </Text>
        </View>
      );
    }
    if (parcelQuery.isPending) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.emptyText}>{t('common.loading', 'Loading...')}</Text>
        </View>
      );
    }
    if (parcelQuery.isError) {
      return (
        <View style={styles.emptyContainer}>
          <Package size={48} color={theme.colors.textTertiary} weight="thin" />
          <Text style={styles.emptyText}>{getApiErrorMessage(parcelQuery.error)}</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Package size={48} color={theme.colors.textTertiary} weight="thin" />
        <Text style={styles.emptyText}>No received parcels found.</Text>
      </View>
    );
  }, [parcelQuery.error, parcelQuery.isError, parcelQuery.isPending, styles, t, theme.colors.primary, theme.colors.textTertiary, userId]);

  const handleRefresh = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);

  return (
    <FlashList
      data={parcels}
      renderItem={renderParcel}
      keyExtractor={parcelKeyExtractor}
      ListEmptyComponent={emptyContent}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      onRefresh={handleRefresh}
      refreshing={parcelQuery.isRefetching}
      onScroll={onScroll}
      scrollEventThrottle={16}
    />
  );
}

export function BookingHistoryScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<BookingHistoryNavigation>();
  const route = useRoute<BookingHistoryRoute>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleTabBarScroll = useTabBarScrollBehavior();
  const [activeTab, setActiveTab] = useState<HistoryTab>(route.params?.initialTab ?? 'ticket');
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>('all');
  const historyQuery = useBookingHistory();
  const refetchHistory = historyQuery.refetch;

  useEffect(() => {
    if (route.params?.initialTab) setActiveTab(route.params.initialTab);
  }, [route.params]);

  const historyResult = historyQuery.data;
  const tickets = useMemo(
    () => historyResult && historyResult.source !== 'unavailable'
      ? historyResult.items
      : [],
    [historyResult],
  );
  const isDemo = historyResult?.source === 'demo';

  const filteredTickets = useMemo(() => tickets.filter((ticket) => {
    if (ticketFilter === 'upcoming') return ACTIVE_STATUSES.has(ticket.status);
    if (ticketFilter === 'past') {
      return ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED';
    }
    return true;
  }), [ticketFilter, tickets]);

  const showTickets = useCallback(() => setActiveTab('ticket'), []);
  const showParcels = useCallback(() => setActiveTab('parcel'), []);
  const showAll = useCallback(() => setTicketFilter('all'), []);
  const showUpcoming = useCallback(() => setTicketFilter('upcoming'), []);
  const showPast = useCallback(() => setTicketFilter('past'), []);

  const handleTicketOpen = useCallback((bookingId: string) => {
    navigation.navigate('Booking', {
      screen: 'DigitalTicket',
      params: { source: 'history', bookingId },
    });
  }, [navigation]);

  const handleTrack = useCallback((
    tripId: string,
    bookingId: string,
  ) => {
    navigation.navigate('Tracking', { tripId, bookingId });
  }, [navigation]);

  const handleParcelOpen = useCallback((parcelId: string) => {
    navigation.navigate('Parcel', {
      screen: 'ParcelDetail',
      params: { parcelId, fromHistory: true },
    });
  }, [navigation]);

  const renderTicket = useCallback(({ item }: { item: BookingHistoryItem }) => (
    <BookingHistoryRow
      id={item.id}
      bookingCode={item.bookingCode}
      tripId={item.tripId}
      originStationName={item.originStationName}
      destinationStationName={item.destinationStationName}
      departureDateTime={item.departureDateTime}
      status={item.status}
      totalAmount={item.totalAmount}
      trackingEnabled={!isDemo && item.status === 'CONFIRMED'}
      onOpen={handleTicketOpen}
      onTrack={handleTrack}
    />
  ), [handleTicketOpen, handleTrack, isDemo]);

  const ticketEmpty = useMemo(() => {
    if (historyQuery.isPending) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.emptyText}>{t('common.loading', 'Loading...')}</Text>
        </View>
      );
    }
    if (historyQuery.isError) {
      return (
        <View style={styles.emptyContainer}>
          <Ticket size={48} color={theme.colors.textTertiary} weight="thin" />
          <Text style={styles.emptyText}>{getApiErrorMessage(historyQuery.error)}</Text>
        </View>
      );
    }
    if (historyResult?.source === 'unavailable') {
      const needsAuth = historyResult.reason === 'authentication_required';
      return (
        <View style={styles.emptyContainer}>
          <Ticket size={48} color={theme.colors.textTertiary} weight="thin" />
          <Text style={styles.emptyTitle}>
            {needsAuth ? 'Sign in required' : t('profile.historyComingSoon', 'Coming soon')}
          </Text>
          <Text style={styles.emptyText}>
            {needsAuth
              ? 'Sign in to view bookings associated with your passenger account.'
              : t(
                  'profile.historyNotSupported',
                  'Booking history is not yet available from the server.',
                )}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Ticket size={48} color={theme.colors.textTertiary} weight="thin" />
        <Text style={styles.emptyText}>{t('profile.noTickets', 'No ticket history found.')}</Text>
      </View>
    );
  }, [historyQuery.error, historyQuery.isError, historyQuery.isPending, historyResult, styles, t, theme.colors.primary, theme.colors.textTertiary]);

  const handleTicketRefresh = useCallback(() => {
    refetchHistory().catch(() => undefined);
  }, [refetchHistory]);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={navigation.goBack} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>{t('profile.history', 'History')}</Text>
        <View style={styles.topBarRightPlaceholder} />
      </View>

      <View style={styles.mainTabs}>
        <Pressable
          style={[styles.mainTab, activeTab === 'ticket' ? styles.activeMainTab : null]}
          onPress={showTickets}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'ticket' }}
        >
          <Ticket size={18} color={activeTab === 'ticket' ? theme.colors.textInverse : theme.colors.textSecondary} />
          <Text style={[styles.mainTabText, activeTab === 'ticket' ? styles.activeMainTabText : null]}>
            Tickets
          </Text>
        </Pressable>
        <Pressable
          style={[styles.mainTab, activeTab === 'parcel' ? styles.activeMainTab : null]}
          onPress={showParcels}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'parcel' }}
        >
          <Package size={18} color={activeTab === 'parcel' ? theme.colors.textInverse : theme.colors.textSecondary} />
          <Text style={[styles.mainTabText, activeTab === 'parcel' ? styles.activeMainTabText : null]}>
            Parcels
          </Text>
        </Pressable>
      </View>

      {isDemo && activeTab === 'ticket' ? (
        <View style={styles.demoBanner}>
          <Flask size={14} color={theme.colors.warning} />
          <Text style={styles.demoBannerText}>Demo data — booking history API coming soon</Text>
        </View>
      ) : null}

      {activeTab === 'ticket' ? (
        <>
          <View style={styles.filterContainer}>
            <Pressable style={[styles.filterTab, ticketFilter === 'all' ? styles.activeFilterTab : null]} onPress={showAll}>
              <Text style={[styles.filterLabel, ticketFilter === 'all' ? styles.activeFilterLabel : null]}>All</Text>
            </Pressable>
            <Pressable style={[styles.filterTab, ticketFilter === 'upcoming' ? styles.activeFilterTab : null]} onPress={showUpcoming}>
              <Text style={[styles.filterLabel, ticketFilter === 'upcoming' ? styles.activeFilterLabel : null]}>Upcoming</Text>
            </Pressable>
            <Pressable style={[styles.filterTab, ticketFilter === 'past' ? styles.activeFilterTab : null]} onPress={showPast}>
              <Text style={[styles.filterLabel, ticketFilter === 'past' ? styles.activeFilterLabel : null]}>Past</Text>
            </Pressable>
          </View>
          <FlashList
            data={filteredTickets}
            renderItem={renderTicket}
            keyExtractor={ticketKeyExtractor}
            ListEmptyComponent={ticketEmpty}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            onRefresh={handleTicketRefresh}
            refreshing={historyQuery.isRefetching}
            onScroll={handleTabBarScroll}
            scrollEventThrottle={16}
          />
        </>
      ) : (
        <ParcelHistoryList onOpen={handleParcelOpen} onScroll={handleTabBarScroll} />
      )}
    </SafeAreaView>
  );
}

const ticketKeyExtractor = (item: BookingHistoryItem): string => item.id;
const parcelKeyExtractor = (item: ReceivedParcel): string => item.parcelId;

const createStyles = (theme: AppTheme) => ({
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    height: 56,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: BR.full,
    borderCurve: 'continuous' as const,
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
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
    backgroundColor: theme.colors.surfaceAlt,
  },
  activeMainTab: { backgroundColor: theme.colors.primary },
  mainTabText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  activeMainTabText: { color: theme.colors.textInverse },
  demoBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.warningLight,
  },
  demoBannerText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.warning,
  },
  filterContainer: {
    flexDirection: 'row' as const,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center' as const,
    borderRadius: BR.full,
    borderCurve: 'continuous' as const,
  },
  activeFilterTab: { backgroundColor: theme.colors.primaryFaded },
  filterLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  activeFilterLabel: { color: theme.colors.primary },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 130,
  },
  emptyContainer: {
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
    color: theme.colors.textTertiary,
    textAlign: 'center' as const,
  },
  ticketCard: {
    marginBottom: spacing.xl,
    overflow: 'hidden' as const,
    borderRadius: BR.lg,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    ...theme.effects.cardShadow,
  },
  ticketBody: { padding: spacing.lg },
  pressedCard: { opacity: 0.82 },
  ticketHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: spacing.md,
  },
  refRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  refText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: BR.sm,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.surfaceAlt,
  },
  upcomingBadge: { backgroundColor: theme.colors.infoLight },
  completedBadge: { backgroundColor: theme.colors.successLight },
  statusText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  upcomingStatusText: { color: theme.colors.info },
  completedStatusText: { color: theme.colors.success },
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
    height: 52,
    justifyContent: 'space-between' as const,
    marginLeft: spacing.sm,
  },
  stationText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  detailsRow: {
    flexDirection: 'row' as const,
    gap: spacing.lg,
    padding: spacing.md,
    borderRadius: BR.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.surfaceAlt,
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
  ticketFooter: {
    minHeight: 70,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
  },
  footerLeft: { flex: 1 },
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
  trackButton: {
    minHeight: 40,
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
    minHeight: 96,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: BR.lg,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    ...theme.effects.cardShadow,
  },
  parcelIconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: BR.lg,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.surfaceAlt,
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
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: BR.full,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.primaryFaded,
  },
  parcelBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: theme.colors.primary,
  },
  parcelRoute: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  parcelMeta: {
    marginTop: 3,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
});
