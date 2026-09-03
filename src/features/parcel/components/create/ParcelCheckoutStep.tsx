import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
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
  AddressBook,
  Check,
  Clock,
  LockKey,
  MapPin,
  PencilSimple,
  Star,
  Truck,
} from 'phosphor-react-native';

import {
  AppKeyboardAwareScrollView,
  Input,
  PhotoPicker,
} from '@shared/components';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useResponsiveLayout, useThemedStyles } from '@shared/hooks';
import { showSnackbar } from '@shared/store/useSnackbarStore';
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
import { SavedRecipientsModal } from '../SavedRecipientsModal';
import {
  getSavedRecipientsErrorKey,
  selectSortedRecipients,
  useSavedRecipientsStore,
} from '../../store/useSavedRecipientsStore';
import type { SavedRecipient } from '../../types/savedRecipient';
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
  onChangeDeliveryOption: () => void;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  onRecipientNameChange: (value: string) => void;
  onRecipientPhoneChange: (value: string) => void;
  onRecipientEmailChange: (value: string) => void;
  recipientErrors: { name?: string; phone?: string; email?: string };
  saveRecipient?: boolean;
  onSaveRecipientChange?: (value: boolean) => void;
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
  onChangeDeliveryOption,
  recipientName,
  recipientPhone,
  recipientEmail,
  onRecipientNameChange,
  onRecipientPhoneChange,
  onRecipientEmailChange,
  recipientErrors,
  saveRecipient = true,
  onSaveRecipientChange,
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
  const [bottomBarHeight, setBottomBarHeight] = useState(80);
  const [showRecipientsModal, setShowRecipientsModal] = useState(false);

  const recipients = useSavedRecipientsStore(state => state.recipients);
  const hydrationStatus = useSavedRecipientsStore(state => state.hydrationStatus);
  const loadRecipients = useSavedRecipientsStore(state => state.loadRecipients);
  const touchRecipient = useSavedRecipientsStore(state => state.touchRecipient);

  React.useEffect(() => {
    if (hydrationStatus === 'idle') {
      loadRecipients().catch(error => {
        showSnackbar({
          message: t(getSavedRecipientsErrorKey(error)),
          tone: 'error',
        });
      });
    }
  }, [hydrationStatus, loadRecipients, t]);

  const quickRecipients = useMemo(() => {
    return selectSortedRecipients(recipients).slice(0, 5);
  }, [recipients]);

  const handleSelectRecipient = useCallback(
    (recipient: SavedRecipient) => {
      onRecipientNameChange(recipient.fullName);
      onRecipientPhoneChange(recipient.phoneNumber);
      if (recipient.email) {
        onRecipientEmailChange(recipient.email);
      }
      touchRecipient(recipient.id).catch(error => {
        showSnackbar({
          message: t(getSavedRecipientsErrorKey(error)),
          tone: 'error',
        });
      });
    },
    [onRecipientNameChange, onRecipientPhoneChange, onRecipientEmailChange, touchRecipient, t],
  );

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
  const scrollContentStyle = useMemo(
    () => [
      styles.scrollContent,
      isCompact ? styles.scrollContentCompact : null,
      { paddingBottom: bottomBarHeight + spacing.lg },
    ],
    [bottomBarHeight, isCompact, styles],
  );

  return (
    <View style={styles.container}>
      <AppKeyboardAwareScrollView
        testID="parcel-checkout-scroll-view"
        bottomOffset={bottomBarHeight + spacing.md}
        contentContainerStyle={scrollContentStyle}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Selected Delivery Option Summary */}
        {trip && dropoffPoint ? (
          <View style={styles.card}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.cardSectionTitle, styles.sectionTitleGrow]}>
                {t('parcel.checkout.deliverySummary')}
              </Text>
              <Pressable
                testID="parcel-change-delivery-option"
                accessibilityRole="button"
                accessibilityLabel={t('parcel.actions.changeDeliveryOption')}
                accessibilityState={{ disabled: intentLocked }}
                disabled={intentLocked}
                onPress={onChangeDeliveryOption}
                style={({ pressed }) => [
                  styles.changeOptionButton,
                  intentLocked ? styles.changeOptionButtonDisabled : null,
                  pressed && !intentLocked ? styles.pressed : null,
                ]}
              >
                <PencilSimple
                  size={14}
                  color={theme.colors.primary}
                  weight="bold"
                />
                <Text style={styles.changeOptionText}>
                  {t('parcel.actions.changeDeliveryOptionShort')}
                </Text>
              </Pressable>
            </View>
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
              <Truck
                size={16}
                color={theme.colors.textSecondary}
                weight="duotone"
              />
              <Text style={styles.optionOperator} numberOfLines={1}>
                {trip.operatorName?.trim() ||
                  t('parcel.trips.operatorUnavailable')}
              </Text>
              <Text style={styles.optionRoute} numberOfLines={1}>
                · {trip.originStation.name} → {trip.destinationStation.name}
              </Text>
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>{t('parcel.route.from')}</Text>
                <Text style={styles.timeValue}>
                  {formatDateTime(trip.departureDateTime) ||
                    trip.departureDateTime}
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
                  {formatDateTime(dropoffPoint.estimatedArrivalTime) ||
                    dropoffPoint.estimatedArrivalTime}
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
          <View style={styles.recipientHeaderRow}>
            <Text style={styles.cardSectionTitle}>
              {t('parcel.form.recipientTitle')}
            </Text>
            <Pressable
              testID="open-saved-recipients-button"
              style={styles.addressBookButton}
              onPress={() => setShowRecipientsModal(true)}
              accessibilityRole="button"
              accessibilityLabel={t('parcel.recipients.openBook')}
            >
              <AddressBook size={15} color={theme.colors.primary} weight="bold" />
              <Text style={styles.addressBookButtonText}>
                {t('parcel.recipients.openBook')}
              </Text>
            </Pressable>
          </View>

          {/* Quick pick recipient chips */}
          {quickRecipients.length > 0 ? (
            <View style={styles.quickPickContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickPickScroll}
              >
                {quickRecipients.map(r => {
                  const isSelected =
                    recipientPhone.trim() === r.phoneNumber.trim() &&
                    recipientName.trim() === r.fullName.trim();
                  return (
                    <Pressable
                      key={r.id}
                      testID={`quick-recipient-chip-${r.id}`}
                      style={[
                        styles.quickChip,
                        isSelected && styles.quickChipSelected,
                      ]}
                      onPress={() => handleSelectRecipient(r)}
                      accessibilityRole="button"
                      accessibilityLabel={`${r.fullName}, ${r.phoneNumber}`}
                    >
                      {r.isDefault ? (
                        <Star
                          size={11}
                          color={theme.colors.warningForeground}
                          weight="fill"
                        />
                      ) : null}
                      <Text
                        style={[
                          styles.quickChipText,
                          isSelected && styles.quickChipTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {r.fullName}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

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

          {onSaveRecipientChange ? (
            <Pressable
              testID="save-recipient-checkbox"
              style={styles.saveRecipientRow}
              onPress={() => onSaveRecipientChange(!saveRecipient)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: Boolean(saveRecipient) }}
            >
              <View
                style={[
                  styles.checkboxBox,
                  saveRecipient && styles.checkboxBoxChecked,
                ]}
              >
                {saveRecipient ? (
                  <Check
                    size={11}
                    color={theme.colors.textInverse}
                    weight="bold"
                  />
                ) : null}
              </View>
              <Text style={styles.saveRecipientText}>
                {t('parcel.recipients.saveForNextTime')}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <SavedRecipientsModal
          visible={showRecipientsModal}
          onClose={() => setShowRecipientsModal(false)}
          onSelectRecipient={handleSelectRecipient}
          mode="picker"
        />

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
      </AppKeyboardAwareScrollView>

      {/* Sticky Bottom Action Bar */}
      <View
        style={styles.bottomBar}
        onLayout={({ nativeEvent }) => {
          setBottomBarHeight(Math.ceil(nativeEvent.layout.height));
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('parcel.actions.createAndPay')}
          accessibilityState={{
            disabled: !canSubmit || isSubmitting || intentLocked,
          }}
          disabled={!canSubmit || isSubmitting || intentLocked}
          style={({ pressed }) => [
            styles.submitButton,
            !canSubmit || isSubmitting || intentLocked
              ? styles.submitButtonDisabled
              : null,
            pressed && canSubmit && !isSubmitting && !intentLocked
              ? styles.pressed
              : null,
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
  recipientHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  addressBookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
  },
  addressBookButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  quickPickContainer: {
    marginTop: -spacing.xs,
    marginBottom: spacing.xs,
  },
  quickPickScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxWidth: 160,
  },
  quickChipSelected: {
    backgroundColor: theme.colors.primaryFaded,
    borderColor: theme.colors.primary,
  },
  quickChipText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    flexShrink: 1,
  },
  quickChipTextSelected: {
    fontFamily: fontFamilies.bold,
    color: theme.colors.primary,
  },
  saveRecipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  checkboxBoxChecked: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  saveRecipientText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  sectionTitleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitleGrow: {
    flex: 1,
    minWidth: 0,
  },
  changeOptionButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
  },
  changeOptionButtonDisabled: {
    opacity: 0.5,
  },
  changeOptionText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
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
