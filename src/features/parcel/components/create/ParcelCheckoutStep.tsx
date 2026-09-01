import React, { memo, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  LockKey,
  MapPin,
  Truck,
} from 'phosphor-react-native';

import { Input, PhotoPicker } from '@shared/components';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useResponsiveLayout, useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import type { PromoOffer } from '@shared/utils/promo';
import { formatDateTime } from '@shared/utils/format';
import { formatParcelDimensions } from '../../config/parcelPackage';
import { PricingBreakdown } from '../PricingBreakdown';
import type { ParcelDimensions } from '../../config/parcelPackage';
import type {
  ParcelAvailableVoucher,
  ParcelPaymentMethod,
  ParcelSize,
} from '../../types';
import type { ParcelDeliveryOption } from '../../utils/parcelDeliveryOptions';
import type { AmbiguousRetryState } from '../../utils/parcelCreateErrors';
import { canSubmitStep4 } from '../../utils/parcelCreateFlow';

export interface ParcelCheckoutStepProps {
  selectedOption: ParcelDeliveryOption | null;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  onRecipientNameChange: (value: string) => void;
  onRecipientPhoneChange: (value: string) => void;
  onRecipientEmailChange: (value: string) => void;
  recipientErrors: { name?: string; phone?: string; email?: string };
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  isPhotoUploading: boolean;
  estimatedValue: string;
  onEstimatedValueChange: (value: string) => void;
  receivingStation?: { name?: string; city?: string };
  toCity: string;
  packageSize: ParcelSize;
  parcelItemName: string;
  estimatedWeightKg: number;
  dimensions: ParcelDimensions;
  quotePricing: {
    grossPriceVnd: number;
    discountAmountVnd: number;
    totalAfterDiscountVnd: number;
    depositPercent: number;
  };
  depositDue: number;
  promoCode: string;
  selectedVoucher: ParcelAvailableVoucher | null;
  onPromoCodeChange: (text: string) => void;
  onPromoApply: (code: string, promo?: PromoOffer) => boolean | void;
  availablePromos: PromoOffer[];
  appliedPromo: PromoOffer | null;
  promoError?: string;
  paymentMethod: ParcelPaymentMethod;
  onPaymentMethodChange: (method: ParcelPaymentMethod) => void;
  walletBalance?: number;
  walletIsLoading: boolean;
  walletHasError: boolean;
  ambiguousRetry: AmbiguousRetryState;
  onRetryAmbiguous: () => void;
  intentLocked: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
}

