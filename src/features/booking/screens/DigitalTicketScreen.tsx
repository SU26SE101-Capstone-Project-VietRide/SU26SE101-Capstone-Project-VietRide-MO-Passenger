/** DigitalTicketScreen — Ticket confirmation screen
 *
 * Visual style: matches ParcelDetailScreen (Ticket Box Card layout)
 */

import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, CheckCircle, Coins, Wallet, File, Ticket } from 'phosphor-react-native';
import { useShallow } from 'zustand/react/shallow';
import { borderRadius as BR, fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { formatVnd } from '@shared/utils/format';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigation/types';
import { useBookingStore } from '../store/useBookingStore';
import { getBookingReference } from '../utils/bookingReference';

type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

export function DigitalTicketScreen(): React.JSX.Element {
  const rootNav = useNavigation<RootNavProp>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const {
    selectedTrip,
    paymentMethod,
    selectedPickUp,
    selectedDropOff,
    outboundState,
    searchParams,
    bookingResult,
  } = useBookingStore(useShallow((state) => ({
    selectedTrip: state.selectedTrip,
    paymentMethod: state.paymentMethod,
    selectedPickUp: state.selectedPickUp,
    selectedDropOff: state.selectedDropOff,
    outboundState: state.outboundState,
    searchParams: state.searchParams,
    bookingResult: state.bookingResult,
  })));

  const ticketRef = getBookingReference(bookingResult);

  const displayTrip = searchParams.isRoundTrip
    ? outboundState?.trip ?? selectedTrip
    : selectedTrip;
  const displayPickUp = searchParams.isRoundTrip
    ? outboundState?.pickUp ?? selectedPickUp
    : selectedPickUp;
  const displayDropOff = searchParams.isRoundTrip
    ? outboundState?.dropOff ?? selectedDropOff
    : selectedDropOff;
  const tickets = bookingResult
    ? ('bookingGroupId' in bookingResult
      ? [...bookingResult.outbound.tickets, ...bookingResult.return.tickets]
      : bookingResult.tickets)
    : [];
  const seatNumbers = tickets
    .map((ticket) => ticket.seatNumber.trim())
    .filter(Boolean)
    .join(', ');
  const resultTotal = bookingResult
    ? ('bookingGroupId' in bookingResult ? bookingResult.grandTotal : bookingResult.totalAmount)
    : 0;
  const isPendingPayment = bookingResult
    ? Boolean(bookingResult.paymentRedirectUrl)
      || (!('bookingGroupId' in bookingResult) && bookingResult.status === 'PENDING_PAYMENT')
    : false;

  const handleGoHome = () => {
    rootNav.navigate('Main', { screen: 'Home' });
  };

  const getPaymentIcon = () => {
    if (paymentMethod === 'wallet') {
      return <Wallet size={12} color={theme.colors.primary} weight="bold" />;
    }

    return <Coins size={12} color={theme.colors.primary} weight="bold" />;
  };

  const getPaymentLabel = () => {
    return paymentMethod === 'wallet' ? 'VietRide Wallet' : 'VNPAY';
  };

  if (!bookingResult || !ticketRef) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.navbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to dashboard"
            style={({ pressed }) => [styles.navButton, pressed ? styles.pressed : null]}
            onPress={handleGoHome}
          >
            <ArrowLeft size={22} color={theme.colors.textPrimary} />
          </Pressable>
          <Text style={styles.navTitle}>Booking Confirmation</Text>
          <View style={styles.navSpacer} />
        </View>

        <View style={styles.unavailableContainer}>
          <Ticket size={52} color={theme.colors.textTertiary} weight="thin" />
          <Text style={styles.unavailableTitle}>Ticket details unavailable</Text>
          <Text style={styles.unavailableMessage}>
            This confirmation is no longer available in the current session. View your bookings
            for the latest status.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.trackButton, pressed ? styles.pressed : null]}
            onPress={() => rootNav.navigate('Main', {
              screen: 'BookingHistory',
              params: { initialTab: 'ticket' },
            })}
          >
            <File size={18} color={theme.colors.textInverse} weight="bold" />
            <Text style={styles.trackButtonText}>View My Bookings</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.navbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to dashboard"
          style={({ pressed }) => [styles.navButton, pressed ? styles.pressed : null]}
          onPress={handleGoHome}
        >
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.navTitle}>Booking Confirmation</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Success Header Status */}
        <View style={styles.successHeader}>
          <CheckCircle
            size={56}
            color={isPendingPayment ? theme.colors.primary : theme.colors.success}
            weight="fill"
          />
          <Text style={styles.successTitle}>
            {isPendingPayment ? 'Payment Pending' : 'Booking Created'}
          </Text>
          <Text style={styles.successSubtitle}>
            {isPendingPayment
              ? 'Complete payment to activate your ticket.'
              : 'Your booking has been recorded successfully.'}
          </Text>
        </View>

        {/* Ticket Box Card */}
        <View style={styles.ticketCard}>
          {/* API-issued booking reference */}
          <View style={styles.referenceSection}>
            <View style={styles.referenceIconContainer}>
              <Ticket size={64} color={theme.colors.primary} weight="duotone" />
            </View>
            <Text style={styles.referenceCaption}>Booking reference</Text>
            <Text style={styles.ticketIdText}>Booking Ref: {ticketRef}</Text>
          </View>

          <View style={styles.dashedDivider}>
            <View style={styles.sideCutoutLeft} />
            <View style={styles.sideCutoutRight} />
          </View>

          {/* Ticket Specs */}
          <View style={styles.detailsSection}>
            <View style={styles.routeRow}>
              <View style={styles.routeItem}>
                <Text style={styles.routeLabel}>BOARDING ({displayPickUp?.time || ''})</Text>
                <Text style={styles.routeName}>{displayPickUp?.name || '—'}</Text>
                <Text style={styles.routeCity}>{displayPickUp?.address || ''}</Text>
              </View>
              <View style={styles.routeItem}>
                <Text style={[styles.routeLabel, styles.alignRight]}>ALIGHTING ({displayDropOff?.time || ''})</Text>
                <Text style={[styles.routeName, styles.alignRight]}>{displayDropOff?.name || '—'}</Text>
                <Text style={[styles.routeCity, styles.alignRight]}>{displayDropOff?.address || ''}</Text>
              </View>
            </View>

            <View style={styles.specsGrid}>
              <View style={styles.gridItem}>
                <Text style={styles.specLabel}>BUS TYPE</Text>
                <Text style={styles.specValue}>{displayTrip?.busType || '—'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.specLabel}>SEATS</Text>
                <Text style={styles.specValue}>{seatNumbers || '—'}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.specLabel}>TICKETS</Text>
                <Text style={styles.specValue}>{tickets.length}</Text>
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
              <Text style={styles.totalLabel}>{isPendingPayment ? 'Amount Due' : 'Total Amount'}</Text>
              <Text style={styles.totalValue}>
                {formatVnd(resultTotal, { display: 'code', clampNegative: true })}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <Pressable
          style={({ pressed }) => [styles.trackButton, pressed ? styles.pressed : null]}
          onPress={() => rootNav.navigate('Main', {
            screen: 'BookingHistory',
            params: { initialTab: 'ticket' },
          })}
        >
          <File size={18} color={theme.colors.textInverse} weight="bold" />
          <Text style={styles.trackButtonText}>View My Bookings</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.homeButton, pressed ? styles.pressed : null]}
          onPress={handleGoHome}
        >
          <Text style={styles.homeButtonText}>Back to Dashboard</Text>
        </Pressable>
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
  navSpacer: {
    width: 36,
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
  referenceSection: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  referenceIconContainer: {
    padding: spacing.md,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderRadius: BR.lg,
    marginBottom: spacing.md,
  },
  referenceCaption: {
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
  alignRight: {
    textAlign: 'right',
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
  trackButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textInverse,
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
  unavailableContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
  },
  unavailableTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.textPrimary,
    marginTop: spacing.lg,
  },
  unavailableMessage: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 21,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
});
