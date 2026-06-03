import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TShirt, Coins, CreditCard, Wallet, ArrowLeft } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { PromoCodeInput } from './PromoCodeInput';

export interface PricingBreakdownProps {
  receivingStation?: { name?: string; city?: string };
  dropoffStation?: { name?: string; city?: string };
  packageSize: 'small' | 'medium' | 'large';
  packageCategory: string;
  packageWeight: number;
  weightUnit: 'kg' | 'lbs';
  codEnabled: boolean;
  codAmount: string;
  baseFare: number;
  weightSurcharge: number;
  promoDiscount: number;
  totalPrice: number;
  promoCode: string;
  promoApplied: boolean;
  onPromoCodeChange: (text: string) => void;
  onPromoApply: () => void;
  paymentMethod: 'vnpay' | 'wallet' | 'card';
  onPaymentMethodChange: (method: 'vnpay' | 'wallet' | 'card') => void;
  step: number;
  onPayPress: () => void;
}

export const PricingBreakdown = ({
  receivingStation,
  dropoffStation,
  packageSize,
  packageCategory,
  packageWeight,
  weightUnit,
  codEnabled,
  codAmount,
  baseFare,
  weightSurcharge,
  promoDiscount,
  totalPrice,
  promoCode,
  promoApplied,
  onPromoCodeChange,
  onPromoApply,
  paymentMethod,
  onPaymentMethodChange,
  step,
  onPayPress,
}: PricingBreakdownProps): React.JSX.Element => {
  return (
    <View style={styles.summaryContent}>
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
              <Text style={styles.routeLabelText}>FROM</Text>
              <Text style={styles.routeStationName}>{receivingStation?.name}</Text>
              <Text style={styles.routeStationCity}>{receivingStation?.city}</Text>
            </View>
            <View style={styles.routeStationSection}>
              <Text style={styles.routeLabelText}>TO</Text>
              <Text style={styles.routeStationName}>{dropoffStation?.name}</Text>
              <Text style={styles.routeStationCity}>{dropoffStation?.city}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Package summary bento card */}
      <View style={styles.bentoSummaryCard}>
        <Text style={styles.bentoCardHeading}>Package Specifications</Text>
        <View style={styles.specCardRow}>
          <View style={styles.specIcon}>
            <TShirt size={22} color={colors.primary} weight="duotone" />
          </View>
          <View style={styles.specDetails}>
            <Text style={styles.specTitle}>
              {packageSize.toUpperCase()} Package ({packageCategory})
            </Text>
            <Text style={styles.specMeta}>
              Weight: {packageWeight} {weightUnit} • COD:{' '}
              {codEnabled ? `₫${codAmount}` : 'No'}
            </Text>
          </View>
        </View>
      </View>

      {/* Payment Methods selector */}
      <View style={styles.bentoSummaryCard}>
        <Text style={styles.bentoCardHeading}>Payment Method</Text>
        <PaymentOption
          selected={paymentMethod === 'wallet'}
          label="VietRide Wallet"
          sub="Balance: 250,000₫"
          Icon={Wallet}
          iconColor={colors.primary}
          onSelect={() => onPaymentMethodChange('wallet')}
        />
        <PaymentOption
          selected={paymentMethod === 'vnpay'}
          label="VNPAY / Momo QR"
          sub="Scan app QR to pay"
          Icon={Coins}
          iconColor={colors.accentDark}
          onSelect={() => onPaymentMethodChange('vnpay')}
        />
        <PaymentOption
          selected={paymentMethod === 'card'}
          label="Credit / Debit Card"
          sub="Visa, Mastercard, JCB"
          Icon={CreditCard}
          iconColor={colors.success}
          onSelect={() => onPaymentMethodChange('card')}
        />
      </View>

      {/* Promo Code */}
      <PromoCodeInput
        code={promoCode}
        onChange={onPromoCodeChange}
        applied={promoApplied}
        onApply={onPromoApply}
      />

      {/* Pricing Breakdown details card */}
      <View style={styles.bentoSummaryCard}>
        <Text style={styles.bentoCardHeading}>Payment Details</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Base Delivery Fare</Text>
          <Text style={styles.priceValue}>₫{baseFare.toLocaleString()}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>
            Weight Surcharge ({packageWeight} {weightUnit})
          </Text>
          <Text style={styles.priceValue}>₫{weightSurcharge.toLocaleString()}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Promo Discount</Text>
          <Text style={[styles.priceValue, { color: colors.success }]}>
            -₫{promoDiscount.toLocaleString()}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={[styles.priceRow, { marginTop: spacing.md }]}>
          <Text style={styles.totalLabel}>Total Price</Text>
          <Text style={styles.totalValue}>₫{totalPrice.toLocaleString()}</Text>
        </View>
      </View>
    </View>
  );
};

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
  summaryContent: {
    gap: 0,
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