function ParcelCheckoutStepComponent({
  selectedOption,
  recipientName,
  recipientPhone,
  recipientEmail,
  onRecipientNameChange,
  onRecipientPhoneChange,
  onRecipientEmailChange,
  recipientErrors,
  photos,
  onPhotosChange,
  isPhotoUploading,
  estimatedValue,
  onEstimatedValueChange,
  receivingStation,
  toCity,
  packageSize,
  parcelItemName,
  estimatedWeightKg,
  dimensions,
  quotePricing,
  depositDue,
  promoCode,
  selectedVoucher,
  onPromoCodeChange,
  onPromoApply,
  availablePromos,
  appliedPromo,
  promoError,
  paymentMethod,
  onPaymentMethodChange,
  walletBalance,
  walletIsLoading,
  walletHasError,
  ambiguousRetry,
  onRetryAmbiguous,
  intentLocked,
  isSubmitting,
  onSubmit,
}: ParcelCheckoutStepProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const { isCompact } = useResponsiveLayout();

  const recipientNameRef = useRef<TextInput>(null);
  const recipientPhoneRef = useRef<TextInput>(null);
  const recipientEmailRef = useRef<TextInput>(null);

  const canSubmit = canSubmitStep4({
    recipientName,
    recipientPhone,
    recipientEmail,
    hasSelectedOption: Boolean(selectedOption),
    isQuoteUsable: Boolean(selectedOption),
    promoError,
    isPhotoUploading,
    isCreating: isSubmitting,
    isPaying: false,
  });

  const trip = selectedOption?.trip;
  const dropoffPoint = selectedOption?.dropoffPoint;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isCompact ? styles.scrollContentCompact : null,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Selected Delivery Option Summary */}
        {trip && dropoffPoint ? (
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>
              {t('parcel.checkout.deliverySummary')}
            </Text>
            <View style={styles.optionHeaderRow}>
              <View style={styles.optionBadge}>
                <MapPin size={12} color={theme.colors.primary} weight="fill" />
                <Text style={styles.optionBadgeText}>
                  {dropoffPoint.type === 'STOP'
                    ? t('parcel.delivery.dropoffStopBadge')
                    : t('parcel.delivery.dropoffStationBadge')}
                </Text>
              </View>
              <Text style={styles.optionPointName} numberOfLines={2}>
                {dropoffPoint.name}
              </Text>
            </View>

            <View style={styles.optionMetaRow}>
              <Truck size={16} color={theme.colors.textSecondary} weight="duotone" />
              <Text style={styles.optionOperator} numberOfLines={1}>
                {trip.operatorName?.trim() || t('parcel.trips.operatorUnavailable')}
              </Text>
              <Text style={styles.optionRoute} numberOfLines={1}>
                · {trip.originStation.name} → {trip.destinationStation.name}
              </Text>
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>{t('parcel.route.from')}</Text>
                <Text style={styles.timeValue}>
                  {formatDateTime(trip.departureDateTime) || trip.departureDateTime}
                </Text>
                <Text style={styles.stationSubtitle} numberOfLines={1}>
                  {trip.originStation.name}
                </Text>
              </View>

              <View style={styles.timeDivider}>
                <Clock size={14} color={theme.colors.textTertiary} />
              </View>

              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>{t('parcel.route.to')}</Text>
                <Text style={styles.timeValue}>
                  {formatDateTime(dropoffPoint.estimatedArrivalTime) || dropoffPoint.estimatedArrivalTime}
                </Text>
                <Text style={styles.stationSubtitle} numberOfLines={1}>
                  {dropoffPoint.name}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Recipient Information Form */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>
            {t('parcel.form.recipientTitle')}
          </Text>
          <Input
            ref={recipientNameRef}
            label={t('parcel.form.fullNameLabel')}
            placeholder={t('parcel.form.fullNamePlaceholder')}
            maxLength={255}
            value={recipientName}
            error={recipientErrors.name}
            required
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => recipientPhoneRef.current?.focus()}
            onChangeText={onRecipientNameChange}
            accessibilityLabel={t('parcel.form.fullNameLabel')}
          />
          <Input
            ref={recipientPhoneRef}
            label={t('parcel.form.phoneLabel')}
            placeholder={t('parcel.form.phonePlaceholder')}
            keyboardType="phone-pad"
            maxLength={20}
            value={recipientPhone}
            error={recipientErrors.phone}
            required
            returnKeyType="next"
            onSubmitEditing={() => recipientEmailRef.current?.focus()}
            onChangeText={onRecipientPhoneChange}
            accessibilityLabel={t('parcel.form.phoneLabel')}
          />
          <Input
            ref={recipientEmailRef}
            label={t('parcel.form.emailLabel')}
            placeholder={t('parcel.form.emailPlaceholder')}
            keyboardType="email-address"
            maxLength={255}
            value={recipientEmail}
            error={recipientErrors.email}
            autoCapitalize="none"
            required
            onChangeText={onRecipientEmailChange}
            accessibilityLabel={t('parcel.form.emailLabel')}
          />
        </View>

        {/* Optional Photos & Declared Value */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>
            {t('parcel.checkout.optionalDetails')}
          </Text>
          <PhotoPicker
            value={photos}
            onChange={onPhotosChange}
            disabled={isPhotoUploading || isSubmitting}
            maxPhotos={1}
            photoLabel={t('parcel.form.photoLabel')}
            title={t('parcel.form.photoTitle')}
            helperText={t('parcel.form.photoHelper')}
          />

          <Input
            label={t('parcel.form.estimatedValueLabel')}
            placeholder={t('parcel.form.estimatedValuePlaceholder')}
            keyboardType="numeric"
            maxLength={15}
            value={estimatedValue}
            onChangeText={onEstimatedValueChange}
            hint={t('parcel.form.estimatedValueHint')}
            accessibilityLabel={t('parcel.form.estimatedValueLabel')}
          />
        </View>

        {/* Pricing Breakdown, Vouchers, & Payment Methods */}
        <PricingBreakdown
          receivingStation={receivingStation}
          dropoffStation={{
            name: dropoffPoint?.name ?? toCity,
            city: toCity,
          }}
          packageSize={packageSize}
          packageItemName={parcelItemName}
          packageWeightKg={estimatedWeightKg}
          dimensionsLabel={formatParcelDimensions(dimensions)}
          grossPrice={quotePricing.grossPriceVnd}
          discountAmount={quotePricing.discountAmountVnd}
          totalAfterDiscount={quotePricing.totalAfterDiscountVnd}
          depositPercent={quotePricing.depositPercent}
          depositDue={depositDue}
          promoCode={promoCode}
          promoApplied={Boolean(selectedVoucher)}
          onPromoCodeChange={onPromoCodeChange}
          onPromoApplyCode={onPromoApply}
          availablePromos={availablePromos}
          selectedPromoCode={appliedPromo?.code}
          appliedPromoLabel={
            selectedVoucher
              ? t('parcel.promos.appliedCode', { code: selectedVoucher.code })
              : undefined
          }
          promoError={promoError}
          paymentMethod={paymentMethod}
          disabled={intentLocked}
          onPaymentMethodChange={onPaymentMethodChange}
          walletBalance={walletBalance}
          walletIsLoading={walletIsLoading}
          walletHasError={walletHasError}
        />

        {/* Ambiguous Request Retry Card */}
        {ambiguousRetry ? (
          <View style={styles.ambiguousRetryCard}>
            <Text style={styles.ambiguousRetryText}>
              {ambiguousRetry.kind === 'deposit'
                ? t('parcel.errors.ambiguousPaymentDescription')
                : t('parcel.errors.ambiguousRequestDescription')}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('parcel.actions.retryPreviousRequest')}
              disabled={isPhotoUploading || isSubmitting}
              onPress={onRetryAmbiguous}
              style={({ pressed }) => [
                styles.ambiguousRetryButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.ambiguousRetryButtonText}>
                {t('parcel.actions.retryPreviousRequest')}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('parcel.actions.createAndPay')}
          accessibilityState={{ disabled: !canSubmit || isSubmitting || intentLocked }}
          disabled={!canSubmit || isSubmitting || intentLocked}
          style={({ pressed }) => [
            styles.submitButton,
            (!canSubmit || isSubmitting || intentLocked) ? styles.submitButtonDisabled : null,
            pressed && canSubmit && !isSubmitting && !intentLocked ? styles.pressed : null,
          ]}
          onPress={onSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <LockKey size={18} color={theme.colors.textInverse} weight="bold" />
          )}
          <Text style={styles.submitButtonText}>
            {t('parcel.actions.createAndPay')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export const ParcelCheckoutStep = memo(ParcelCheckoutStepComponent);

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 110,
    gap: spacing.lg,
  },
  scrollContentCompact: {
    paddingHorizontal: spacing.md,
  },
  card: {
    ...theme.components.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardSectionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  optionHeaderRow: {
    gap: 4,
  },
  optionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: theme.colors.primaryFaded,
  },
  optionBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs - 2,
    color: theme.colors.primary,
  },
  optionPointName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  optionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  optionOperator: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
  },
  optionRoute: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  timeBlock: {
    flex: 1,
  },
  timeLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs - 2,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase' as const,
  },
  timeValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  stationSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs - 2,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  timeDivider: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  ambiguousRetryCard: {
    ...theme.components.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderColor: theme.colors.warning,
    borderWidth: 1.5,
  },
  ambiguousRetryText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  ambiguousRetryButton: {
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambiguousRetryButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textInverse,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primary,
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.textDisabled,
  },
  submitButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
