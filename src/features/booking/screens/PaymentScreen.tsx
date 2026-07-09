import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { QrCode, CreditCard, Wallet } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import type { PromoOffer } from '@shared/utils/promo';
import { normalizePromoCode } from '@shared/utils/promo';
import { FloatingActionBar } from '../components';
import { useBookingStore } from '../store/useBookingStore';
import { PromoCodeInput } from '../../parcel/components/PromoCodeInput';
import { useAvailableBookingVouchers } from '../hooks/useAvailableBookingVouchers';
import type { AvailableVoucherItem, PaymentMethod } from '../types';

interface PaymentStepProps {
  onNext: () => void | Promise<void>;
}

const formatMoney = (amount: number): string => `${Math.max(amount, 0).toLocaleString('vi-VN')} VND`;

const toBackendPaymentMethod = (method: PaymentMethod): 'WALLET' | 'VNPAY' =>
  method === 'wallet' ? 'WALLET' : 'VNPAY';

const getVoucherLabel = (voucher: AvailableVoucherItem): string => {
  if (voucher.type === 'PERCENT_OFF') {
    return `${voucher.value}% OFF`;
  }

  return `${formatMoney(voucher.discountAmount || voucher.value)} OFF`;
};

const toPromoOffer = (voucher: AvailableVoucherItem): PromoOffer => ({
  id: voucher.id,
  code: voucher.code,
  title: voucher.name,
  description:
    voucher.discountAmount > 0
      ? `Estimated saving ${formatMoney(voucher.discountAmount)} for this booking.`
      : 'Final discount is checked again at checkout.',
  discountLabel: getVoucherLabel(voucher),
  expiresAt: voucher.validUntil,
  minimumSpend: voucher.minOrderAmount,
  discount: { type: 'fixed', amount: voucher.discountAmount },
});

