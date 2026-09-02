import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  packageItemName: string;
  packageWeightKg: number;
  dimensionsLabel: string;
  grossPrice: number;
  discountAmount: number;
  totalAfterDiscount: number;
  depositPercent: number;
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
  disabled?: boolean;
  walletBalance?: number;
  walletIsLoading: boolean;
  walletHasError: boolean;
}

function PricingBreakdownComponent({
  receivingStation,
  dropoffStation,
  packageSize,
  packageItemName,
  packageWeightKg,
  dimensionsLabel,
  grossPrice,
  discountAmount,
  totalAfterDiscount,
  depositPercent,
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
  disabled = false,
  walletBalance,
  walletIsLoading,
  walletHasError,
}: PricingBreakdownProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const displayedItemName = packageItemName || t('parcel.categories.others');

  return (
    <View style={styles.summaryContent}>
      <View style={styles.card}>
        <View style={styles.cardAccent} />
        <Text style={styles.cardHeading}>
          {t('parcel.summary.routeInformation')}
        </Text>
        <View style={styles.summaryRoute}>
          <View style={styles.routeTrack}>
            <View style={styles.dotStart} />
            <View style={styles.dottedDivider} />
            <View style={styles.dotEnd} />
          </View>
          <View style={styles.routeDetailsText}>
            <View style={styles.routeStationSection}>
              <Text style={styles.routeLabelText}>
                {t('parcel.route.from')}
              </Text>
              <Text style={styles.routeStationName}>
                {receivingStation?.name || t('parcel.route.originTerminal')}
              </Text>
              {receivingStation?.city ? (
                <Text style={styles.routeStationCity}>
                  {receivingStation.city}
                </Text>
              ) : null}
            </View>
            <View style={styles.routeStationSection}>
              <Text style={styles.routeLabelText}>{t('parcel.route.to')}</Text>
              <Text style={styles.routeStationName}>
                {dropoffStation?.name || t('parcel.route.destinationTerminal')}
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
        <Text style={styles.cardHeading}>
          {t('parcel.summary.packageSpecifications')}
        </Text>
        <View style={styles.specCardRow}>
          <View style={styles.specIcon}>
            <Package size={22} color={theme.colors.primary} weight="duotone" />
          </View>
          <View style={styles.specDetails}>
            <Text style={styles.specTitle}>
              {t(`parcel.packageSize.options.${packageSize}`)} ·{' '}
              {displayedItemName}
            </Text>
            <Text style={styles.specMeta}>
              {t('parcel.summary.dimensionsAndWeight', {
                dimensions: dimensionsLabel,
                weight: packageWeightKg,
                unit: t('parcel.units.kg'),
              })}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeading}>
          {t('parcel.payment.methodTitle')}
        </Text>
        <ParcelPaymentMethodSelector
          value={paymentMethod}
          onChange={onPaymentMethodChange}
          requiredAmount={depositDue}
          walletBalance={walletBalance}
          walletIsLoading={walletIsLoading}
          walletHasError={walletHasError}
          disabled={disabled}
        />
      </View>

      <PromoCodeInput
        code={promoCode}
        onChange={onPromoCodeChange}
        applied={promoApplied}
        onApplyCode={onPromoApplyCode}
        disabled={disabled}
        promos={availablePromos}
        selectedPromoCode={selectedPromoCode}
        appliedLabel={appliedPromoLabel}
        errorText={promoError}
      />

      <View style={styles.card}>
        <Text style={styles.cardHeading}>
          {t('parcel.summary.paymentDetails')}
        </Text>
        <PriceRow label={t('parcel.summary.grossPrice')} value={grossPrice} />
        {discountAmount > 0 ? (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              {promoApplied
                ? t('parcel.summary.verifiedVoucherDiscount')
                : t('parcel.summary.serverQuoteDiscount')}
            </Text>
            <Text style={[styles.priceValue, styles.discountValue]}>
              -{formatVnd(discountAmount)}
            </Text>
          </View>
        ) : null}
        <PriceRow
          label={t('parcel.summary.totalAfterDiscount')}
          value={totalAfterDiscount}
        />
        <View style={styles.summaryDivider} />
        <View style={styles.paymentNowCard}>
          <Text style={styles.paymentNowEyebrow}>
            {t('parcel.summary.paymentToday')}
          </Text>
          <View style={styles.paymentNowRow}>
            <Text style={styles.paymentNowLabel}>
              {t('parcel.summary.depositOfEstimatedTotal', {
                percent: depositPercent,
              })}
            </Text>
            <Text style={styles.paymentNowValue}>{formatVnd(depositDue)}</Text>
          </View>
        </View>
        <Text style={styles.priceHint}>
          {t('parcel.summary.serverPricingHint')}
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
    fontSize: fontSizes.xs,
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
      ? theme.effects.contentSurfaceSoft
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
  paymentNowCard: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderCurve: 'continuous',
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : theme.colors.primaryFaded,
  },
  paymentNowEyebrow: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  paymentNowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  paymentNowLabel: {
    flex: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  paymentNowValue: {
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
