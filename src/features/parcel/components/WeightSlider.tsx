import Slider from '@react-native-community/slider';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { borderRadius, fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import {
  formatParcelMeasurement,
  roundParcelMeasurement,
  sanitizeParcelMeasurementDraft,
} from '../config/parcelPackage';

type WeightUnit = 'kg' | 'lb';

const KG_TO_LB = 2.2046226218;
const SLIDER_MIN_KG = 0.1;
const SLIDER_MAX_KG = 30;
const SLIDER_STEP_KG = 0.1;

export interface WeightSliderProps {
  valueKg: number;
  onValueChange: (valueKg: number) => void;
  onValidityChange?: (isValid: boolean) => void;
}

function toDisplayWeight(valueKg: number, unit: WeightUnit): number {
  return unit === 'kg' ? valueKg : valueKg * KG_TO_LB;
}

function formatWeight(valueKg: number, unit: WeightUnit): string {
  return formatParcelMeasurement(toDisplayWeight(valueKg, unit));
}

function parseWeightKg(value: string, unit: WeightUnit): number | null {
  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return roundParcelMeasurement(unit === 'kg' ? parsed : parsed / KG_TO_LB);
}

function clampToSliderRange(valueKg: number): number {
  return Math.min(Math.max(valueKg, SLIDER_MIN_KG), SLIDER_MAX_KG);
}

export const WeightSlider = memo(function WeightSliderComponent({
  valueKg,
  onValueChange,
  onValidityChange,
}: WeightSliderProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [inputDraft, setInputDraft] = useState(() =>
    formatWeight(valueKg, 'kg'),
  );
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setInputDraft(formatWeight(valueKg, unit));
    }
  }, [isEditing, unit, valueKg]);

  const handleInputChange = useCallback(
    (text: string) => {
      const sanitizedDraft = sanitizeParcelMeasurementDraft(text);
      setInputDraft(sanitizedDraft);

      // Keep the canonical store current even when tapping "Next" does not
      // blur TextInput on a physical device. Slider movement still commits
      // only once in onSlidingComplete, so dragging never drives JS renders.
      const parsedKg = parseWeightKg(sanitizedDraft, unit);
      onValidityChange?.(parsedKg !== null);
      if (parsedKg !== null && parsedKg !== valueKg) {
        onValueChange(parsedKg);
      }
    },
    [onValidityChange, onValueChange, unit, valueKg],
  );

  const commitInput = useCallback(() => {
    const parsedKg = parseWeightKg(inputDraft, unit);
    setIsEditing(false);

    if (parsedKg === null) {
      setInputDraft(formatWeight(valueKg, unit));
      onValidityChange?.(true);
      return;
    }

    onValidityChange?.(true);
    setInputDraft(formatWeight(parsedKg, unit));
    if (parsedKg !== valueKg) {
      onValueChange(parsedKg);
    }
  }, [inputDraft, onValidityChange, onValueChange, unit, valueKg]);

  const handleSlidingComplete = useCallback(
    (nextValueKg: number) => {
      const roundedValueKg = roundParcelMeasurement(nextValueKg);
      setIsEditing(false);
      setInputDraft(formatWeight(roundedValueKg, unit));
      onValidityChange?.(true);

      if (roundedValueKg !== valueKg) {
        onValueChange(roundedValueKg);
      }
    },
    [onValidityChange, onValueChange, unit, valueKg],
  );

  const selectUnit = useCallback(
    (nextUnit: WeightUnit) => {
      if (nextUnit === unit) {
        return;
      }

      const parsedKg = parseWeightKg(inputDraft, unit) ?? valueKg;
      setIsEditing(false);
      setUnit(nextUnit);
      setInputDraft(formatWeight(parsedKg, nextUnit));
      onValidityChange?.(true);
      if (parsedKg !== valueKg) {
        onValueChange(parsedKg);
      }
    },
    [inputDraft, onValidityChange, onValueChange, unit, valueKg],
  );

  const sliderValueKg = clampToSliderRange(valueKg);
  const sliderMinLabel = formatWeight(SLIDER_MIN_KG, unit);
  const sliderMaxLabel = formatWeight(SLIDER_MAX_KG, unit);

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <Text style={styles.formLabel}>{t('parcel.weight.title')}</Text>
        <View style={styles.unitToggleRow} accessibilityRole="radiogroup">
          {(['kg', 'lb'] as const).map(option => {
            const active = unit === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                hitSlop={6}
                onPress={() => selectUnit(option)}
                style={({ pressed }) => [
                  styles.unitButton,
                  active && styles.unitButtonActive,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text
                  style={[styles.unitText, active && styles.unitTextActive]}
                >
                  {t(`parcel.units.${option}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.weightInputCard}>
        <TextInput
          accessibilityLabel={t('parcel.weight.inputAccessibility', {
            unit: t(`parcel.units.${unit}`),
          })}
          keyboardType="decimal-pad"
          returnKeyType="done"
          selectTextOnFocus
          style={styles.weightInput}
          value={inputDraft}
          onBlur={commitInput}
          onChangeText={handleInputChange}
          onFocus={() => setIsEditing(true)}
          onSubmitEditing={commitInput}
        />
        <Text style={styles.weightInputUnit}>
          {t(`parcel.units.${unit}`)}
        </Text>
      </View>

      <Slider
        accessibilityLabel={t('parcel.weight.sliderAccessibility')}
        accessibilityValue={{
          min: SLIDER_MIN_KG,
          max: SLIDER_MAX_KG,
          now: sliderValueKg,
          text: t('parcel.weight.valueAccessibility', {
            value: formatWeight(sliderValueKg, unit),
            unit: t(`parcel.units.${unit}`),
          }),
        }}
        style={styles.slider}
        value={sliderValueKg}
        minimumValue={SLIDER_MIN_KG}
        maximumValue={SLIDER_MAX_KG}
        step={SLIDER_STEP_KG}
        minimumTrackTintColor={theme.colors.primary}
        maximumTrackTintColor={theme.colors.divider}
        thumbTintColor={theme.colors.primary}
        tapToSeek
        onSlidingComplete={handleSlidingComplete}
      />

      <View style={styles.sliderMinMax}>
        <Text style={styles.sliderLimitText}>
          {sliderMinLabel} {t(`parcel.units.${unit}`)}
        </Text>
        <Text style={styles.sliderLimitText}>
          {t('parcel.weight.sliderMaximum', {
            value: sliderMaxLabel,
            unit: t(`parcel.units.${unit}`),
          })}
        </Text>
      </View>
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  container: {
    marginBottom: spacing.lg,
  },
  headingRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  formLabel: {
    flexShrink: 1,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  unitToggleRow: {
    flexDirection: 'row',
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : theme.colors.surfaceAlt,
    borderRadius: borderRadius.full,
    padding: 3,
  },
  unitButton: {
    minWidth: 48,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  unitButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  pressed: {
    opacity: 0.82,
  },
  unitText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  unitTextActive: {
    color: theme.colors.textInverse,
  },
  weightInputCard: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1.2,
    borderColor: theme.effects.isLiquid
      ? theme.effects.fieldBorder
      : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.fieldSurface
      : theme.colors.surfaceAlt,
  },
  weightInput: {
    flex: 1,
    padding: 0,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xxl,
    color: theme.colors.textPrimary,
  },
  weightInputUnit: {
    marginLeft: spacing.sm,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: theme.colors.textSecondary,
  },
  slider: {
    width: '100%' as const,
    height: 48,
  },
  sliderMinMax: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sliderLimitText: {
    flexShrink: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
});
