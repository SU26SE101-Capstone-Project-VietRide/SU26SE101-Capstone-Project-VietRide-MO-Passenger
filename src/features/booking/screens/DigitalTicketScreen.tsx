/** DigitalTicketScreen — Ticket confirmation screen
 *
 * Visual style: matches ParcelDetailScreen (Ticket Box Card layout)
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CheckCircle, QrCode, ArrowLeft, House, MagnifyingGlass, Wallet, Coins, CreditCard } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BookingStackParamList, RootStackParamList } from '@app/navigation/types';
import { useBookingStore } from '../store/useBookingStore';

type NavProp = NativeStackNavigationProp<BookingStackParamList>;
type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

export function DigitalTicketScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const rootNav = useNavigation<RootNavProp>();
  const route = useRoute<RouteProp<BookingStackParamList, 'DigitalTicket'>>();
  const isHistory = route.params?.fromHistory;
  const ticketRef = route.params?.bookingRef || `B-${Math.floor(Math.random() * 1000000)}`;

  const {
    selectedTrip,
    selectedSeats,
    totalPrice,
    paymentMethod,
    selectedPickUp,
    selectedDropOff,
  } = useBookingStore();

  const handleGoHome = () => {
    rootNav.navigate('Main', { screen: 'Home' });
  };

  const getPaymentIcon = () => {
    if (paymentMethod === 'vnpay') return <Coins size={12} color={colors.primary} weight="bold" />;
    if (paymentMethod === 'card') return <CreditCard size={12} color={colors.primary} weight="bold" />;
    return <Wallet size={12} color={colors.primary} weight="bold" />;
  };

  const getPaymentLabel = () => {
    if (paymentMethod === 'vnpay') return 'VNPAY / Momo';
    if (paymentMethod === 'card') return 'Credit / Debit Card';
    return 'VietRide Wallet';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navButton} onPress={isHistory ? () => navigation.goBack() : handleGoHome} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{isHistory ? 'Ticket Detail' : 'Bus Ticket'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Success Header Status */}
        {!isHistory && (
          <View style={styles.successHeader}>
            <CheckCircle size={56} color={colors.success} weight="fill" />
            <Text style={styles.successTitle}>Booking Successful!</Text>
            <Text style={styles.successSubtitle}>Your ticket is ready. Show this QR to the driver.</Text>
          </View>
        )}

        {/* Ticket Box Card */}
        <View style={styles.ticketCard}>
          {/* Ticket Header QR */}
          <View style={styles.qrSection}>
            <View style={styles.qrContainer}>
              <QrCode size={128} color={colors.textPrimary} weight="light" />
            </View>
            <Text style={styles.qrCaption}>Scan this QR at the bus door</Text>
            <Text style={styles.ticketIdText}>Ticket Ref: {ticketRef}</Text>
          </View>

          <View style={styles.dashedDivider}>
            <View style={styles.sideCutoutLeft} />
            <View style={styles.sideCutoutRight} />
          </View>

          {/* Ticket Specs */}
          <View style={styles.detailsSection}>
            <View style={styles.routeRow}>
              <View style={styles.routeItem}>
                <Text style={styles.routeLabel}>BOARDING ({selectedPickUp?.time || ''})</Text>
                <Text style={styles.routeName}>{selectedPickUp?.name || 'Pick-up Point'}</Text>
                <Text style={styles.routeCity}>{selectedPickUp?.address || ''}</Text>
              </View>
              <View style={styles.routeItem}>
                <Text style={[styles.routeLabel, { textAlign: 'right' }]}>ALIGHTING ({selectedDropOff?.time || ''})</Text>
                <Text style={[styles.routeName, { textAlign: 'right' }]}>{selectedDropOff?.name || 'Drop-off Point'}</Text>
                <Text style={[styles.routeCity, { textAlign: 'right' }]}>{selectedDropOff?.address || ''}</Text>
              </View>
            </View>

            <View style={styles.specsGrid}>
              <View style={styles.gridItem}>
                <Text style={styles.specLabel}>BUS TYPE</Text>
                <Text style={styles.specValue}>{selectedTrip?.busType || 'Standard'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.specLabel}>SEATS</Text>
                <Text style={styles.specValue}>{selectedSeats.map(s => s.label).join(', ')}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.specLabel}>PASSENGERS</Text>
                <Text style={styles.specValue}>{selectedSeats.length} Adults</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.specLabel}>PAYMENT METHOD</Text>
                <View style={styles.paymentMethodLabel}>
                  {getPaymentIcon()}
                  <Text style={styles.specValue}>{getPaymentLabel()}</Text>
                </View>
              </View>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Amount Paid</Text>
              <Text style={styles.totalValue}>₫{totalPrice().toLocaleString('vi-VN')}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {!isHistory ? (
          <>
            <TouchableOpacity 
              style={styles.trackButton} 
              onPress={() => rootNav.navigate('Main', { screen: 'BookingHistory', params: { initialTab: 'ticket' } })} 
              activeOpacity={0.85}
            >
              <MagnifyingGlass size={18} color={colors.textInverse} weight="bold" />
              <Text style={styles.trackButtonText}>View My Bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.homeButton} onPress={handleGoHome} activeOpacity={0.8}>
              <Text style={styles.homeButtonText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.trackButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.trackButtonText}>Go Back</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
  },
  navTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.huge,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  successTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  successSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  ticketCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'visible',
    marginBottom: spacing.xxl,
  },
  qrSection: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  qrContainer: {
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  qrCaption: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  ticketIdText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  dashedDivider: {
    height: 2,
    borderWidth: 1,
    borderColor: colors.divider,
    borderStyle: 'dashed',
    position: 'relative',
    marginVertical: spacing.sm,
  },
  sideCutoutLeft: {
    position: 'absolute',
    left: -10,
    top: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.divider,
  },
  sideCutoutRight: {
    position: 'absolute',
    right: -10,
    top: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.background,
    borderLeftWidth: 1,
    borderLeftColor: colors.divider,
  },
  detailsSection: {
    padding: spacing.xl,
  },
  routeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  routeItem: {
    flex: 1,
  },
  routeLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  routeName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  routeCity: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xl,
  },
  gridItem: {
    width: '50%',
    marginBottom: spacing.md,
  },
  specLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  specValue: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: colors.textPrimary,
  },
  paymentMethodLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  totalLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  totalValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.primary,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 48,
    gap: spacing.sm,
    ...shadows.sm,
    marginBottom: spacing.sm,
  },
  trackButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textInverse,
  },
  homeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    height: 48,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  homeButtonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
});
