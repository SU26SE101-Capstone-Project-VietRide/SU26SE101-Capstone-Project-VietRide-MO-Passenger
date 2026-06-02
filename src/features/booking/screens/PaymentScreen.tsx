/**
 * PaymentScreen — Trip summary + payment method + promo code
 *
 * Final step before payment: shows trip summary, payment method
 * selection (VNPAY/Card), promo code hint, and "Pay Now" CTA.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import { FloatingActionBar } from '../components/FloatingActionBar';
import type { BookingStackParamList } from '@app/navigation/types';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'Payment'>;

export function PaymentScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const {
    selectedTrip,
    selectedSeats,
    totalPrice,
    paymentMethod,
    setPaymentMethod,
  } = useBookingStore();

  const [timer, setTimer] = useState(599);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatPrice = (price: number) => {
    return `${price.toLocaleString('vi-VN')}đ`;
  };

  const handlePayNow = useCallback(() => {
    // Navigate to Digital Ticket (reusing BookingConfirmation slot)
    // In real app this would go through payment gateway first
    navigation.reset({
      index: 0,
      routes: [{ name: 'SearchRoutes' }],
    });
    // For demo, navigate to Digital Ticket by pushing a new screen
    // We'll use the BookingConfirmation param for the ticket screen
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FF" />
      <View style={styles.ambientGlow} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.timerPill}>
          <Text style={styles.timerIcon}>⏱️</Text>
          <Text style={styles.timerText}>{formatTimer(timer)}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Trip Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trip Summary</Text>

          {/* Route info */}
          <View style={styles.tripRouteRow}>
            <View style={styles.tripRouteIcon}>
              <Text style={styles.tripRouteEmoji}>🚌</Text>
            </View>
            <View style={styles.tripRouteInfo}>
              <View style={styles.tripCityRow}>
                <Text style={styles.tripCity}>
                  {selectedTrip?.departureCity || 'HCM'}
                </Text>
                <Text style={styles.tripArrow}> → </Text>
                <Text style={styles.tripCity}>
                  {selectedTrip?.arrivalCity || 'Da Lat'}
                </Text>
              </View>
              <Text style={styles.tripDateTime}>
                Oct 24 • {selectedTrip?.departureTime || '22:30'} PM -{' '}
                {selectedTrip?.arrivalTime || '05:00'} AM
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Passengers */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Passenger ({selectedSeats.length}x)
            </Text>
            <Text style={styles.summaryValue}>
              {selectedSeats.map((s) => s.label).join(', ')}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Total */}
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Price</Text>
            <Text style={styles.totalValue}>
              {formatPrice(totalPrice())}
            </Text>
          </View>
        </View>

        {/* Payment Method Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Method</Text>

          {/* VNPAY Option */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setPaymentMethod('vnpay')}
            style={[
              styles.paymentOption,
              paymentMethod === 'vnpay' && styles.paymentOptionActive,
            ]}
          >
            <View
              style={[
                styles.radio,
                paymentMethod === 'vnpay' && styles.radioSelected,
              ]}
            >
              {paymentMethod === 'vnpay' && <View style={styles.radioDot} />}
            </View>
            <View style={styles.paymentIcon}>
              <Text style={styles.paymentEmoji}>💳</Text>
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentName}>VNPAY / Momo</Text>
              <Text style={styles.paymentDesc}>Scan QR to pay</Text>
            </View>
          </TouchableOpacity>

          {/* Credit Card Option */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setPaymentMethod('card')}
            style={[
              styles.paymentOption,
              paymentMethod === 'card' && styles.paymentOptionActive,
            ]}
          >
            <View
              style={[
                styles.radio,
                paymentMethod === 'card' && styles.radioSelected,
              ]}
            >
              {paymentMethod === 'card' && <View style={styles.radioDot} />}
            </View>
            <View style={styles.paymentIcon}>
              <Text style={styles.paymentEmoji}>💳</Text>
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentName}>Credit / Debit Card</Text>
              <Text style={styles.paymentDesc}>Visa, Mastercard, JCB</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Promo Code Card */}
        <View style={styles.promoCard}>
          <View style={styles.promoIconContainer}>
            <Text style={styles.promoEmoji}>🎟️</Text>
          </View>
          <View style={styles.promoInfo}>
            <Text style={styles.promoTitle}>ENTER PROMO CODE</Text>
            <Text style={styles.promoHint}>Min Spend 300,000đ required</Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedSeats={selectedSeats}
        totalPrice={totalPrice()}
        ctaLabel="Pay Now"
        onPress={handlePayNow}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7F9FF',
  },
  ambientGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(42, 193, 188, 0.12)',
    width: 585,
    height: 585,
    borderRadius: 9999,
    top: -176.8,
    left: -97.5,
    zIndex: 0,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: colors.textPrimary,
    fontFamily: fontFamilies.bold,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    gap: spacing.xs,
  },
  timerIcon: {
    fontSize: 12,
  },
  timerText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.error,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 220,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  cardTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  tripRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripRouteIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  tripRouteEmoji: {
    fontSize: 20,
  },
  tripRouteInfo: {
    flex: 1,
  },
  tripCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripCity: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  tripArrow: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  tripDateTime: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  totalLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
  },
  totalValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: colors.primary,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  paymentOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaded,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
    ...shadows.sm,
  },
  paymentEmoji: {
    fontSize: 18,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  paymentDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  promoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.md,
  },
  promoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  promoEmoji: {
    fontSize: 18,
  },
  promoInfo: {
    flex: 1,
  },
  promoTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  promoHint: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
});
