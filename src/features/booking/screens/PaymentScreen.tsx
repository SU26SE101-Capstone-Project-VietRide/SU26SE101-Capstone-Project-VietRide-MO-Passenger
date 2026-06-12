/** PaymentScreen — Ticket Payment Breakdown
 *
 * Visual style: matches Parcel flow (Bento UI, dotted route tracks)
 */

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Ticket, Coins, CreditCard, Wallet } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import { FloatingActionBar } from '../components';
import { PromoCodeInput } from '../../parcel/components/PromoCodeInput';
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
    selectedPickUp,
    selectedDropOff,
  } = useBookingStore();

  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);

  const baseFare = totalPrice();
  const finalPrice = baseFare - promoDiscount;

  const handlePayNow = useCallback(() => {
    navigation.navigate('DigitalTicket');
  }, [navigation]);

  const handlePromoApply = useCallback(() => {
    if (promoCode.trim().length > 0) {
      setPromoApplied(true);
      setPromoDiscount(50000); // Mock discount
    } else {
      setPromoApplied(false);
      setPromoDiscount(0);
    }
  }, [promoCode]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={styles.backBtn}
          >
            <View style={styles.backBubble}>
              <ArrowLeft size={20} color={colors.textPrimary} weight="bold" />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Route bento details card */}
          <View style={styles.bentoSummaryCard}>
            <View style={styles.bentoAccent} />
            <Text style={styles.bentoCardHeading}>Route Information</Text>
            <View style={styles.summaryRoute}>
              <View style={styles.routeTrack}>
                <View style={styles.dotStart} />
                <View style={styles.dottedDivider} />
                <View style={styles.dotEnd} />
              </View>
              <View style={styles.routeDetailsText}>
                <View style={styles.routeStationSection}>
                  <Text style={styles.routeLabelText}>BOARDING AT {selectedPickUp?.time || ''}</Text>
                  <Text style={styles.routeStationName}>{selectedPickUp?.name || 'Pick-up Point'}</Text>
                  <Text style={styles.routeStationCity}>{selectedPickUp?.address || ''}</Text>
                </View>
                <View style={styles.routeStationSection}>
                  <Text style={styles.routeLabelText}>ALIGHTING AT {selectedDropOff?.time || ''}</Text>
                  <Text style={styles.routeStationName}>{selectedDropOff?.name || 'Drop-off Point'}</Text>
                  <Text style={styles.routeStationCity}>{selectedDropOff?.address || ''}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Ticket Specifications */}
          <View style={styles.bentoSummaryCard}>
            <Text style={styles.bentoCardHeading}>Ticket Specifications</Text>
            <View style={styles.specCardRow}>
              <View style={styles.specIcon}>
                <Ticket size={22} color={colors.primary} weight="duotone" />
              </View>
              <View style={styles.specDetails}>
                <Text style={styles.specTitle}>
                  {selectedTrip?.busType || 'Bus Ticket'}
                </Text>
                <Text style={styles.specMeta}>
                  Seats: {selectedSeats.map((s) => s.label).join(', ')} • Qty: {selectedSeats.length}
                </Text>
              </View>
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.bentoSummaryCard}>
            <Text style={styles.bentoCardHeading}>Payment Method</Text>
            <PaymentOption
              selected={paymentMethod === 'wallet'}
              label="VietRide Wallet"
              sub="Balance: 250,000₫"
              Icon={Wallet}
              iconColor={colors.primary}
              onSelect={() => setPaymentMethod('wallet')}
            />
            <PaymentOption
              selected={paymentMethod === 'vnpay'}
              label="VNPAY / Momo QR"
              sub="Scan app QR to pay"
              Icon={Coins}
              iconColor={colors.accentDark}
              onSelect={() => setPaymentMethod('vnpay')}
            />
            <PaymentOption
              selected={paymentMethod === 'card'}
              label="Credit / Debit Card"
              sub="Visa, Mastercard, JCB"
              Icon={CreditCard}
              iconColor={colors.success}
              onSelect={() => setPaymentMethod('card')}
            />
          </View>

          {/* Promo Code */}
          <PromoCodeInput
            code={promoCode}
            onChange={setPromoCode}
            applied={promoApplied}
            onApply={handlePromoApply}
          />

          {/* Pricing Breakdown details card */}
          <View style={styles.bentoSummaryCard}>
            <Text style={styles.bentoCardHeading}>Payment Breakdown</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Base Ticket Fare ({selectedSeats.length}x)</Text>
              <Text style={styles.priceValue}>₫{baseFare.toLocaleString('vi-VN')}</Text>
            </View>
            {promoApplied && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Promo Discount</Text>
                <Text style={[styles.priceValue, { color: colors.success }]}>
                  -₫{promoDiscount.toLocaleString('vi-VN')}
                </Text>
              </View>
            )}
            <View style={styles.summaryDivider} />
            <View style={[styles.priceRow, { marginTop: spacing.md }]}>
              <Text style={styles.totalLabel}>Total Price</Text>
              <Text style={styles.totalValue}>₫{finalPrice.toLocaleString('vi-VN')}</Text>
            </View>
          </View>

        </ScrollView>

        {/* Floating Action Bar */}
        <FloatingActionBar
          selectedSeats={selectedSeats}
          totalPrice={finalPrice}
          ctaLabel="Pay Now"
          onPress={handlePayNow}
        />
      </SafeAreaView>
    </View>
  );
}

interface PaymentOptionProps {
  selected: boolean;
  label: string;
  sub: string;
  Icon: React.ElementType;
  iconColor: string;
  onSelect: () => void;
}

const PaymentOption = ({ selected, label, sub, Icon, iconColor, onSelect }: PaymentOptionProps) => (
  <TouchableOpacity
    style={[styles.paymentOption, selected && styles.paymentOptionActive]}
    onPress={onSelect}
    activeOpacity={0.8}
  >
    <View style={styles.paymentRadio}>{selected && <View style={styles.paymentRadioDot} />}</View>
    <View style={styles.paymentIconBackground}>
      <Icon size={20} color={iconColor} weight="bold" />
    </View>
    <View style={styles.paymentOptionText}>
      <Text style={styles.paymentTitle}>{label}</Text>
      <Text style={styles.paymentSubtitle}>{sub}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
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
    paddingTop: spacing.md,
    paddingBottom: 220,
  },
  bentoSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  bentoAccent: {
    position: 'absolute',
    top: 14,
    left: 0,
    width: 3.5,
    height: 18,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  bentoCardHeading: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  summaryRoute: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  routeTrack: {
    width: 18,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  dotStart: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  dottedDivider: {
    flex: 1,
    width: 2,
    borderStyle: 'dashed',
    borderLeftWidth: 1.5,
    borderLeftColor: colors.divider,
    marginVertical: 4,
  },
  dotEnd: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textSecondary,
    marginBottom: 4,
  },
  routeDetailsText: {
    flex: 1,
  },
  routeStationSection: {
    marginBottom: spacing.md,
  },
  routeLabelText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  routeStationName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  routeStationCity: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  specCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  specIcon: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specDetails: {
    flex: 1,
  },
  specTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  specMeta: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.lg,
    borderWidth: 1.2,
    borderColor: colors.divider,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  paymentOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaded,
  },
  paymentRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  paymentRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  paymentIconBackground: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  paymentOptionText: {
    flex: 1,
  },
  paymentTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  paymentSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  priceLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    flex: 1,
    paddingRight: spacing.md,
  },
  priceValue: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  totalValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.primary,
  },
});
