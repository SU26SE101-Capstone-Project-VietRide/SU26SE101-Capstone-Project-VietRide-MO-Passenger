import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  Pressable,
  StatusBar,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useBookingHistory } from '../../booking/hooks/useBookingHistory';
import type { BookingHistoryItem } from '../../booking/types/booking';
import {
  ArrowLeft,
  Clock,
  CalendarBlank,
  MapPin,
  Ticket,
} from 'phosphor-react-native';

import { getApiErrorMessage } from '@shared/api/errors';
import { borderRadius as BR, fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useTabBarScrollBehavior, useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { formatDate, formatTime, formatVnd } from '@shared/utils/format';

interface BookingHistoryRowProps {
  item: BookingHistoryItem;
}

const BookingHistoryRow = memo(function BookingHistoryRowComponent({
  item,
}: BookingHistoryRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isUpcoming = item.status === 'PENDING' || item.status === 'CONFIRMED';
  const isCompleted = item.status === 'COMPLETED';

  return (
    <View style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <View style={styles.refRow}>
          <Ticket size={18} color={theme.colors.primary} style={styles.ticketIcon} />
          <Text style={styles.refText}>{item.bookingCode}</Text>
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
            {item.status}
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
          <Text style={styles.stationText} numberOfLines={1}>
            {item.originStationName}
          </Text>
          <Text style={styles.stationText} numberOfLines={1}>
            {item.destinationStationName}
          </Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <CalendarBlank size={16} color={theme.colors.textSecondary} style={styles.detailIcon} />
          <Text style={styles.detailValueText}>{formatDate(item.departureDateTime)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Clock size={16} color={theme.colors.textSecondary} style={styles.detailIcon} />
          <Text style={styles.detailValueText}>{formatTime(item.departureDateTime)}</Text>
        </View>
        <View style={[styles.detailItem, styles.routeDetailItem]}>
          <MapPin size={16} color={theme.colors.textSecondary} style={styles.detailIcon} />
          <Text style={[styles.detailValueText, styles.routeDetailText]} numberOfLines={1}>
            {item.originStationName} - {item.destinationStationName}
          </Text>
        </View>
      </View>

      <View style={styles.ticketFooter}>
        <Text style={styles.priceLabel}>{t('booking.totalPrice', 'Total Price')}</Text>
        <Text style={styles.priceValue}>{formatVnd(item.totalAmount)}</Text>
      </View>
    </View>
  );
});

export function BookingHistoryScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleTabBarScroll = useTabBarScrollBehavior();

  const [activeTicketFilter, setActiveTicketFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  const historyQuery = useBookingHistory();
  const tickets = useMemo(() => historyQuery.data ?? [], [historyQuery.data]);

  const filteredTickets = useMemo(() => tickets.filter((ticket) => {
    if (activeTicketFilter === 'upcoming') {
      return ticket.status === 'PENDING' || ticket.status === 'CONFIRMED';
    }
    if (activeTicketFilter === 'past') {
      return ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED';
    }
    return true;
  }), [activeTicketFilter, tickets]);

  const renderTicket = useCallback(
    ({ item }: { item: BookingHistoryItem }) => (
      <BookingHistoryRow item={item} />
    ),
    [],
  );

  const renderEmptyState = useCallback(() => {
    if (historyQuery.isLoading) {
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
          <Pressable
            onPress={() => historyQuery.refetch()}
            style={({ pressed }) => [styles.retryButton, pressed ? styles.pressedCard : null]}
          >
            <Text style={styles.retryText}>{t('common.retry', 'Try again')}</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ticket size={48} color={theme.colors.textTertiary} weight="thin" />
        <Text style={styles.emptyText}>
          {t('profile.noTickets', 'No ticket history found.')}
        </Text>
      </View>
    );
  }, [historyQuery, styles, t, theme.colors.primary, theme.colors.textTertiary]);

  const keyExtractor = useCallback((item: BookingHistoryItem) => item.id, []);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      {/* Navigation Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>
          {t('profile.history', 'History')}
        </Text>
        <View style={styles.topBarRightPlaceholder} />
      </View>

      <View style={styles.filterContainer}>
        {(['all', 'upcoming', 'past'] as const).map((filter) => (
          <Pressable
            key={filter}
            style={[
              styles.filterTab,
              activeTicketFilter === filter ? styles.activeFilterTab : null,
            ]}
            onPress={() => setActiveTicketFilter(filter)}
          >
            <Text
              style={[
                styles.filterLabel,
                activeTicketFilter === filter ? styles.activeFilterLabel : null,
              ]}
            >
              {filter === 'all'
                ? t('common.all', 'All')
                : filter === 'upcoming'
                  ? t('profile.upcoming', 'Upcoming')
                  : t('profile.past', 'Past')}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlashList
        data={filteredTickets}
        renderItem={renderTicket}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onRefresh={historyQuery.refetch}
        refreshing={historyQuery.isRefetching}
        onScroll={handleTabBarScroll}
        scrollEventThrottle={16}
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BR.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  topBarRightPlaceholder: {
    width: 40,
  },
  mainTabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    gap: spacing.md,
  },
  mainTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BR.lg,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    gap: spacing.sm,
  },
  mainTabButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  mainTabText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  mainTabTextActive: {
    color: theme.colors.textInverse,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: BR.full,
    backgroundColor: 'transparent',
  },
  activeFilterTab: {
    backgroundColor: theme.colors.primaryFaded,
  },
  filterLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  activeFilterLabel: {
    color: theme.colors.primary,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 130,
  },
  emptyContainer: {
    paddingVertical: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: theme.colors.textTertiary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 112,
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: BR.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  retryText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
  ticketCard: {
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurface : theme.colors.surface,
    borderRadius: BR.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...theme.effects.cardShadow,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  pressedCard: {
    opacity: 0.84,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketIcon: {
    marginRight: spacing.sm,
  },
  refText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: BR.sm,
  },
  upcomingBadge: {
    backgroundColor: theme.colors.infoLight,
  },
  completedBadge: {
    backgroundColor: theme.colors.successLight,
  },
  statusText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
  },
  upcomingStatusText: {
    color: theme.colors.info,
  },
  completedStatusText: {
    color: theme.colors.success,
  },
  routeContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  timelineDots: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
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
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.error,
  },
  routeTextContainer: {
    flex: 1,
    justifyContent: 'space-between',
    height: 52,
    marginLeft: spacing.sm,
  },
  stationText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: BR.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeDetailItem: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.sm,
  },
  detailIcon: {
    marginRight: spacing.xs,
  },
  detailValueText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
  },
  routeDetailText: {
    flex: 1,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    paddingTop: spacing.md,
  },
  priceLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  priceValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.primary,
  },

  /* Parcel Styles */
  parcelList: {
    gap: spacing.sm,
  },
  parcelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurface : theme.colors.surface,
    borderRadius: 24,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    ...theme.effects.cardShadow,
  },
  parcelIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  parcelInfo: {
    flex: 1,
  },
  parcelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  parcelDestination: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    flex: 1,
    paddingRight: spacing.sm,
  },
  parcelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  parcelBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
  },
  badgeTransit: {
    backgroundColor: theme.colors.successLight,
  },
  textTransit: {
    color: theme.colors.primary,
  },
  badgeDelivered: {
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
  },
  textDelivered: {
    color: theme.colors.textTertiary,
  },
  badgePending: {
    backgroundColor: theme.colors.warningLight,
  },
  textPending: {
    color: theme.colors.warning,
  },
  badgeCancelled: {
    backgroundColor: theme.colors.errorLight,
  },
  textCancelled: {
    color: theme.colors.error,
  },
  parcelMeta: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    lineHeight: 16,
  },
});
