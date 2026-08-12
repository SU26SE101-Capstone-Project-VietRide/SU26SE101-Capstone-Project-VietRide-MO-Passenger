import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { QrCode, Wallet } from 'phosphor-react-native';
import { useShallow } from 'zustand/react/shallow';
import { useWalletBalance } from '@features/profile/hooks/useWallet';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import type { PromoOffer } from '@shared/utils/promo';
import { normalizePromoCode } from '@shared/utils/promo';
import { formatVnd } from '@shared/utils/format';
import { toBackendPaymentMethod } from '@shared/utils/paymentMethod';
import { getLocalizedApiErrorMessage } from '@shared/api/errors';
import { BookingLegSummaryCard, FloatingActionBar } from '../components';
import { useBookingStore } from '../store/useBookingStore';
import { PromoCodeInput } from '../../parcel/components/PromoCodeInput';
import { useAvailableBookingVouchers } from '../hooks/useAvailableBookingVouchers';
import type { AvailableVoucherItem } from '../types';
import { buildBookingSeatBadges } from '../utils/seatPresentation';
import {
  getShuttleChangeAddressDirection,
  SHUTTLE_ERROR_TRANSLATION_KEYS,
} from '../utils/shuttle';
import { getLegFareTotal } from '../utils/bookingPricing';
import {
  OUTBOUND_DROPOFF_STEP,
  OUTBOUND_PICKUP_STEP,
  OUTBOUND_SEAT_STEP,
  OUTBOUND_STEPS,
  RETURN_DROPOFF_STEP,
  RETURN_PICKUP_STEP,
  RETURN_SEAT_STEP,
} from '../utils/bookingSteps';

interface PaymentStepProps {
  onNext: () => void | Promise<void>;
  onGoToStep?: (step: number) => void;
}

type ShuttleEditAction = {
  key: string;
  label: string;
  onPress: () => void;
};

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

