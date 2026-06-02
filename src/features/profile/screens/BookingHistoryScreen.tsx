import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Clock, CalendarBlank, MapPin, Ticket } from 'phosphor-react-native';

import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

interface MockTicket {
  id: string;
  bookingRef: string;
  departure: string;
  destination: string;
  date: string;
  time: string;
  price: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  seatNumber: string;
}

export function BookingHistoryScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [activeFilter, setActiveFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  const mockTickets: MockTicket[] = [
    {
      id: '1',
      bookingRef: 'VR-88291',
      departure: 'Hồ Chí Minh (Bến xe Miền Đông)',
      destination: 'Đà Lạt (Bến xe Liên Tỉnh)',
      date: '05/06/2026',
      time: '08:00 AM',
      price: '280,000đ',
      status: 'upcoming',
      seatNumber: 'A03',
    },
    {
      id: '2',
      bookingRef: 'VR-42110',
      departure: 'Hồ Chí Minh (Văn phòng Quận 1)',
      destination: 'Nha Trang (Văn phòng Diên Khánh)',
      date: '28/05/2026',
      time: '10:30 PM',
      price: '350,000đ',
      status: 'completed',
      seatNumber: 'B08',
    },
    {
      id: '3',
      bookingRef: 'VR-19283',
      departure: 'Đà Nẵng (Bến xe Trung Tâm)',
      destination: 'Huế (Bến xe Phía Nam)',
      date: '12/04/2026',
      time: '02:00 PM',
      price: '150,000đ',
      status: 'completed',
      seatNumber: 'A01',
    },
  ];

  const filteredTickets = mockTickets.filter((ticket) => {
    if (activeFilter === 'upcoming') return ticket.status === 'upcoming';
    if (activeFilter === 'past') return ticket.status === 'completed' || ticket.status === 'cancelled';
    return true;
  });

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Navigation Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          {t('profile.bookingHistory', 'Booking History')}
        </Text>
        <View style={styles.topBarRightPlaceholder} />
      </View>

      {/* Segmented Filter Switch */}
      <View style={styles.filterContainer}>
        {(['all', 'upcoming', 'past'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              activeFilter === filter && styles.activeFilterTab,
            ]}
            onPress={() => setActiveFilter(filter)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterLabel,
                activeFilter === filter && styles.activeFilterLabel,
              ]}
            >
              {filter === 'all'
                ? t('common.all', 'All')
                : filter === 'upcoming'
                ? t('profile.upcoming', 'Upcoming')
                : t('profile.past', 'Past')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tickets Scroll List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filteredTickets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ticket size={48} color={colors.textTertiary} weight="thin" />
            <Text style={styles.emptyText}>
              {t('profile.noTickets', 'No ticket history found.')}
            </Text>
          </View>
        ) : (
          filteredTickets.map((ticket) => (
            <View key={ticket.id} style={styles.ticketCard}>
              {/* Card Header */}
              <View style={styles.ticketHeader}>
                <View style={styles.refRow}>
                  <Ticket size={18} color={colors.primary} style={styles.ticketIcon} />
                  <Text style={styles.refText}>{ticket.bookingRef}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    ticket.status === 'upcoming' && styles.upcomingBadge,
                    ticket.status === 'completed' && styles.completedBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      ticket.status === 'upcoming' && styles.upcomingStatusText,
                      ticket.status === 'completed' && styles.completedStatusText,
                    ]}
                  >
                    {ticket.status === 'upcoming'
                      ? t('profile.upcoming', 'Upcoming')
                      : t('profile.completed', 'Completed')}
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
                    {ticket.departure}
                  </Text>
                  <Text style={styles.stationText} numberOfLines={1}>
                    {ticket.destination}
                  </Text>
                </View>
              </View>

              {/* Details Row */}
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <CalendarBlank size={16} color={colors.textSecondary} style={styles.detailIcon} />
                  <Text style={styles.detailValueText}>{ticket.date}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Clock size={16} color={colors.textSecondary} style={styles.detailIcon} />
                  <Text style={styles.detailValueText}>{ticket.time}</Text>
                </View>
                <View style={styles.detailItem}>
                  <MapPin size={16} color={colors.textSecondary} style={styles.detailIcon} />
                  <Text style={styles.detailValueText}>Seat {ticket.seatNumber}</Text>
                </View>
              </View>

              {/* Card Footer */}
              <View style={styles.ticketFooter}>
                <Text style={styles.priceLabel}>{t('booking.totalPrice', 'Total Price')}</Text>
                <Text style={styles.priceValue}>{ticket.price}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
  },
  topBarRightPlaceholder: {
    width: 40,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: colors.transparent,
  },
  activeFilterTab: {
    backgroundColor: colors.primaryFaded,
  },
  filterLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  activeFilterLabel: {
    color: colors.primary,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    paddingVertical: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
  ticketCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.divider,
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
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  upcomingBadge: {
    backgroundColor: colors.infoLight,
  },
  completedBadge: {
    backgroundColor: colors.successLight,
  },
  statusText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
  },
  upcomingStatusText: {
    color: colors.info,
  },
  completedStatusText: {
    color: colors.success,
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
    backgroundColor: colors.success,
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
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
    color: colors.textPrimary,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
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
    color: colors.textPrimary,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
  },
  priceLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  priceValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.primary,
  },
});
