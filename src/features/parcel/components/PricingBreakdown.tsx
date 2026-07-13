import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { TShirt, Coins, Wallet } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import type { PromoOffer } from '@shared/utils/promo';
import { PromoCodeInput } from './PromoCodeInput';
import type { ParcelPaymentMethod } from '../types';

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
  onPromoApplyCode: (code: string, promo?: PromoOffer) => boolean | void;
  availablePromos: PromoOffer[];
  selectedPromoCode?: string;
  appliedPromoLabel?: string;
  promoError?: string;
  paymentMethod: ParcelPaymentMethod;
  onPaymentMethodChange: (method: ParcelPaymentMethod) => void;
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
  onPromoApplyCode,
  availablePromos,
  selectedPromoCode,
  appliedPromoLabel,
  promoError,
  paymentMethod,
  onPaymentMethodChange,
}: PricingBreakdownProps): React.JSX.Element => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

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
            <TShirt size={22} color={theme.colors.primary} weight="duotone" />
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
          iconColor={theme.colors.primary}
          onSelect={() => onPaymentMethodChange('wallet')}
        />
        <PaymentOption
          selected={paymentMethod === 'vnpay'}
          label="VNPAY / Momo QR"
          sub="Scan app QR to pay"
          Icon={Coins}
          iconColor={theme.colors.accentDark}
          onSelect={() => onPaymentMethodChange('vnpay')}
        />
      </View>

      {/* Promo Code */}
      <PromoCodeInput
        code={promoCode}
        onChange={onPromoCodeChange}
        applied={promoApplied}
        onApplyCode={onPromoApplyCode}
        promos={availablePromos}
        selectedPromoCode={selectedPromoCode}
        appliedLabel={appliedPromoLabel}
        errorText={promoError}
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
        {promoApplied ? (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Promo Discount</Text>
            <Text style={[styles.priceValue, { color: theme.colors.success }]}>
              -₫{promoDiscount.toLocaleString()}
            </Text>
          </View>
        ) : null}
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

const PaymentOption = ({ selected, label, sub, Icon, iconColor, onSelect }: PaymentOptionProps) => {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.paymentOption,
        selected && styles.paymentOptionActive,
        pressed ? styles.paymentOptionPressed : null,
      ]}
      onPress={onSelect}
    >
      <View style={styles.paymentRadio}>{selected ? <View style={styles.paymentRadioDot} /> : null}</View>
      <View style={styles.paymentIconBackground}>
        <Icon size={20} color={iconColor} weight="bold" />
      </View>
      <View style={styles.paymentOptionText}>
        <Text style={styles.paymentTitle}>{label}</Text>
        <Text style={styles.paymentSubtitle}>{sub}</Text>
      </View>
    </Pressable>
  );
};

const createStyles = (theme: AppTheme) => ({
  summaryContent: {
    gap: 0,
  },
  bentoSummaryCard: {
    ...theme.components.card,
    borderRadius: borderRadius.xl,
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
    backgroundColor: theme.colors.primary,
  },
  bentoCardHeading: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
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
    backgroundColor: theme.colors.primary,
    marginTop: 6,
  },
  dottedDivider: {
    flex: 1,
    width: 2,
    borderStyle: 'dashed',
    borderLeftWidth: 1.5,
    borderLeftColor: theme.colors.divider,
    marginVertical: 4,
  },
  dotEnd: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.textSecondary,
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
    color: theme.colors.textTertiary,
    marginBottom: 2,
  },
  routeStationName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  routeStationCity: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specDetails: {
    flex: 1,
  },
  specTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  specMeta: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderRadius: borderRadius.lg,
    borderWidth: 1.2,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  paymentOptionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
  },
  paymentOptionPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  paymentRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorderStrong : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurface : theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  paymentRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  paymentIconBackground: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurface : theme.colors.surface,
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
    color: theme.colors.textPrimary,
  },
  paymentSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
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
    color: theme.colors.textSecondary,
    flex: 1,
    paddingRight: spacing.md,
  },
  priceValue: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    textAlign: 'right',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  totalValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.primary,
  },
});
