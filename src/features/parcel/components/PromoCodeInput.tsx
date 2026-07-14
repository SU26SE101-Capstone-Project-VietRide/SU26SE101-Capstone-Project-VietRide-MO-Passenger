import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CaretRight,
  Check,
  Clock,
  Gift,
  Tag,
  X,
} from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { formatVnd } from '@shared/utils/format';
import type { PromoOffer } from '@shared/utils/promo';
import {
  formatPromoExpiry,
  normalizePromoCode,
} from '@shared/utils/promo';

export interface PromoCodeInputProps {
  code: string;
  onChange: (text: string) => void;
  applied: boolean;
  onApplyCode: (code: string, promo?: PromoOffer) => boolean | void;
  promos?: PromoOffer[];
  selectedPromoCode?: string;
  appliedLabel?: string;
  errorText?: string;
}

export const PromoCodeInput = memo(function PromoCodeInputComponent({
  code,
  onChange,
  applied,
  onApplyCode,
  promos = [],
  selectedPromoCode,
  appliedLabel,
  errorText,
}: PromoCodeInputProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [draftCode, setDraftCode] = useState(code);

  useEffect(() => {
    if (pickerVisible) {
      setDraftCode(code);
    }
  }, [code, pickerVisible]);

  const normalizedSelectedCode = useMemo(
    () => (selectedPromoCode ? normalizePromoCode(selectedPromoCode) : ''),
    [selectedPromoCode],
  );

  const displayCode = normalizePromoCode(code);
  const statusText = applied
    ? appliedLabel || `${displayCode} Applied`
    : 'Choose available promo or enter code';

  const closePicker = useCallback(() => {
    setPickerVisible(false);
  }, []);

  const openPicker = useCallback(() => {
    setPickerVisible(true);
  }, []);

  const handleDraftChange = useCallback((text: string) => {
    const normalizedText = text.toUpperCase();
    setDraftCode(normalizedText);
    onChange(normalizedText);
  }, [onChange]);

  const handleApplyDraft = useCallback(() => {
    const normalizedCode = normalizePromoCode(draftCode);

    if (!normalizedCode) {
      return;
    }

    const appliedSuccessfully = onApplyCode(normalizedCode);
    if (appliedSuccessfully !== false) {
      closePicker();
    }
  }, [closePicker, draftCode, onApplyCode]);

  const handleSelectPromo = useCallback((promo: PromoOffer) => {
    onChange(promo.code);
    const appliedSuccessfully = onApplyCode(promo.code, promo);
    if (appliedSuccessfully !== false) {
      closePicker();
    }
  }, [closePicker, onApplyCode, onChange]);

  const hasPromos = promos.length > 0;
  const canApplyDraft = normalizePromoCode(draftCode).length > 0;

  return (
    <View style={styles.bentoSummaryCard}>
      <View style={styles.cardHeader}>
        <View style={styles.headingBlock}>
          <Text style={styles.bentoCardHeading}>Promo Code</Text>
          <Text style={styles.cardSubtitle}>Save with vouchers before payment</Text>
        </View>
        <View style={styles.headerIconBubble}>
          <Gift size={18} color={theme.colors.primary} weight="duotone" />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose or enter promo code"
        onPress={openPicker}
        style={({ pressed }) => [
          styles.promoTrigger,
          applied ? styles.promoTriggerApplied : null,
          pressed ? styles.promoTriggerPressed : null,
        ]}
      >
        <View style={styles.triggerIcon}>
          {applied ? (
            <Check size={16} color={theme.colors.success} weight="bold" />
          ) : (
            <Tag size={16} color={theme.colors.primary} weight="duotone" />
          )}
        </View>
        <View style={styles.triggerTextBlock}>
          <Text style={[styles.triggerTitle, applied ? styles.triggerTitleApplied : null]} numberOfLines={1}>
            {applied && displayCode ? displayCode : 'Add promo code'}
          </Text>
          <Text style={styles.triggerSubtitle} numberOfLines={1}>
            {statusText}
          </Text>
        </View>
        <CaretRight size={18} color={theme.colors.textTertiary} weight="bold" />
      </Pressable>

      {errorText ? (
        <Text style={styles.errorText}>{errorText}</Text>
      ) : null}

      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closePicker}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalRoot}
        >
          <Pressable style={styles.modalBackdrop} onPress={closePicker} />
          <View style={styles.promoSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={styles.headingBlock}>
                <Text style={styles.sheetTitle}>Choose Promo</Text>
                <Text style={styles.sheetSubtitle}>Apply an available voucher or enter a code.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close promo picker"
                onPress={closePicker}
                style={({ pressed }) => [styles.closeButton, pressed ? styles.closeButtonPressed : null]}
              >
                <X size={18} color={theme.colors.textPrimary} weight="bold" />
              </Pressable>
            </View>

            <View style={styles.manualCard}>
              <Text style={styles.manualLabel}>Enter code directly</Text>
              <View style={styles.manualRow}>
                <TextInput
                  style={styles.promoInput}
                  value={draftCode}
                  onChangeText={handleDraftChange}
                  placeholder="PROMO CODE"
                  placeholderTextColor={theme.colors.textTertiary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleApplyDraft}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={handleApplyDraft}
                  disabled={!canApplyDraft}
                  style={({ pressed }) => [
                    styles.applyButton,
                    !canApplyDraft ? styles.applyButtonDisabled : null,
                    pressed && canApplyDraft ? styles.applyButtonPressed : null,
                  ]}
                >
                  <Text style={styles.applyButtonText}>Apply</Text>
                </Pressable>
              </View>
              {errorText ? (
                <Text style={styles.sheetErrorText}>{errorText}</Text>
              ) : null}
            </View>

            <Text style={styles.availableTitle}>Available vouchers</Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.promoListContent}
            >
              {hasPromos ? (
                promos.map((promo) => {
                  const isSelected = normalizedSelectedCode === normalizePromoCode(promo.code);
                  const minimumSpendText = promo.minimumSpend
                    ? `Min spend ${formatVnd(promo.minimumSpend, { clampNegative: true })}`
                    : 'No minimum spend';

                  return (
                    <Pressable
                      key={promo.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => handleSelectPromo(promo)}
                      style={({ pressed }) => [
                        styles.promoOption,
                        isSelected ? styles.promoOptionSelected : null,
                        pressed ? styles.promoOptionPressed : null,
                      ]}
                    >
                      <View style={styles.promoOptionTopRow}>
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountBadgeText}>{promo.discountLabel}</Text>
                        </View>
                        {isSelected ? (
                          <View style={styles.selectedBadge}>
                            <Check size={12} color={theme.colors.success} weight="bold" />
                            <Text style={styles.selectedBadgeText}>Applied</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.promoTitle} numberOfLines={1}>
                        {promo.title}
                      </Text>
                      <Text style={styles.promoDescription} numberOfLines={2}>
                        {promo.description}
                      </Text>
                      <View style={styles.promoMetaRow}>
                        <View style={styles.expiryMeta}>
                          <Clock size={13} color={theme.colors.textTertiary} weight="bold" />
                          <Text style={styles.promoMetaText}>Expires {formatPromoExpiry(promo.expiresAt)}</Text>
                        </View>
                        <Text style={styles.promoMetaText}>{minimumSpendText}</Text>
                      </View>
                    </Pressable>
                  );
                })
              ) : (
                <View style={styles.emptyPromoBox}>
                  <View style={styles.emptyPromoIcon}>
                    <Gift size={24} color={theme.colors.primary} weight="duotone" />
                  </View>
                  <Text style={styles.emptyPromoTitle}>No vouchers available</Text>
                  <Text style={styles.emptyPromoText}>
                    Enter a promo code manually if you received one, or check back later for new offers.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  bentoSummaryCard: {
    ...theme.components.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headingBlock: {
    flex: 1,
    minWidth: 0,
  },
  bentoCardHeading: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  cardSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  headerIconBubble: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoTrigger: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.effects.isLiquid ? theme.effects.fieldSurface : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.fieldBorder : theme.colors.divider,
  },
  promoTriggerApplied: {
    borderColor: theme.colors.success,
    backgroundColor: theme.isDark ? 'rgba(52, 211, 153, 0.13)' : 'rgba(16, 185, 129, 0.1)',
  },
  promoTriggerPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  triggerIcon: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surface,
  },
  triggerTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  triggerTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  triggerTitleApplied: {
    color: theme.colors.success,
  },
  triggerSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  errorText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.error,
    marginTop: spacing.sm,
  },
  sheetErrorText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.error,
    marginTop: spacing.sm,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: theme.isDark ? 'rgba(1, 10, 10, 0.66)' : 'rgba(19, 33, 31, 0.42)',
  },
  promoSheet: {
    maxHeight: '82%',
    backgroundColor: theme.isDark ? 'rgba(9, 27, 26, 0.98)' : 'rgba(252, 255, 255, 0.99)',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    ...theme.effects.floatingShadow,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.divider,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.textPrimary,
  },
  sheetSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.96 }],
  },
  manualCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    marginBottom: spacing.lg,
  },
  manualLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    marginBottom: spacing.sm,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  promoInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: spacing.md,
    backgroundColor: theme.effects.isLiquid ? theme.effects.fieldSurface : theme.colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.fieldBorder : theme.colors.divider,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  applyButton: {
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonDisabled: {
    opacity: 0.42,
  },
  applyButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  applyButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
  availableTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    marginBottom: spacing.sm,
  },
  promoListContent: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  promoOption: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  promoOptionSelected: {
    borderColor: theme.colors.success,
    backgroundColor: theme.isDark ? 'rgba(52, 211, 153, 0.12)' : 'rgba(16, 185, 129, 0.09)',
  },
  promoOptionPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  promoOptionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  discountBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
  },
  discountBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: theme.isDark ? 'rgba(52, 211, 153, 0.16)' : 'rgba(16, 185, 129, 0.12)',
  },
  selectedBadgeText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.success,
  },
  promoTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  promoDescription: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  promoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  expiryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 0,
  },
  promoMetaText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  emptyPromoBox: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyPromoIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyPromoTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  emptyPromoText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
