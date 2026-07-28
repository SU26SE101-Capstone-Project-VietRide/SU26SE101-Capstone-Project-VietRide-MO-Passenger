import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { Package } from 'phosphor-react-native';

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
import { ParcelPaymentMethodSelector } from './ParcelPaymentMethodSelector';
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
        <ParcelPaymentMethodSelector
          value={paymentMethod}
          onChange={onPaymentMethodChange}
          requiredAmount={depositDue}
          walletBalance={walletBalance}
          walletIsLoading={walletIsLoading}
          walletHasError={walletHasError}
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
