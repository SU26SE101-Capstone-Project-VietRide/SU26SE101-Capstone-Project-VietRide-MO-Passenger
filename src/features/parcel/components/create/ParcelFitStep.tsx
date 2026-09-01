import React, { memo, useMemo, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'phosphor-react-native';

import { Input } from '@shared/components';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useResponsiveLayout, useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { CategoryChips } from '../CategoryChips';
import { PackageSizeSelector } from '../PackageSizeSelector';
import { ParcelDimensionsInput } from '../ParcelDimensionsInput';
import { WeightSlider } from '../WeightSlider';
import type { ParcelDimensions } from '../../config/parcelPackage';
import type { ParcelItemCategory } from '../../config/parcelItemCategories';
import type { ParcelSize } from '../../types';

export interface ParcelFitStepProps {
  packageSize: ParcelSize;
  dimensions: ParcelDimensions;
  weight: number;
  category: ParcelItemCategory;
  customItemName: string;
  onSelectPackageSize: (size: ParcelSize) => void;
  onChangeDimensions: (dimensions: ParcelDimensions) => void;
  onChangeWeight: (weight: number) => void;
  onChangeCategory: (category: ParcelItemCategory) => void;
  onChangeCustomItemName: (name: string) => void;
  dimensionsDraftValid: boolean;
  onDimensionsValidityChange: (valid: boolean) => void;
  weightDraftValid: boolean;
  onWeightValidityChange: (valid: boolean) => void;
  customItemNameError?: string;
  onContinue: () => void;
}

function ParcelFitStepComponent({
  packageSize,
  dimensions,
  weight,
  category,
  customItemName,
  onSelectPackageSize,
  onChangeDimensions,
  onChangeWeight,
  onChangeCategory,
  onChangeCustomItemName,
  dimensionsDraftValid,
  onDimensionsValidityChange,
  weightDraftValid,
  onWeightValidityChange,
  customItemNameError,
  onContinue,
}: ParcelFitStepProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const { isCompact } = useResponsiveLayout();
  const customItemNameRef = useRef<TextInput>(null);

  const isOthersCategory = category === 'Others';
  const canContinue = useMemo(() => {
    if (!dimensionsDraftValid || !weightDraftValid) {
      return false;
    }
    if (isOthersCategory && !customItemName.trim()) {
      return false;
    }
    return true;
  }, [
    customItemName,
    dimensionsDraftValid,
    isOthersCategory,
    weightDraftValid,
  ]);

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
        {/* Preset Sizes */}
        <View style={styles.card}>
          <PackageSizeSelector
            packageSize={packageSize}
            onSelect={onSelectPackageSize}
          />
        </View>

        {/* Custom Dimensions */}
        <View style={styles.card}>
          <ParcelDimensionsInput
            value={dimensions}
            onChange={onChangeDimensions}
            onValidityChange={onDimensionsValidityChange}
          />
        </View>

        {/* Weight Slider */}
        <View style={styles.card}>
          <WeightSlider
            valueKg={weight}
            onValueChange={onChangeWeight}
            onValidityChange={onWeightValidityChange}
          />
        </View>

        {/* Item Category */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('parcel.category.title')}</Text>
          <Text style={styles.cardHint}>{t('parcel.category.hint')}</Text>
          <CategoryChips value={category} onChange={onChangeCategory} />

          {isOthersCategory ? (
            <View style={styles.customItemContainer}>
              <Input
                ref={customItemNameRef}
                testID="parcel-custom-item-name-input"
                label={t('parcel.form.customItemNameLabel')}
                placeholder={t('parcel.form.customItemNamePlaceholder')}
                value={customItemName}
                error={customItemNameError}
                required
                onChangeText={onChangeCustomItemName}
                accessibilityLabel={t('parcel.form.customItemNameLabel')}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('parcel.actions.findDeliveryOptions')}
          accessibilityState={{ disabled: !canContinue }}
          disabled={!canContinue}
          style={({ pressed }) => [
            styles.continueButton,
            !canContinue ? styles.continueButtonDisabled : null,
            pressed && canContinue ? styles.pressed : null,
          ]}
          onPress={onContinue}
        >
          <Text style={styles.continueButtonText}>
            {t('parcel.actions.findDeliveryOptions')}
          </Text>
          <ArrowRight size={18} color={theme.colors.textInverse} weight="bold" />
        </Pressable>
      </View>
    </View>
  );
}

export const ParcelFitStep = memo(ParcelFitStepComponent);

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
    gap: spacing.lg,
  },
  scrollContentCompact: {
    paddingHorizontal: spacing.md,
  },
  card: {
    ...theme.components.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  cardHint: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: spacing.xs,
  },
  customItemContainer: {
    marginTop: spacing.sm,
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
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primary,
  },
  continueButtonDisabled: {
    backgroundColor: theme.colors.textDisabled,
  },
  continueButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
