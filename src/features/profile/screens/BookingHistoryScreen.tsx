import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
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

import { colors, fontFamilies, fontSizes, spacing, shadows } from '@shared/theme';

// Local border radius fallback
const BR = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

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

interface ShipmentItem {
  id: string;
  destination: string;
  status: 'In Transit' | 'Delivered' | 'Pending' | 'Cancelled';
  date: string;
}

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

const MOCK_SHIPMENTS: ShipmentItem[] = [
  {
    id: 'VR-8829',
    destination: 'Da Lat',
    status: 'In Transit',
    date: 'Expected: tomorrow',
  },
  {
    id: 'VR-7741',
    destination: 'Ho Chi Minh City',
    status: 'Delivered',
    date: 'Oct 24, 2023',
  },
  {
    id: 'VR-9102',
    destination: 'Hanoi',
    status: 'Pending',
    date: 'Oct 28, 2023',
  },
  {
    id: 'VR-5512',
    destination: 'Da Nang',
    status: 'Cancelled',
    date: 'Oct 15, 2023',
  },
];

type BookingHistoryRouteProp = RouteProp<{
  params: { initialTab?: 'ticket' | 'parcel' };
}, 'params'>;

export function BookingHistoryScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<BookingHistoryRouteProp>();

  const [activeMainTab, setActiveMainTab] = useState<'ticket' | 'parcel'>('ticket');
  const [activeTicketFilter, setActiveTicketFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveMainTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  const filteredTickets = mockTickets.filter((ticket) => {
    if (activeTicketFilter === 'upcoming') return ticket.status === 'upcoming';
    if (activeTicketFilter === 'past') return ticket.status === 'completed' || ticket.status === 'cancelled';
    return true;
  });

  const renderParcelStatusBadge = (status: ShipmentItem['status']) => {
    switch (status) {
      case 'In Transit':
        return (
          <View style={[styles.parcelBadge, styles.badgeTransit]}>
            <Text style={[styles.parcelBadgeText, styles.textTransit]}>In Transit</Text>
          </View>
        );
      case 'Delivered':
        return (
          <View style={[styles.parcelBadge, styles.badgeDelivered]}>
            <Text style={[styles.parcelBadgeText, styles.textDelivered]}>Delivered</Text>
          </View>
        );
      case 'Pending':
        return (
          <View style={[styles.parcelBadge, styles.badgePending]}>
            <Text style={[styles.parcelBadgeText, styles.textPending]}>Pending</Text>
          </View>
        );
      case 'Cancelled':
        return (
          <View style={[styles.parcelBadge, styles.badgeCancelled]}>
            <Text style={[styles.parcelBadgeText, styles.textCancelled]}>Cancelled</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const renderParcelStatusIcon = (status: ShipmentItem['status']) => {
    switch (status) {
      case 'In Transit':
        return <Truck size={24} color={colors.primary} weight="bold" />;
      case 'Delivered':
        return <Check size={20} color={colors.textTertiary} weight="bold" />;
      case 'Pending':
        return <Clock size={22} color="#B45309" weight="bold" />;
      case 'Cancelled':
        return <XCircle size={22} color={colors.error} weight="bold" />;
      default:
        return null;
    }
  };

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
          {t('profile.history', 'History')}
        </Text>
        <View style={styles.topBarRightPlaceholder} />
      </View>

      {/* Main Tabs (Ticket vs Parcel) */}
      <View style={styles.mainTabContainer}>
        <TouchableOpacity
          style={[styles.mainTabButton, activeMainTab === 'ticket' && styles.mainTabButtonActive]}
          onPress={() => setActiveMainTab('ticket')}
          activeOpacity={0.8}
        >
          <Ticket size={20} color={activeMainTab === 'ticket' ? '#fff' : colors.textSecondary} weight={activeMainTab === 'ticket' ? 'fill' : 'regular'} />
          <Text style={[styles.mainTabText, activeMainTab === 'ticket' && styles.mainTabTextActive]}>
            Tickets
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainTabButton, activeMainTab === 'parcel' && styles.mainTabButtonActive]}
          onPress={() => setActiveMainTab('parcel')}
          activeOpacity={0.8}
        >
          <Package size={20} color={activeMainTab === 'parcel' ? '#fff' : colors.textSecondary} weight={activeMainTab === 'parcel' ? 'fill' : 'regular'} />
          <Text style={[styles.mainTabText, activeMainTab === 'parcel' && styles.mainTabTextActive]}>
            Parcels
          </Text>
        </TouchableOpacity>
      </View>

      {activeMainTab === 'ticket' && (
        <View style={styles.filterContainer}>
          {(['all', 'upcoming', 'past'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                activeTicketFilter === filter && styles.activeFilterTab,
              ]}
              onPress={() => setActiveTicketFilter(filter)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterLabel,
                  activeTicketFilter === filter && styles.activeFilterLabel,
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
      )}

      {/* Scroll List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeMainTab === 'ticket' ? (
          filteredTickets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ticket size={48} color={colors.textTertiary} weight="thin" />
              <Text style={styles.emptyText}>
                {t('profile.noTickets', 'No ticket history found.')}
              </Text>
            </View>
          ) : (
            filteredTickets.map((ticket) => (
              <TouchableOpacity
                key={ticket.id}
                style={styles.ticketCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Booking', { screen: 'DigitalTicket', params: { bookingRef: ticket.bookingRef, fromHistory: true } })}
              >
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
              </TouchableOpacity>
            ))
          )
        ) : (
          /* Parcel List Rendering */
          MOCK_SHIPMENTS.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Package size={48} color={colors.textTertiary} weight="thin" />
              <Text style={styles.emptyText}>No shipment history found.</Text>
            </View>
          ) : (
            <View style={styles.parcelList}>
              {MOCK_SHIPMENTS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.parcelCard}
                  onPress={() => navigation.navigate('Parcel', { screen: 'ParcelDetail', params: { parcelId: item.id, fromHistory: true } })}
                  activeOpacity={0.8}
                >
                  <View style={styles.parcelIconContainer}>
                    {renderParcelStatusIcon(item.status)}
                  </View>
                  <View style={styles.parcelInfo}>
                    <View style={styles.parcelRow}>
                      <Text style={styles.parcelDestination} numberOfLines={1}>
                        To: {item.destination}
                      </Text>
                      {renderParcelStatusBadge(item.status)}
                    </View>
                    <Text style={styles.parcelMeta}>
                      Order #{item.id} • {item.date}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )
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
    backgroundColor: colors.surface,
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
    color: colors.textPrimary,
  },
  topBarRightPlaceholder: {
    width: 40,
  },
  mainTabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.md,
  },
  mainTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BR.lg,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.sm,
  },
  mainTabButtonActive: {
    backgroundColor: colors.primary,
  },
  mainTabText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  mainTabTextActive: {
    color: colors.textInverse,
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
    borderRadius: BR.full,
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
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
  ticketCard: {
    backgroundColor: colors.surface,
    borderRadius: BR.lg,
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
    borderRadius: BR.sm,
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
    borderRadius: BR.md,
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

  /* Parcel Styles */
  parcelList: {
    gap: spacing.sm,
  },
  parcelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadows.sm,
  },
  parcelIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
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
    color: colors.textPrimary,
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
    backgroundColor: colors.successLight,
  },
  textTransit: {
    color: colors.primary,
  },
  badgeDelivered: {
    backgroundColor: colors.surfaceAlt,
  },
  textDelivered: {
    color: colors.textTertiary,
  },
  badgePending: {
    backgroundColor: colors.warningLight,
  },
  textPending: {
    color: '#B45309',
  },
  badgeCancelled: {
    backgroundColor: colors.errorLight,
  },
  textCancelled: {
    color: colors.error,
  },
  parcelMeta: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    lineHeight: 16,
  },
});
