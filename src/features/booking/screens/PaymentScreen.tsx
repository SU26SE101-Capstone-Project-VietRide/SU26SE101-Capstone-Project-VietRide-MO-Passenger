/** PaymentScreen — Trip summary + payment method + promo code
 *
 * Visual style: matches Parcel flow (gradient bg, mint palette, card surfaces)
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { ArrowLeft } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import {
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
    <View style={styles.root}>
      {/* Gradient background */}
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="300" width="100%">
          <Defs>
            <LinearGradient id="payGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#2AC1BC" stopOpacity={0.1} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#payGrad)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        {/* Header with back bubble */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={styles.backBtn}
          >
            <View style={styles.backBubble}>
              <ArrowLeft size={20} color={colors.primary} weight="bold" />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={{ width: 40 }} />
        </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E6F4F3',
  },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    zIndex: 0,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.divider,
    ...shadows.sm,
  },
  backBubble: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 220,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: spacing.xxl,
    marginBottom: spacing.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  cardTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
});
