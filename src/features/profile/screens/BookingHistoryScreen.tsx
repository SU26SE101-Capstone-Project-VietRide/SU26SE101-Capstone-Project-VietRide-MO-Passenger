import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
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
import { formatParcelStatusLabel } from '@features/parcel/utils/parcelTracking';
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
import {
  formatDate,
  formatDateTime,
  formatStatusLabel,
  formatTime,
  formatVnd,
} from '@shared/utils/format';
import { PASSENGER_HISTORY_DEFAULT_PAGE_SIZE } from '../api/passengerHistoryApi';
import { usePassengerHistory } from '../hooks/usePassengerHistory';
import type {
  PassengerParcelHistoryItem,
  PassengerTicketHistoryItem,
  PassengerTicketStatus,
} from '../types';

type HistoryTab = 'ticket' | 'parcel';
type TicketFilter = 'ALL' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
type BookingHistoryRoute = RouteProp<MainTabParamList, 'BookingHistory'>;
type BookingHistoryNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'BookingHistory'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const TRACKABLE_TICKET_STATUSES = new Set<PassengerTicketStatus>([
  'CONFIRMED',
  'COMPLETED',
  'PARTIAL_NO_SHOW',
  'DISRUPTED',
]);

const ticketKeyExtractor = (item: PassengerTicketHistoryItem): string => item.id;
const parcelKeyExtractor = (item: PassengerParcelHistoryItem): string => item.id;

const getRouteLabel = (
  originName: string | null,
  destinationName: string | null,
): string => {
  if (originName && destinationName) return `${originName} → ${destinationName}`;
  return originName ?? destinationName ?? 'Journey details unavailable';
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
  onTrack: (tripId: string, bookingId: string) => void;
}

