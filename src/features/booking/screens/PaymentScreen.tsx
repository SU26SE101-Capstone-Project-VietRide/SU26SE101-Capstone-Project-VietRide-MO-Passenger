/**
 * PaymentScreen — Trip summary + payment method + promo code
 *
 * Final step before payment: shows trip summary, payment method
 * selection (VNPAY/Card), promo code hint, and "Pay Now" CTA.
 *
 * Refactored: uses ScreenHeader with TimerPill instead of inline timer,
 * TripSummaryCard, PaymentMethodOption, and PromoCodeCard components.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import {
  ScreenHeader,
  FloatingActionBar,
  TripSummaryCard,
  PaymentMethodOption,
  PromoCodeCard,
} from '../components';
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

  const handlePayNow = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'SearchRoutes' }],
    });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header with Timer */}
      <ScreenHeader
        title="Checkout"
        onBackPress={() => navigation.goBack()}
        showTimer
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Trip Summary Card */}
        <TripSummaryCard
          trip={selectedTrip}
          seats={selectedSeats}
          totalPrice={totalPrice()}
        />

        {/* Payment Method Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Method</Text>

          <PaymentMethodOption
            variant="vnpay"
            name="VNPAY / Momo"
            desc="Scan QR to pay"
            selected={paymentMethod === 'vnpay'}
            onPress={() => setPaymentMethod('vnpay')}
          />
          <PaymentMethodOption
            variant="card"
            name="Credit / Debit Card"
            desc="Visa, Mastercard, JCB"
            selected={paymentMethod === 'card'}
            onPress={() => setPaymentMethod('card')}
          />
        </View>

        {/* Promo Code Card */}
        <PromoCodeCard />
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
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 220,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
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
});