export function PaymentScreen({ onNext }: PaymentStepProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const {
    totalPrice,
    paymentMethod,
    setPaymentMethod,
    setHighestStep,
    outboundState,
    returnState,
    selectedTrip,
    selectedSeats,
    selectedPickUp,
    selectedDropOff,
    searchParams,
    voucherCode,
    voucherDiscountPreview,
    setVoucherCode,
    clearVoucher,
    bookingStatus,
    bookingError,
  } = useBookingStore();

  useEffect(() => {
    const paymentStep = searchParams.isRoundTrip ? 10 : 6;
    setHighestStep(paymentStep);
  }, [setHighestStep, searchParams.isRoundTrip]);

  const [promoCode, setPromoCode] = useState(voucherCode);
  const [appliedVoucher, setAppliedVoucher] = useState<AvailableVoucherItem | null>(null);
  const [promoError, setPromoError] = useState<string | undefined>(undefined);

  const baseFare = totalPrice();
  const paymentMethodForApi = useMemo(() => toBackendPaymentMethod(paymentMethod), [paymentMethod]);

  const displayLeg = useMemo(() => {
    if (searchParams.isRoundTrip) {
      return returnState ?? outboundState;
    }

    return {
      trip: selectedTrip,
      seats: selectedSeats,
      pickUp: selectedPickUp,
      dropOff: selectedDropOff,
    };
  }, [
    outboundState,
    returnState,
    searchParams.isRoundTrip,
    selectedDropOff,
    selectedPickUp,
    selectedSeats,
    selectedTrip,
  ]);

  const allSelectedSeats = useMemo(() => {
    if (!searchParams.isRoundTrip) {
      return selectedSeats;
    }

    return [...(outboundState?.seats ?? []), ...(returnState?.seats ?? [])];
  }, [outboundState?.seats, returnState?.seats, searchParams.isRoundTrip, selectedSeats]);

  const voucherLegs = useMemo(() => {
    if (searchParams.isRoundTrip) {
      return [outboundState, returnState]
        .filter((leg): leg is NonNullable<typeof leg> => Boolean(leg?.trip && leg.seats.length > 0))
        .map((leg) => ({
          tripId: leg.trip!.id,
          orderAmount: leg.trip!.price * leg.seats.length,
        }));
    }

    if (!selectedTrip || selectedSeats.length === 0) {
      return [];
    }

    return [{ tripId: selectedTrip.id, orderAmount: selectedTrip.price * selectedSeats.length }];
  }, [outboundState, returnState, searchParams.isRoundTrip, selectedSeats.length, selectedTrip]);

  const {
    data: availableVouchers = [],
    isFetching: vouchersFetching,
    isError: vouchersFailed,
  } = useAvailableBookingVouchers({
    legs: voucherLegs,
    paymentMethod: paymentMethodForApi,
    enabled: baseFare > 0,
  });

  const voucherPromos = useMemo(
    () => availableVouchers.map(toPromoOffer),
    [availableVouchers],
  );

  useEffect(() => {
    if (!voucherCode) {
      return;
    }

    const match = availableVouchers.find(
      (voucher) => normalizePromoCode(voucher.code) === normalizePromoCode(voucherCode),
    );

    if (match) {
      setAppliedVoucher(match);
      setPromoCode(match.code);
      if (voucherDiscountPreview !== match.discountAmount) {
        setVoucherCode(match.code, match.discountAmount);
      }
      return;
    }

    if (!vouchersFetching) {
      setAppliedVoucher(null);
      setPromoCode('');
      clearVoucher();
      setPromoError('Selected voucher is not available for this booking.');
    }
  }, [
    availableVouchers,
    clearVoucher,
    setVoucherCode,
    voucherCode,
    voucherDiscountPreview,
    vouchersFetching,
  ]);

  const trip = displayLeg?.trip;
  const seats = displayLeg?.seats ?? [];
  const pickUp = displayLeg?.pickUp;
  const dropOff = displayLeg?.dropOff;
  const promoDiscount = appliedVoucher?.discountAmount ?? voucherDiscountPreview;
  const finalPrice = Math.max(baseFare - promoDiscount, 0);
  const isSubmitting = bookingStatus === 'loading';
  const promoInputError = promoError
    ?? (vouchersFailed ? 'Could not refresh vouchers. You can continue without one.' : undefined);

  const handlePayNow = useCallback(() => {
    if (!isSubmitting) {
      onNext();
    }
  }, [isSubmitting, onNext]);

  const handlePromoCodeChange = useCallback((text: string) => {
    const normalizedCode = text.toUpperCase();
    setPromoCode(normalizedCode);
    setPromoError(undefined);

    if (
      appliedVoucher
      && normalizePromoCode(normalizedCode) !== normalizePromoCode(appliedVoucher.code)
    ) {
      setAppliedVoucher(null);
      clearVoucher();
    }
  }, [appliedVoucher, clearVoucher]);

  const handlePromoApply = useCallback((nextCode: string, selectedPromo?: PromoOffer) => {
    const normalizedCode = normalizePromoCode(selectedPromo?.code ?? nextCode);
    setPromoCode(normalizedCode);

    if (!normalizedCode) {
      setAppliedVoucher(null);
      clearVoucher();
      setPromoError('Enter a promo code to apply.');
      return false;
    }

    const voucher = availableVouchers.find(
      (item) => normalizePromoCode(item.code) === normalizedCode,
    );

    if (!voucher) {
      setAppliedVoucher(null);
      clearVoucher();
      setPromoError('This voucher is not available for the selected trip and payment method.');
      return false;
    }

    setAppliedVoucher(voucher);
    setVoucherCode(voucher.code, voucher.discountAmount);
    setPromoError(undefined);
    return true;
  }, [availableVouchers, clearVoucher, setVoucherCode]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payment Details</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
      >
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
                <Text style={styles.routeLabelText}>BOARDING AT {pickUp?.time ?? ''}</Text>
                <Text style={styles.routeStationName}>{pickUp?.name ?? 'Pick-up Point'}</Text>
                <Text style={styles.routeStationCity}>{pickUp?.address ?? ''}</Text>
              </View>
              <View style={styles.routeStationSection}>
                <Text style={styles.routeLabelText}>ALIGHTING AT {dropOff?.time ?? ''}</Text>
                <Text style={styles.routeStationName}>{dropOff?.name ?? 'Drop-off Point'}</Text>
                <Text style={styles.routeStationCity}>{dropOff?.address ?? ''}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bentoSummaryCard}>
          <Text style={styles.bentoCardHeading}>Ticket Specifications</Text>
          <View style={styles.specCardRow}>
            <View style={styles.specIcon}>
              <CreditCard size={22} color={theme.colors.primary} weight="duotone" />
            </View>
            <View style={styles.specDetails}>
              <Text style={styles.specTitle}>{trip?.busType ?? 'Bus Ticket'}</Text>
              <Text style={styles.specMeta}>
                Seats: {seats.map((seat) => seat.label).join(', ')} - Qty: {seats.length}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bentoSummaryCard}>
          <Text style={styles.bentoCardHeading}>Payment Method</Text>
          <PaymentOption
            selected={paymentMethod === 'vnpay'}
            label="VNPAY / Momo QR"
            sub="Pay by secure redirect"
            Icon={QrCode}
            iconColor={theme.colors.accentDark}
            onSelect={() => setPaymentMethod('vnpay')}
          />
          <PaymentOption
            selected={paymentMethod === 'wallet'}
            label="VietRide Wallet"
            sub="Use wallet balance"
            Icon={Wallet}
            iconColor={theme.colors.success}
            onSelect={() => setPaymentMethod('wallet')}
          />
        </View>

        <PromoCodeInput
          code={promoCode}
          onChange={handlePromoCodeChange}
          applied={Boolean(appliedVoucher)}
          onApplyCode={handlePromoApply}
          promos={voucherPromos}
          selectedPromoCode={appliedVoucher?.code}
          appliedLabel={appliedVoucher ? `${appliedVoucher.code} Applied` : undefined}
          errorText={promoInputError}
        />

        <View style={styles.bentoSummaryCard}>
          <Text style={styles.bentoCardHeading}>Payment Breakdown</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Base Ticket Fare ({allSelectedSeats.length}x)</Text>
            <Text style={styles.priceValue}>{formatMoney(baseFare)}</Text>
          </View>
          {appliedVoucher ? (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Voucher Discount</Text>
              <Text style={[styles.priceValue, styles.discountValue]}>
                -{formatMoney(promoDiscount)}
              </Text>
            </View>
          ) : null}
          <View style={styles.summaryDivider} />
          <View style={[styles.priceRow, styles.totalRowSpacing]}>
            <Text style={styles.totalLabel}>Total Price</Text>
            <Text style={styles.totalValue}>{formatMoney(finalPrice)}</Text>
          </View>
          {bookingError ? (
            <Text style={styles.submitErrorText}>{bookingError}</Text>
          ) : null}
        </View>
      </ScrollView>

      <FloatingActionBar
        selectedSeats={allSelectedSeats}
        totalPrice={finalPrice}
        ctaLabel={isSubmitting ? 'Processing...' : paymentMethod === 'vnpay' ? 'Pay with VNPAY' : 'Confirm Booking'}
        onPress={handlePayNow}
        disabled={isSubmitting || baseFare <= 0}
      />
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

const PaymentOption = ({ selected, label, sub, Icon, iconColor, onSelect }: PaymentOptionProps) => {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.paymentOption,
        selected ? styles.paymentOptionActive : null,
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
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 220,
  },
  bentoSummaryCard: {
    ...theme.components.card,
    borderRadius: borderRadius.lg,
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
    fontFamily: fontFamilies.semiBold,
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
    fontFamily: fontFamilies.semiBold,
    fontSize: 9,
    color: theme.colors.textTertiary,
    marginBottom: 2,
  },
  routeStationName: {
    fontFamily: fontFamilies.semiBold,
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
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specDetails: {
    flex: 1,
  },
  specTitle: {
    fontFamily: fontFamilies.semiBold,
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
    borderWidth: 1,
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
  discountValue: {
    color: theme.colors.success,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: spacing.sm,
  },
  totalRowSpacing: {
    marginTop: spacing.md,
  },
  totalLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  totalValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.primary,
  },
  submitErrorText: {
    marginTop: spacing.md,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.error,
    lineHeight: 18,
  },
});