const TicketHistoryRow = memo(function TicketHistoryRowComponent({
  item,
  onOpen,
  onTrack,
}: TicketHistoryRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isActive = item.status === 'PENDING_PAYMENT' || item.status === 'CONFIRMED';
  const isCompleted = item.status === 'COMPLETED';
  const canTrack = TRACKABLE_TICKET_STATUSES.has(item.status);
  const seatNumbers = useMemo(
    () => item.ticket.tickets.map((ticket) => ticket.seatNumber).join(', ') || '—',
    [item.ticket.tickets],
  );
  const handleOpen = useCallback(() => onOpen(item), [item, onOpen]);
  const handleTrack = useCallback(
    () => onTrack(item.tripId, item.id),
    [item.id, item.tripId, onTrack],
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
        accessibilityLabel={`Booking ${item.code}`}
      >
        <View style={styles.ticketHeader}>
          <View style={styles.refRow}>
            <Ticket size={18} color={theme.colors.primary} />
            <Text style={styles.refText} numberOfLines={1}>{item.code}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              isActive ? styles.activeStatusBadge : null,
              isCompleted ? styles.completedBadge : null,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isActive ? styles.activeStatusText : null,
                isCompleted ? styles.completedStatusText : null,
              ]}
              numberOfLines={1}
            >
              {formatStatusLabel(item.status)}
            </Text>
          </View>
        </View>

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
              {item.originName ?? 'Origin unavailable'}
            </Text>
            <Text style={styles.stationText} numberOfLines={1}>
              {item.destinationName ?? 'Destination unavailable'}
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
            <Text style={styles.detailValueText}>Departure schedule unavailable</Text>
          )}
          <Text style={styles.seatSummary} numberOfLines={1}>Seats {seatNumbers}</Text>
        </View>
      </Pressable>

      <View style={styles.ticketFooter}>
        <View style={styles.footerLeft}>
          <Text style={styles.priceLabel}>{t('booking.totalPrice', 'Total Price')}</Text>
          <Text style={styles.priceValue}>
            {formatVnd(item.totalAmount, { display: 'code', clampNegative: true })}
          </Text>
        </View>
        <Text style={styles.ticketCountLabel}>
          {item.ticket.tickets.length} {item.ticket.tickets.length === 1 ? 'ticket' : 'tickets'}
        </Text>
        {canTrack ? (
          <Pressable
            style={trackStyle}
            onPress={handleTrack}
            accessibilityRole="button"
            accessibilityLabel={`Track booking ${item.code}`}
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
  item: PassengerParcelHistoryItem;
  onOpen: (parcelId: string) => void;
}

const ParcelHistoryRow = memo(function ParcelHistoryRowComponent({
  item,
  onOpen,
}: ParcelHistoryRowProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleOpen = useCallback(() => onOpen(item.id), [item.id, onOpen]);
  const cardStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.parcelCard,
      pressed ? styles.pressedCard : null,
    ],
    [styles],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Parcel ${item.code}`}
      style={cardStyle}
      onPress={handleOpen}
    >
      <View style={styles.parcelIconContainer}>
        <Package size={25} color={theme.colors.primary} weight="duotone" />
      </View>
      <View style={styles.parcelInfo}>
        <View style={styles.parcelHeader}>
          <Text style={styles.parcelCode} numberOfLines={1}>{item.code}</Text>
          <View style={styles.parcelBadge}>
            <Text style={styles.parcelBadgeText} numberOfLines={1}>
              {formatParcelStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        <Text style={styles.parcelRoute} numberOfLines={1}>
          {getRouteLabel(item.originName, item.destinationName)}
        </Text>
        <View style={styles.parcelMetaRow}>
          <User size={14} color={theme.colors.textTertiary} />
          <Text style={styles.parcelMeta} numberOfLines={1}>
            {item.parcel.recipientName} · {item.parcel.sizeCategory}
          </Text>
        </View>
        <View style={styles.parcelAmountRow}>
          <Text style={styles.parcelDate} numberOfLines={1}>
            {item.estimatedArrivalTime
              ? `ETA ${formatDateTime(item.estimatedArrivalTime)}`
              : `Created ${formatDate(item.createdAt)}`}
          </Text>
          <Text style={styles.parcelAmount}>
            {formatVnd(item.totalAmount, { display: 'code', clampNegative: true })}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

interface HistoryEmptyStateProps {
  kind: HistoryTab;
  isAuthenticated: boolean;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
}

const HistoryEmptyState = memo(function HistoryEmptyStateComponent({
  kind,
  isAuthenticated,
  isPending,
  error,
  onRetry,
}: HistoryEmptyStateProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const Icon = kind === 'ticket' ? Ticket : Package;

  if (!isAuthenticated) {
    return (
      <View style={styles.emptyContainer} accessibilityRole="summary">
        <Icon size={48} color={theme.colors.textTertiary} weight="thin" />
        <Text style={styles.emptyTitle}>Sign in required</Text>
        <Text style={styles.emptyText}>
          Sign in to view your {kind === 'ticket' ? 'ticket bookings' : 'sent parcels'}.
        </Text>
      </View>
    );
  }

  if (isPending) {
    return (
      <View style={styles.emptyContainer} accessibilityRole="summary">
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={styles.emptyText}>Loading history...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyContainer} accessibilityRole="summary">
        <WarningCircle size={48} color={theme.colors.error} weight="duotone" />
        <Text style={styles.emptyTitle}>History unavailable</Text>
        <Text style={styles.emptyText}>{getApiErrorMessage(error)}</Text>
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.emptyContainer} accessibilityRole="summary">
      <Icon size={48} color={theme.colors.textTertiary} weight="thin" />
      <Text style={styles.emptyTitle}>
        No {kind === 'ticket' ? 'ticket bookings' : 'sent parcels'} yet
      </Text>
      <Text style={styles.emptyText}>
        Completed and active {kind === 'ticket' ? 'bookings' : 'parcel requests'} will appear here.
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
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.staleBanner} accessibilityRole="alert">
      <WarningCircle size={18} color={theme.colors.warning} weight="fill" />
      <Text style={styles.staleBannerText}>
        Refresh failed. Showing the most recent saved results.
      </Text>
      <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8}>
        <Text style={styles.staleRetryText}>Retry</Text>
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
  const userId = useAuthStore((state) => state.user?.id);
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

  const handleTicketOpen = useCallback((item: PassengerTicketHistoryItem) => {
    navigation.navigate('Booking', {
      screen: 'DigitalTicket',
      params: {
        source: 'history',
        bookingId: item.id,
        historyItem: item,
      },
    });
  }, [navigation]);

  const handleTrack = useCallback((tripId: string, bookingId: string) => {
    navigation.navigate('Tracking', { tripId, bookingId });
  }, [navigation]);

  const handleParcelOpen = useCallback((parcelId: string) => {
    navigation.navigate('Parcel', {
      screen: 'ParcelDetail',
      params: { parcelId, fromHistory: true },
    });
  }, [navigation]);

  const renderTicket = useCallback(
    ({ item }: ListRenderItemInfo<PassengerTicketHistoryItem>) => (
      <TicketHistoryRow item={item} onOpen={handleTicketOpen} onTrack={handleTrack} />
    ),
    [handleTicketOpen, handleTrack],
  );
  const renderParcel = useCallback(
    ({ item }: ListRenderItemInfo<PassengerParcelHistoryItem>) => (
      <ParcelHistoryRow item={item} onOpen={handleParcelOpen} />
    ),
    [handleParcelOpen],
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
    />
  ), [isTicketError, isTicketPending, refreshTickets, ticketError, userId]);
  const parcelEmpty = useMemo(() => (
    <HistoryEmptyState
      kind="parcel"
      isAuthenticated={Boolean(userId)}
      isPending={isParcelPending}
      error={isParcelError ? parcelError : null}
      onRetry={refreshParcels}
    />
  ), [isParcelError, isParcelPending, parcelError, refreshParcels, userId]);
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
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={handleGoBack}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>{t('profile.history', 'History')}</Text>
        <View style={styles.topBarRightPlaceholder} />
      </View>

      <View style={styles.mainTabs} accessibilityRole="tablist">
        <Pressable
          style={[styles.mainTab, activeTab === 'ticket' ? styles.activeMainTab : null]}
          onPress={showTickets}
          accessibilityRole="tab"
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
            Tickets
          </Text>
        </Pressable>
        <Pressable
          style={[styles.mainTab, activeTab === 'parcel' ? styles.activeMainTab : null]}
          onPress={showParcels}
          accessibilityRole="tab"
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
            Parcels
          </Text>
        </Pressable>
      </View>

      {activeTab === 'ticket' ? (
        <>
          <View style={styles.filterContainer}>
            <TicketFilterChip
              label="All"
              value="ALL"
              selected={ticketFilter === 'ALL'}
              onSelect={setTicketFilter}
            />
            <TicketFilterChip
              label="Confirmed"
              value="CONFIRMED"
              selected={ticketFilter === 'CONFIRMED'}
              onSelect={setTicketFilter}
            />
            <TicketFilterChip
              label="Completed"
              value="COMPLETED"
              selected={ticketFilter === 'COMPLETED'}
              onSelect={setTicketFilter}
            />
            <TicketFilterChip
              label="Cancelled"
              value="CANCELLED"
              selected={ticketFilter === 'CANCELLED'}
              onSelect={setTicketFilter}
            />
          </View>
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
        </>
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
  filterContainer: {
    flexDirection: 'row' as const,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
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
    marginBottom: spacing.xl,
    overflow: 'hidden' as const,
    borderRadius: BR.xl,
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
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: BR.full,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.surfaceAlt,
  },
  activeStatusBadge: { backgroundColor: theme.colors.infoLight },
  completedBadge: { backgroundColor: theme.colors.successLight },
  statusText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
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
  seatSummary: {
    flexShrink: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  ticketFooter: {
    minHeight: 70,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
  ticketCountLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
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
    minHeight: 128,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: BR.xl,
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
    marginTop: spacing.sm,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
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
});
