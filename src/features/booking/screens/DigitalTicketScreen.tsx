/** DigitalTicketScreen — Ticket confirmation screen
 *
 * Visual style: matches ParcelDetailScreen (Ticket Box Card layout)
 */

import React, { useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ArrowLeft, MapPin, CheckCircle, QrCode, Coins, CreditCard, Wallet, File } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BookingStackParamList, RootStackParamList } from '@app/navigation/types';
import { useBookingStore } from '../store/useBookingStore';

type NavProp = NativeStackNavigationProp<BookingStackParamList>;
type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

export function DigitalTicketScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const rootNav = useNavigation<RootNavProp>();
  const route = useRoute<RouteProp<BookingStackParamList, 'DigitalTicket'>>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
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

  const handleTracking = useCallback(() => {
    navigation.navigate('Tracking');
  }, [navigation]);

  const getPaymentIcon = () => {
    if (paymentMethod === 'vnpay') return <Coins size={12} color={theme.colors.primary} weight="bold" />;
    if (paymentMethod === 'card') return <CreditCard size={12} color={theme.colors.primary} weight="bold" />;
    return <Wallet size={12} color={theme.colors.primary} weight="bold" />;
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
        <Pressable style={({ pressed }) => [styles.navButton, pressed ? styles.pressed : null]} onPress={isHistory ? () => navigation.goBack() : handleGoHome}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.navTitle}>{isHistory ? 'Ticket Detail' : 'Bus Ticket'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Success Header Status */}
        {!isHistory && (
          <View style={styles.successHeader}>
            <CheckCircle size={56} color={theme.colors.success} weight="fill" />
            <Text style={styles.successTitle}>Booking Successful!</Text>
            <Text style={styles.successSubtitle}>Your ticket is ready. Show this QR to the driver.</Text>
          </View>
        )}

        {/* Ticket Box Card */}
        <View style={styles.ticketCard}>
          {/* Ticket Header QR */}
          <View style={styles.qrSection}>
            <View style={styles.qrContainer}>
              <QrCode size={128} color={theme.colors.textPrimary} weight="light" />
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
            <Pressable
              style={styles.trackButton}
              onPress={() => rootNav.navigate('Main', { screen: 'BookingHistory', params: { initialTab: 'ticket' } })}
            >
              <File size={18} color={theme.colors.textInverse} weight="bold" />
              <Text style={styles.trackButtonText}>View My Bookings</Text>
            </Pressable>

            <Pressable
              style={[styles.trackButton, styles.trackingButton]}
              onPress={handleTracking}
            >
              <MapPin size={18} color={theme.colors.primary} weight="bold" />
              <Text style={styles.trackingButtonText}>Tracking</Text>
            </Pressable>

            <Pressable style={styles.homeButton} onPress={handleGoHome}>
              <Text style={styles.homeButtonText}>Back to Dashboard</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              style={styles.trackButton}
              onPress={handleTracking}
            >
              <MapPin size={18} color={theme.colors.textInverse} weight="bold" />
              <Text style={styles.trackButtonText}>Tracking</Text>
            </Pressable>

            <Pressable style={styles.homeButton} onPress={() => navigation.goBack()}>
              <Text style={styles.homeButtonText}>Go Back</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  navTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
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
    color: theme.colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  successSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  ticketCard: {
    ...theme.components.elevatedCard,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
    borderRadius: BR.xl,
    overflow: 'visible',
    marginBottom: spacing.xxl,
  },
  qrSection: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  qrContainer: {
    padding: spacing.md,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderRadius: BR.lg,
    marginBottom: spacing.md,
  },
  qrCaption: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  ticketIdText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  dashedDivider: {
    height: 2,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
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
    backgroundColor: theme.colors.background,
    borderRightWidth: 1,
    borderRightColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  sideCutoutRight: {
    position: 'absolute',
    right: -10,
    top: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.background,
    borderLeftWidth: 1,
    borderLeftColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
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
    color: theme.colors.textTertiary,
    marginBottom: 4,
  },
  routeName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  routeCity: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
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
    color: theme.colors.textTertiary,
    marginBottom: 4,
  },
  specValue: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
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
    borderTopColor: theme.colors.divider,
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
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.components.primaryButton,
    borderRadius: BR.md,
    height: 48,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  trackingButton: {
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
  },
  trackButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textInverse,
  },
  trackingButtonText: {
    color: theme.colors.primary,
  },
  homeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderRadius: BR.md,
    height: 48,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  homeButtonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
});
