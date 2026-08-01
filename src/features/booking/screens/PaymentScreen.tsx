import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { QrCode, CreditCard, Wallet, Van } from 'phosphor-react-native';
import { useShallow } from 'zustand/react/shallow';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import type { PromoOffer } from '@shared/utils/promo';
import { normalizePromoCode } from '@shared/utils/promo';
import { formatVnd } from '@shared/utils/format';
import { toBackendPaymentMethod } from '@shared/utils/paymentMethod';
import { getLocalizedApiErrorMessage } from '@shared/api/errors';
import { FloatingActionBar } from '../components';
import { useBookingStore } from '../store/useBookingStore';
import { PromoCodeInput } from '../../parcel/components/PromoCodeInput';
import { useAvailableBookingVouchers } from '../hooks/useAvailableBookingVouchers';
import type { AvailableVoucherItem } from '../types';

interface PaymentStepProps {
  onNext: () => void | Promise<void>;
}

const getVoucherLabel = (voucher: AvailableVoucherItem, t: TFunction): string => {
  if (voucher.type === 'PERCENT_OFF') {
    return t('booking.vouchers.percentOff', { value: voucher.value });
  }

  return t('booking.vouchers.amountOff', {
    amount: formatVnd(voucher.discountAmount || voucher.value, {
      display: 'code',
      clampNegative: true,
    }),
  });
};

const toPromoOffer = (voucher: AvailableVoucherItem, t: TFunction): PromoOffer => ({
  id: voucher.id,
  code: voucher.code,
  title: voucher.name,
  description:
    voucher.discountAmount > 0
      ? t('booking.vouchers.estimatedSaving', {
        amount: formatVnd(voucher.discountAmount, {
          display: 'code',
          clampNegative: true,
        }),
      })
      : t('booking.vouchers.finalDiscountNotice'),
  discountLabel: getVoucherLabel(voucher, t),
  expiresAt: voucher.validUntil,
  minimumSpend: voucher.minOrderAmount,
  discount: { type: 'fixed', amount: voucher.discountAmount },
});

