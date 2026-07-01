import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useBookingHistory } from '../../booking/hooks/useBookingHistory';
import type { BookingHistoryItem } from '../../booking/types/booking';
import {
  ArrowLeft,
  Clock,
  CalendarBlank,
  MapPin,
  Ticket,
  Truck,
  Check,
  XCircle,
  Package,
} from 'phosphor-react-native';

import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useTabBarScrollBehavior, useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

// Local border radius fallback
const BR = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;



type BookingHistoryRouteProp = RouteProp<{
  params: { initialTab?: 'ticket' | 'parcel' };
}, 'params'>;

export function BookingHistoryScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<BookingHistoryRouteProp>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleTabBarScroll = useTabBarScrollBehavior();

  const [activeTicketFilter, setActiveTicketFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  const { data: tickets = [], isLoading, error } = useBookingHistory();

  const filteredTickets = tickets.filter((ticket) => {
    if (activeTicketFilter === 'upcoming') return ticket.status === 'PENDING' || ticket.status === 'CONFIRMED';
    if (activeTicketFilter === 'past') return ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED';
    return true;
  });



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

      {/* Scroll List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleTabBarScroll}
        scrollEventThrottle={16}
      >
        {isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : filteredTickets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ticket size={48} color={theme.colors.textTertiary} weight="thin" />
              <Text style={styles.emptyText}>
                {t('profile.noTickets', 'No ticket history found.')}
              </Text>
            </View>
          ) : (
            filteredTickets.map((ticket) => {
              const dt = ticket.departureDateTime || '';
              const date = dt.split('T')[0] || '';
              const time = dt.split('T')[1]?.substring(0, 5) || '';
              const isUpcoming = ticket.status === 'PENDING' || ticket.status === 'CONFIRMED';
              const isCompleted = ticket.status === 'COMPLETED';

              return (
              <Pressable
                key={ticket.id}
                style={styles.ticketCard}
                onPress={() => navigation.navigate('Booking', { screen: 'DigitalTicket', params: { bookingRef: ticket.bookingCode, fromHistory: true } })}
              >
                {/* Card Header */}
                <View style={styles.ticketHeader}>
                  <View style={styles.refRow}>
                    <Ticket size={18} color={theme.colors.primary} style={styles.ticketIcon} />
                    <Text style={styles.refText}>{ticket.bookingCode}</Text>
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
                      {ticket.status}
                    </Text>
                  </View>
                </View>

                {/* Station Trip timeline */}
                <View style={styles.routeContainer}>
                  <View style={styles.timelineDots}>
                    <View style={styles.greenDot} />
                    <View style={styles.timelineLine} />
                    <View style={styles.redDot} />
                  </View>
                  <View style={styles.routeTextContainer}>
                    <Text style={styles.stationText} numberOfLines={1}>
                      {ticket.originStationName}
                    </Text>
                    <Text style={styles.stationText} numberOfLines={1}>
                      {ticket.destinationStationName}
                    </Text>
                  </View>
                </View>

                {/* Details Row */}
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <CalendarBlank size={16} color={theme.colors.textSecondary} style={styles.detailIcon} />
                    <Text style={styles.detailValueText}>{date}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Clock size={16} color={theme.colors.textSecondary} style={styles.detailIcon} />
                    <Text style={styles.detailValueText}>{time}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <MapPin size={16} color={theme.colors.textSecondary} style={styles.detailIcon} />
                    <Text style={styles.detailValueText} numberOfLines={1}>{ticket.originStationName} - {ticket.destinationStationName}</Text>
                  </View>
                </View>

                {/* Card Footer */}
                <View style={styles.ticketFooter}>
                  <Text style={styles.priceLabel}>{t('booking.totalPrice', 'Total Price')}</Text>
                  <Text style={styles.priceValue}>{ticket.totalAmount.toLocaleString()}đ</Text>
                </View>
              </Pressable>
            );
            })
          )}
      </ScrollView>
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
  detailIcon: {
    marginRight: spacing.xs,
  },
  detailValueText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
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