export function PaymentScreen({ onNext, onGoToStep }: PaymentStepProps): React.JSX.Element {
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
    selectedShuttleDropoff,
    searchParams,
    voucherCode,
    voucherDiscountPreview,
    setVoucherCode,
    clearVoucher,
    bookingStatus,
    bookingError,
    seatConflictLegs,
    restoreLegForEdit,
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
    selectedShuttleDropoff: state.selectedShuttleDropoff,
    searchParams: state.searchParams,
    voucherCode: state.voucherCode,
    voucherDiscountPreview: state.voucherDiscountPreview,
    setVoucherCode: state.setVoucherCode,
    clearVoucher: state.clearVoucher,
    bookingStatus: state.bookingStatus,
    bookingError: state.bookingError,
    seatConflictLegs: state.seatConflictLegs,
    restoreLegForEdit: state.restoreLegForEdit,
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

  const oneWayLeg = useMemo(() => ({
    trip: selectedTrip,
    seats: selectedSeats,
    pickUp: selectedPickUp,
    dropOff: selectedDropOff,
    shuttlePickup: selectedShuttlePickup,
    shuttleDropoff: selectedShuttleDropoff,
  }), [
    selectedDropOff,
    selectedPickUp,
    selectedSeats,
    selectedShuttleDropoff,
    selectedShuttlePickup,
    selectedTrip,
  ]);

  const seatBadges = useMemo(() => {
    return buildBookingSeatBadges({
      isRoundTrip: Boolean(searchParams.isRoundTrip),
      oneWay: { seats: selectedSeats, tripId: selectedTrip?.id },
      outbound: outboundState
        ? { seats: outboundState.seats, tripId: outboundState.trip?.id }
        : undefined,
      returnLeg: returnState
        ? { seats: returnState.seats, tripId: returnState.trip?.id }
        : undefined,
      outboundLabel: t('booking.header.outbound'),
      returnLabel: t('booking.header.return'),
    });
  }, [
    outboundState,
    returnState,
    searchParams.isRoundTrip,
    selectedSeats,
    selectedTrip?.id,
    t,
  ]);

  const voucherLegs = useMemo(() => {
    if (searchParams.isRoundTrip) {
      return [outboundState, returnState]
        .filter((leg): leg is NonNullable<typeof leg> => Boolean(leg?.trip && leg.seats.length > 0))
        .map((leg) => ({
          tripId: leg.trip!.id,
          orderAmount: getLegFareTotal(leg.trip, leg.seats, leg.pickUp),
        }));
    }

    if (!selectedTrip || selectedSeats.length === 0) {
      return [];
    }

    return [{
      tripId: selectedTrip.id,
      orderAmount: getLegFareTotal(selectedTrip, selectedSeats, selectedPickUp),
    }];
  }, [
    outboundState,
    returnState,
    searchParams.isRoundTrip,
    selectedPickUp,
    selectedSeats,
    selectedTrip,
  ]);

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

  const promoDiscount = appliedVoucher?.discountAmount ?? voucherDiscountPreview;
  const finalPrice = Math.max(baseFare - promoDiscount, 0);
  const walletBalanceQuery = useWalletBalance(baseFare > 0);
  const walletBalance = walletBalanceQuery.data?.balance;
  const walletHasKnownBalance = typeof walletBalance === 'number';
  const walletHasEnoughBalance =
    walletHasKnownBalance && walletBalance >= finalPrice;
  const walletDisabled =
    walletBalanceQuery.isLoading
    || walletBalanceQuery.isError
    || !walletHasEnoughBalance;
  const walletSubtitle = walletBalanceQuery.isLoading
    ? t('booking.paymentScreen.walletCheckingBalance')
    : walletBalanceQuery.isError || !walletHasKnownBalance
      ? t('booking.paymentScreen.walletBalanceUnavailable')
      : walletHasEnoughBalance
        ? t('booking.paymentScreen.walletBalance', {
          amount: formatVnd(walletBalance, {
            display: 'code',
            clampNegative: true,
          }),
        })
        : t('booking.paymentScreen.walletInsufficientBalance', {
          amount: formatVnd(walletBalance, {
            display: 'code',
            clampNegative: true,
          }),
        });
  const cannotSubmitWallet = paymentMethod === 'wallet' && walletDisabled;
  const isSubmitting = bookingStatus === 'loading';
  const promoInputError = promoError
    ?? (vouchersFailed ? t('booking.vouchers.refreshFailed') : undefined);
  const bookingErrorMessage = useMemo(
    () => bookingError
      ? getLocalizedApiErrorMessage(bookingError, t, SHUTTLE_ERROR_TRANSLATION_KEYS)
      : null,
    [bookingError, t],
  );
  const shuttleChangeDirection = useMemo(
    () => getShuttleChangeAddressDirection(bookingError?.code),
    [bookingError?.code],
  );

  useEffect(() => {
    if (
      paymentMethod === 'wallet'
      && !walletBalanceQuery.isLoading
      && walletDisabled
    ) {
      setPaymentMethod('vnpay');
    }
  }, [
    paymentMethod,
    setPaymentMethod,
    walletBalanceQuery.isLoading,
    walletDisabled,
  ]);
  const isRoundTrip = Boolean(searchParams.isRoundTrip);
  const shuttleEditActions = useMemo<ShuttleEditAction[]>(() => {
    if (!shuttleChangeDirection || !onGoToStep) {
      return [];
    }

    const actions: ShuttleEditAction[] = [];
    const canEditPickup = shuttleChangeDirection === 'pickup'
      || shuttleChangeDirection === 'both';
    const canEditDropoff = shuttleChangeDirection === 'dropoff'
      || shuttleChangeDirection === 'both';

    if (!isRoundTrip) {
      if (canEditPickup && selectedShuttlePickup) {
        actions.push({
          key: 'pickup',
          label: t('booking.shuttlePicker.changePickupAddress'),
          onPress: () => onGoToStep(OUTBOUND_PICKUP_STEP),
        });
      }
      if (canEditDropoff && selectedShuttleDropoff) {
        actions.push({
          key: 'dropoff',
          label: t('booking.shuttlePicker.changeDropoffAddress'),
          onPress: () => onGoToStep(OUTBOUND_DROPOFF_STEP),
        });
      }
      return actions;
    }

    if (canEditPickup && outboundState?.shuttlePickup) {
      actions.push({
        key: 'outbound-pickup',
        label: t('booking.shuttlePicker.changeOutboundPickupAddress'),
        onPress: () => onGoToStep(OUTBOUND_PICKUP_STEP),
      });
    }
    if (canEditDropoff && outboundState?.shuttleDropoff) {
      actions.push({
        key: 'outbound-dropoff',
        label: t('booking.shuttlePicker.changeOutboundDropoffAddress'),
        onPress: () => onGoToStep(OUTBOUND_DROPOFF_STEP),
      });
    }
    if (canEditPickup && returnState?.shuttlePickup) {
      actions.push({
        key: 'return-pickup',
        label: t('booking.shuttlePicker.changeReturnPickupAddress'),
        onPress: () => onGoToStep(RETURN_PICKUP_STEP),
      });
    }
    if (canEditDropoff && returnState?.shuttleDropoff) {
      actions.push({
        key: 'return-dropoff',
        label: t('booking.shuttlePicker.changeReturnDropoffAddress'),
        onPress: () => onGoToStep(RETURN_DROPOFF_STEP),
      });
    }

    return actions;
  }, [
    isRoundTrip,
    onGoToStep,
    outboundState?.shuttleDropoff,
    outboundState?.shuttlePickup,
    returnState?.shuttleDropoff,
    returnState?.shuttlePickup,
    selectedShuttleDropoff,
    selectedShuttlePickup,
    shuttleChangeDirection,
    t,
  ]);

  const isSeatConflict = bookingError?.code === 'BOOKING_SEAT_UNAVAILABLE';
  const isRoundTripInvalid = bookingError?.code === 'BOOKING_ROUND_TRIP_INVALID';
  const isReturnRouteMissing = bookingError?.code === 'ROUTE_RETURN_NOT_CONFIGURED';
  const seatConflictActions = useMemo<ShuttleEditAction[]>(() => {
    if (!onGoToStep) {
      return [];
    }

    if (isReturnRouteMissing) {
      return [{
        key: 'reselect-outbound-trip',
        label: t('booking.paymentScreen.reselectOutboundTrip'),
        onPress: () => {
          restoreLegForEdit('outbound');
          onGoToStep(1);
        },
      }];
    }

    if (isRoundTripInvalid && isRoundTrip) {
      return [{
        key: 'reselect-return-trip',
        label: t('booking.paymentScreen.reselectReturnTrip'),
        onPress: () => {
          restoreLegForEdit('return');
          // Return trip list is the first return-leg step (after outbound 1–4).
          onGoToStep(OUTBOUND_STEPS + 1);
        },
      }];
    }

    if (!isSeatConflict || seatConflictLegs.length === 0) {
      return [];
    }

    if (!isRoundTrip) {
      return [{
        key: 'reselect-seats',
        label: t('booking.paymentScreen.reselectSeats'),
        onPress: () => {
          restoreLegForEdit('outbound');
          onGoToStep(OUTBOUND_SEAT_STEP);
        },
      }];
    }

    const actions: ShuttleEditAction[] = [];
    if (seatConflictLegs.includes('outbound')) {
      actions.push({
        key: 'reselect-outbound-seats',
        label: t('booking.paymentScreen.reselectOutboundSeats'),
        onPress: () => {
          restoreLegForEdit('outbound');
          onGoToStep(OUTBOUND_SEAT_STEP);
        },
      });
    }
    if (seatConflictLegs.includes('return')) {
      actions.push({
        key: 'reselect-return-seats',
        label: t('booking.paymentScreen.reselectReturnSeats'),
        onPress: () => {
          restoreLegForEdit('return');
          onGoToStep(RETURN_SEAT_STEP);
        },
      });
    }
    return actions;
  }, [
    isReturnRouteMissing,
    isRoundTrip,
    isRoundTripInvalid,
    isSeatConflict,
    onGoToStep,
    restoreLegForEdit,
    seatConflictLegs,
    t,
  ]);

  const handlePayNow = useCallback(() => {
    if (!isSubmitting && !cannotSubmitWallet) {
      onNext();
    }
  }, [cannotSubmitWallet, isSubmitting, onNext]);

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
  const selectWallet = useCallback(() => {
    if (!walletDisabled) {
      setPaymentMethod('wallet');
    }
  }, [setPaymentMethod, walletDisabled]);

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
        <View style={styles.journeyHeading}>
          <Text style={styles.journeyTitle}>
            {searchParams.isRoundTrip
              ? t('booking.paymentScreen.roundTripJourney')
              : t('booking.paymentScreen.routeInformation')}
          </Text>
          {searchParams.isRoundTrip ? (
            <Text style={styles.journeySubtitle}>
              {t('booking.paymentScreen.roundTripPaymentNotice')}
            </Text>
          ) : null}
        </View>

        {!searchParams.isRoundTrip ? (
          <BookingLegSummaryCard
            title={t('booking.checkout.departureTrip')}
            leg={oneWayLeg}
          />
        ) : null}
        {searchParams.isRoundTrip && outboundState ? (
          <BookingLegSummaryCard
            title={t('booking.checkout.departureTrip')}
            leg={outboundState}
          />
        ) : null}
        {searchParams.isRoundTrip && returnState ? (
          <BookingLegSummaryCard
            title={t('booking.checkout.returnTrip')}
            leg={returnState}
          />
        ) : null}

        <View style={styles.bentoSummaryCard} accessibilityRole="radiogroup">
          <Text style={styles.bentoCardHeading}>{t('booking.paymentScreen.method')}</Text>
          <PaymentOption
            selected={paymentMethod === 'vnpay'}
            label={t('booking.paymentScreen.vnpayLabel')}
            sub={t('booking.paymentScreen.vnpayDescription')}
            Icon={QrCode}
            iconColor={theme.accents.finance.foreground}
            onSelect={selectVnpay}
          />
          <PaymentOption
            selected={paymentMethod === 'wallet'}
            disabled={walletDisabled}
            label={t('booking.paymentScreen.walletLabel')}
            sub={walletSubtitle}
            Icon={Wallet}
            iconColor={theme.accents.finance.foreground}
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
              {t('booking.paymentScreen.baseFare', { count: seatBadges.length })}
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
            <View style={styles.shuttleErrorBlock}>
              <Text style={styles.submitErrorText}>{bookingErrorMessage}</Text>
              {(shuttleEditActions.length > 0 || seatConflictActions.length > 0) ? (
                <View style={styles.shuttleErrorActions}>
                  {[...shuttleEditActions, ...seatConflictActions].map((action) => (
                    <Pressable
                      key={action.key}
                      accessibilityRole="button"
                      onPress={action.onPress}
                      style={({ pressed }) => [
                        styles.changeAddressButton,
                        pressed ? styles.changeAddressPressed : null,
                      ]}
                    >
                      <Text style={styles.changeAddressText}>{action.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <FloatingActionBar
        seatBadges={seatBadges}
        totalPrice={finalPrice}
        ctaLabel={isSubmitting
          ? t('booking.paymentScreen.processing')
          : paymentMethod === 'vnpay'
            ? t('booking.paymentScreen.payWithVnpay')
            : t('booking.paymentScreen.confirmBooking')}
        onPress={handlePayNow}
        disabled={isSubmitting || baseFare <= 0 || cannotSubmitWallet}
      />
    </View>
  );
}

interface PaymentOptionProps {
  selected: boolean;
  disabled?: boolean;
  label: string;
  sub: string;
  Icon: React.ElementType;
  iconColor: string;
  onSelect: () => void;
}

const PaymentOption = memo(function PaymentOptionComponent({
  selected,
  disabled = false,
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
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.paymentOption,
        selected ? styles.paymentOptionActive : null,
        disabled ? styles.paymentOptionDisabled : null,
        pressed && !disabled ? styles.paymentOptionPressed : null,
      ]}
      onPress={onSelect}
    >
      <View style={[
        styles.paymentRadio,
        selected ? styles.paymentRadioActive : null,
      ]}>
        {selected ? <View style={styles.paymentRadioDot} /> : null}
      </View>
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
    borderColor: theme.accents.finance.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  journeyHeading: {
    marginBottom: spacing.sm,
  },
  journeyTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  journeySubtitle: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  bentoCardHeading: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    marginBottom: spacing.md,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.effects.contentSurfaceSoft,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.effects.contentBorder,
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
    borderColor: theme.effects.contentBorderStrong,
    backgroundColor: theme.effects.contentSurface,
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
  paymentRadioActive: {
    borderColor: theme.colors.primary,
  },
  paymentIconBackground: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: theme.accents.finance.soft,
    borderWidth: 1,
    borderColor: theme.accents.finance.border,
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
    color: theme.accents.finance.foreground,
  },
  submitErrorText: {
    marginTop: spacing.md,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.error,
    lineHeight: 18,
  },
  shuttleErrorBlock: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  shuttleErrorActions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
  },
  changeAddressButton: {
    alignSelf: 'flex-start' as const,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.primaryFaded,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    minHeight: 44,
    justifyContent: 'center' as const,
  },
  changeAddressPressed: {
    opacity: 0.82,
  },
  changeAddressText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
});