export function PaymentScreen({ onNext }: PaymentStepProps): React.JSX.Element {
  const { t } = useTranslation();
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
    selectedShuttlePickup,
    searchParams,
    voucherCode,
    voucherDiscountPreview,
    setVoucherCode,
    clearVoucher,
    bookingStatus,
    bookingError,
  } = useBookingStore(useShallow((state) => ({
    totalPrice: state.totalPrice,
    paymentMethod: state.paymentMethod,
    setPaymentMethod: state.setPaymentMethod,
    setHighestStep: state.setHighestStep,
    outboundState: state.outboundState,
    returnState: state.returnState,
    selectedTrip: state.selectedTrip,
    selectedSeats: state.selectedSeats,
    selectedPickUp: state.selectedPickUp,
    selectedDropOff: state.selectedDropOff,
    selectedShuttlePickup: state.selectedShuttlePickup,
    searchParams: state.searchParams,
    voucherCode: state.voucherCode,
    voucherDiscountPreview: state.voucherDiscountPreview,
    setVoucherCode: state.setVoucherCode,
    clearVoucher: state.clearVoucher,
    bookingStatus: state.bookingStatus,
    bookingError: state.bookingError,
  })));

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
      shuttlePickup: selectedShuttlePickup,
    };
  }, [
    outboundState,
    returnState,
    searchParams.isRoundTrip,
    selectedDropOff,
    selectedPickUp,
    selectedSeats,
    selectedShuttlePickup,
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
    () => availableVouchers.map(voucher => toPromoOffer(voucher, t)),
    [availableVouchers, t],
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
      setPromoError(t('booking.vouchers.selectedUnavailable'));
    }
  }, [
    availableVouchers,
    clearVoucher,
    setVoucherCode,
    voucherCode,
    voucherDiscountPreview,
    vouchersFetching,
    t,
  ]);

  const trip = displayLeg?.trip;
  const seats = displayLeg?.seats ?? [];
  const pickUp = displayLeg?.pickUp;
  const dropOff = displayLeg?.dropOff;
  const shuttlePickup = displayLeg?.shuttlePickup;
  const promoDiscount = appliedVoucher?.discountAmount ?? voucherDiscountPreview;
  const finalPrice = Math.max(baseFare - promoDiscount, 0);
  const isSubmitting = bookingStatus === 'loading';
  const promoInputError = promoError
    ?? (vouchersFailed ? t('booking.vouchers.refreshFailed') : undefined);
  const bookingErrorMessage = useMemo(
    () => bookingError ? getLocalizedApiErrorMessage(bookingError, t) : null,
    [bookingError, t],
  );
  const busTypeLabel = useMemo(() => {
    switch (trip?.busType) {
      case 'sleeper': return t('booking.busType.sleeper');
      case 'limousine': return t('booking.busType.limousine');
      case 'standard': return t('booking.busType.standard');
      default: return t('booking.paymentScreen.ticketFallback');
    }
  }, [t, trip?.busType]);

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
      setPromoError(t('booking.vouchers.enterCode'));
      return false;
    }

    const voucher = availableVouchers.find(
      (item) => normalizePromoCode(item.code) === normalizedCode,
    );

    if (!voucher) {
      setAppliedVoucher(null);
      clearVoucher();
      setPromoError(t('booking.vouchers.notAvailableForSelection'));
      return false;
    }

    setAppliedVoucher(voucher);
    setVoucherCode(voucher.code, voucher.discountAmount);
    setPromoError(undefined);
    return true;
  }, [availableVouchers, clearVoucher, setVoucherCode, t]);

  const selectVnpay = useCallback(() => setPaymentMethod('vnpay'), [setPaymentMethod]);
  const selectWallet = useCallback(() => setPaymentMethod('wallet'), [setPaymentMethod]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('booking.paymentScreen.title')}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.bentoSummaryCard}>
          <View style={styles.bentoAccent} />
          <Text style={styles.bentoCardHeading}>{t('booking.paymentScreen.routeInformation')}</Text>
          {shuttlePickup ? (
            <View style={styles.shuttleSummary}>
              <View style={styles.specIcon}>
                <Van size={21} color={theme.colors.primary} weight="duotone" />
              </View>
              <View style={styles.specDetails}>
                <Text style={styles.routeLabelText}>{t('booking.checkout.shuttleRequest')}</Text>
                <Text style={styles.routeStationName}>{shuttlePickup.address}</Text>
                <Text style={styles.routeStationCity}>{t('booking.paymentScreen.shuttleAwaiting')}</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.summaryRoute}>
            <View style={styles.routeTrack}>
              <View style={styles.dotStart} />
              <View style={styles.dottedDivider} />
              <View style={styles.dotEnd} />
            </View>
            <View style={styles.routeDetailsText}>
              <View style={styles.routeStationSection}>
                <Text style={styles.routeLabelText}>
                  {t('booking.checkout.boardingAt', {
                    time: pickUp?.time ?? t('common.notAvailable'),
                  })}
                </Text>
                <Text style={styles.routeStationName}>
                  {pickUp?.name ?? t('booking.paymentScreen.pickupPoint')}
                </Text>
                <Text style={styles.routeStationCity}>{pickUp?.address ?? ''}</Text>
              </View>
              <View style={styles.routeStationSection}>
                <Text style={styles.routeLabelText}>
                  {t('booking.checkout.alightingAt', {
                    time: dropOff?.time ?? t('common.notAvailable'),
                  })}
                </Text>
                <Text style={styles.routeStationName}>
                  {dropOff?.name ?? t('booking.paymentScreen.dropoffPoint')}
                </Text>
                <Text style={styles.routeStationCity}>{dropOff?.address ?? ''}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bentoSummaryCard}>
          <Text style={styles.bentoCardHeading}>{t('booking.paymentScreen.ticketSpecifications')}</Text>
          <View style={styles.specCardRow}>
            <View style={styles.specIcon}>
              <CreditCard size={22} color={theme.colors.primary} weight="duotone" />
            </View>
            <View style={styles.specDetails}>
              <Text style={styles.specTitle}>{busTypeLabel}</Text>
              <Text style={styles.specMeta}>
                {t('booking.paymentScreen.seatSummary', {
                  seats: seats.map((seat) => seat.label).join(', ') || t('common.none'),
                  count: seats.length,
                })}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bentoSummaryCard}>
          <Text style={styles.bentoCardHeading}>{t('booking.paymentScreen.method')}</Text>
          <PaymentOption
            selected={paymentMethod === 'vnpay'}
            label={t('booking.paymentScreen.vnpayLabel')}
            sub={t('booking.paymentScreen.vnpayDescription')}
            Icon={QrCode}
            iconColor={theme.colors.accentDark}
            onSelect={selectVnpay}
          />
          <PaymentOption
            selected={paymentMethod === 'wallet'}
            label={t('booking.paymentScreen.walletLabel')}
            sub={t('booking.paymentScreen.walletDescription')}
            Icon={Wallet}
            iconColor={theme.colors.success}
            onSelect={selectWallet}
          />
        </View>

        <PromoCodeInput
          code={promoCode}
          onChange={handlePromoCodeChange}
          applied={Boolean(appliedVoucher)}
          onApplyCode={handlePromoApply}
          promos={voucherPromos}
          selectedPromoCode={appliedVoucher?.code}
          appliedLabel={appliedVoucher
            ? t('booking.vouchers.appliedCode', { code: appliedVoucher.code })
            : undefined}
          errorText={promoInputError}
        />

        <View style={styles.bentoSummaryCard}>
          <Text style={styles.bentoCardHeading}>{t('booking.paymentScreen.breakdown')}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              {t('booking.paymentScreen.baseFare', { count: allSelectedSeats.length })}
            </Text>
            <Text style={styles.priceValue}>
              {formatVnd(baseFare, { display: 'code', clampNegative: true })}
            </Text>
          </View>
          {appliedVoucher ? (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t('booking.paymentScreen.voucherDiscount')}</Text>
              <Text style={[styles.priceValue, styles.discountValue]}>
                -{formatVnd(promoDiscount, { display: 'code', clampNegative: true })}
              </Text>
            </View>
          ) : null}
          <View style={styles.summaryDivider} />
          <View style={[styles.priceRow, styles.totalRowSpacing]}>
            <Text style={styles.totalLabel}>{t('booking.totalPrice')}</Text>
            <Text style={styles.totalValue}>
              {formatVnd(finalPrice, { display: 'code', clampNegative: true })}
            </Text>
          </View>
          {bookingErrorMessage ? (
            <Text style={styles.submitErrorText}>{bookingErrorMessage}</Text>
          ) : null}
        </View>
      </ScrollView>

      <FloatingActionBar
        selectedSeats={allSelectedSeats}
        totalPrice={finalPrice}
        ctaLabel={isSubmitting
          ? t('booking.paymentScreen.processing')
          : paymentMethod === 'vnpay'
            ? t('booking.paymentScreen.payWithVnpay')
            : t('booking.paymentScreen.confirmBooking')}
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

const PaymentOption = memo(function PaymentOptionComponent({
  selected,
  label,
  sub,
  Icon,
  iconColor,
  onSelect,
}: PaymentOptionProps): React.JSX.Element {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
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
});

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
    paddingBottom: spacing.lg,
  },
  scroll: {
    flex: 1,
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
  shuttleSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.primaryFaded,
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
