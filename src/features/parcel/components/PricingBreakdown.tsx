import React, { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CreditCard, Package, Wallet } from 'phosphor-react-native';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { formatVnd } from '@shared/utils/format';
import type { PromoOffer } from '@shared/utils/promo';
import type { ParcelPaymentMethod, ParcelSize } from '../types';
import { PromoCodeInput } from './PromoCodeInput';

export interface PricingBreakdownProps {
  receivingStation?: { name?: string; city?: string };
  dropoffStation?: { name?: string; city?: string };
  packageSize: ParcelSize;
  packageCategory: string;
  packageWeightKg: number;
  dimensionsLabel: string;
  estimatedPrice: number;
  depositBeforeDiscount: number;
  promoDiscount: number;
  depositDue: number;
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
  walletBalance?: number;
  walletIsLoading: boolean;
  walletHasError: boolean;
}

function PricingBreakdownComponent({
  receivingStation,
  dropoffStation,
  packageSize,
  packageCategory,
  packageWeightKg,
  dimensionsLabel,
  estimatedPrice,
  depositBeforeDiscount,
  promoDiscount,
  depositDue,
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
  walletBalance,
  walletIsLoading,
  walletHasError,
}: PricingBreakdownProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const walletHasKnownBalance = typeof walletBalance === 'number';
  const walletHasEnoughBalance =
    walletHasKnownBalance && walletBalance >= depositDue;
  const walletDisabled =
    walletIsLoading || walletHasError || !walletHasEnoughBalance;

  const selectWallet = useCallback(() => {
    if (!walletDisabled) {
      onPaymentMethodChange('wallet');
    }
  }, [onPaymentMethodChange, walletDisabled]);

  const selectVnPay = useCallback(() => {
    onPaymentMethodChange('vnpay');
  }, [onPaymentMethodChange]);

  const walletSubtitle = walletIsLoading
    ? 'Checking balance…'
    : walletHasError || !walletHasKnownBalance
    ? 'Balance unavailable'
    : walletHasEnoughBalance
    ? `Balance: ${formatVnd(walletBalance)}`
    : `Insufficient balance: ${formatVnd(walletBalance)}`;

  return (
    <View style={styles.summaryContent}>
      <View style={styles.card}>
        <View style={styles.cardAccent} />
        <Text style={styles.cardHeading}>Route Information</Text>
        <View style={styles.summaryRoute}>
          <View style={styles.routeTrack}>
            <View style={styles.dotStart} />
            <View style={styles.dottedDivider} />
            <View style={styles.dotEnd} />
          </View>
          <View style={styles.routeDetailsText}>
            <View style={styles.routeStationSection}>
              <Text style={styles.routeLabelText}>FROM</Text>
              <Text style={styles.routeStationName}>
                {receivingStation?.name || 'Origin terminal'}
              </Text>
              {receivingStation?.city ? (
                <Text style={styles.routeStationCity}>
                  {receivingStation.city}
                </Text>
              ) : null}
            </View>
            <View style={styles.routeStationSection}>
              <Text style={styles.routeLabelText}>TO</Text>
              <Text style={styles.routeStationName}>
                {dropoffStation?.name || 'Destination terminal'}
              </Text>
              {dropoffStation?.city ? (
                <Text style={styles.routeStationCity}>
                  {dropoffStation.city}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeading}>Package Specifications</Text>
        <View style={styles.specCardRow}>
          <View style={styles.specIcon}>
            <Package size={22} color={theme.colors.primary} weight="duotone" />
          </View>
          <View style={styles.specDetails}>
            <Text style={styles.specTitle}>
              {packageSize.toUpperCase()} · {packageCategory}
            </Text>
            <Text style={styles.specMeta}>
              {dimensionsLabel} · {packageWeightKg} kg
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeading}>Payment Method</Text>
        <PaymentOption
          selected={paymentMethod === 'wallet'}
          disabled={walletDisabled}
          label="VietRide Wallet"
          subtitle={walletSubtitle}
          Icon={Wallet}
          iconColor={theme.colors.primary}
          onSelect={selectWallet}
        />
        <PaymentOption
          selected={paymentMethod === 'vnpay'}
          label="VNPay"
          subtitle="Continue securely in the VNPay payment page"
          Icon={CreditCard}
          iconColor={theme.colors.accentDark}
          onSelect={selectVnPay}
        />
      </View>

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

      <View style={styles.card}>
        <Text style={styles.cardHeading}>Payment Details</Text>
        <PriceRow label="Estimated shipment price" value={estimatedPrice} />
        <PriceRow
          label="Deposit before discount"
          value={depositBeforeDiscount}
        />
        {promoApplied && promoDiscount > 0 ? (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Verified voucher discount</Text>
            <Text style={[styles.priceValue, styles.discountValue]}>
              -{formatVnd(promoDiscount)}
            </Text>
          </View>
        ) : null}
        <View style={styles.summaryDivider} />
        <View style={[styles.priceRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Deposit due now</Text>
          <Text style={styles.totalValue}>{formatVnd(depositDue)}</Text>
        </View>
        <Text style={styles.priceHint}>
          Final parcel pricing is confirmed by VietRide&apos;s server for the
          selected trip.
        </Text>
      </View>
    </View>
  );
}

export const PricingBreakdown = memo(PricingBreakdownComponent);

interface PaymentOptionProps {
  selected: boolean;
  disabled?: boolean;
  label: string;
  subtitle: string;
  Icon: React.ElementType;
  iconColor: string;
  onSelect: () => void;
}

const PaymentOption = memo(function PaymentOption({
  selected,
  disabled = false,
  label,
  subtitle,
  Icon,
  iconColor,
  onSelect,
}: PaymentOptionProps): React.JSX.Element {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.paymentOption,
        selected ? styles.paymentOptionActive : null,
        disabled ? styles.paymentOptionDisabled : null,
        pressed && !disabled ? styles.paymentOptionPressed : null,
      ]}
      onPress={onSelect}
    >
      <View style={styles.paymentRadio}>
        {selected ? <View style={styles.paymentRadioDot} /> : null}
      </View>
      <View style={styles.paymentIconBackground}>
        <Icon size={20} color={iconColor} weight="bold" />
      </View>
      <View style={styles.paymentOptionText}>
        <Text style={styles.paymentTitle}>{label}</Text>
        <Text style={styles.paymentSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
});

const PriceRow = memo(function PriceRow({
  label,
  value,
}: {
  label: string;
  value: number;
}): React.JSX.Element {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.priceRow}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={styles.priceValue}>{formatVnd(value)}</Text>
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  summaryContent: {
    gap: 0,
  },
  card: {
    ...theme.components.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardAccent: {
    position: 'absolute',
    top: 14,
    left: 0,
    width: 3.5,
    height: 18,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  cardHeading: {
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
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceSoft
      : theme.colors.surfaceAlt,
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
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceSoft
      : theme.colors.surfaceAlt,
    borderRadius: borderRadius.lg,
    borderWidth: 1.2,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorder
      : theme.colors.divider,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  paymentOptionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
  },
  paymentOptionDisabled: {
    opacity: 0.55,
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
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorderStrong
      : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurface
      : theme.colors.surface,
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
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurface
      : theme.colors.surface,
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
  discountValue: {
    color: theme.colors.success,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: spacing.sm,
  },
  totalRow: {
    marginTop: spacing.md,
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
  priceHint: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 17,
    color: theme.colors.textTertiary,
  },
});
