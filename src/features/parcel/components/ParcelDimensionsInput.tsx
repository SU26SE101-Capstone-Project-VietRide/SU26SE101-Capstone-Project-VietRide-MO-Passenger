import React, { memo, useCallback, useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { borderRadius, fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import {
  formatParcelMeasurement,
  roundParcelMeasurement,
  sanitizeParcelMeasurementDraft,
} from '../config/parcelPackage';
import type { ParcelDimensions } from '../config/parcelPackage';

type DimensionKey = keyof ParcelDimensions;
type DimensionDraft = Record<DimensionKey, string>;

const DIMENSION_FIELDS: readonly {
  key: DimensionKey;
  label: string;
}[] = [
  { key: 'lengthCm', label: 'Length' },
  { key: 'widthCm', label: 'Width' },
  { key: 'heightCm', label: 'Height' },
];

export interface ParcelDimensionsInputProps {
  value: ParcelDimensions;
  onChange: (value: ParcelDimensions) => void;
  onValidityChange?: (isValid: boolean) => void;
  errorMessage?: string;
}

function createDraft(value: ParcelDimensions): DimensionDraft {
  return {
    lengthCm: formatParcelMeasurement(value.lengthCm),
    widthCm: formatParcelMeasurement(value.widthCm),
    heightCm: formatParcelMeasurement(value.heightCm),
  };
}

function isValidDraft(draft: DimensionDraft): boolean {
  return Object.values(draft).every(measurement => {
    const parsed = Number.parseFloat(measurement);
    return Number.isFinite(parsed) && parsed > 0;
  });
}

export const ParcelDimensionsInput = memo(
  function ParcelDimensionsInputComponent({
    value,
    onChange,
    onValidityChange,
    errorMessage,
  }: ParcelDimensionsInputProps): React.JSX.Element {
    const styles = useThemedStyles(createStyles);
    const [draft, setDraft] = useState<DimensionDraft>(() =>
      createDraft(value),
    );
    const [editingKey, setEditingKey] = useState<DimensionKey | null>(null);

    useEffect(() => {
      setDraft(current => ({
        lengthCm:
          editingKey === 'lengthCm'
            ? current.lengthCm
            : formatParcelMeasurement(value.lengthCm),
        widthCm:
          editingKey === 'widthCm'
            ? current.widthCm
            : formatParcelMeasurement(value.widthCm),
        heightCm:
          editingKey === 'heightCm'
            ? current.heightCm
            : formatParcelMeasurement(value.heightCm),
      }));
    }, [editingKey, value.heightCm, value.lengthCm, value.widthCm]);

    const commitDimension = useCallback(
      (key: DimensionKey) => {
        const parsed = Number.parseFloat(draft[key]);
        setEditingKey(null);

        if (!Number.isFinite(parsed) || parsed <= 0) {
          const restoredDraft = {
            ...draft,
            [key]: formatParcelMeasurement(value[key]),
          };
          setDraft(restoredDraft);
          onValidityChange?.(isValidDraft(restoredDraft));
          return;
        }

        const nextValue = roundParcelMeasurement(parsed);
        const committedDraft = {
          ...draft,
          [key]: formatParcelMeasurement(nextValue),
        };
        setDraft(committedDraft);
        onValidityChange?.(isValidDraft(committedDraft));

        if (nextValue !== value[key]) {
          onChange({ ...value, [key]: nextValue });
        }
      },
      [draft, onChange, onValidityChange, value],
    );

    const updateDraft = useCallback(
      (key: DimensionKey, text: string) => {
        const sanitizedDraft = sanitizeParcelMeasurementDraft(text);
        const nextDraft = {
          ...draft,
          [key]: sanitizedDraft,
        };
        setDraft(nextDraft);
        onValidityChange?.(isValidDraft(nextDraft));

        // TextInput may stay focused when the fixed action bar is pressed.
        // Persist every valid draft so capacity search never uses stale values.
        const parsed = Number.parseFloat(sanitizedDraft);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          return;
        }

        const nextValue = roundParcelMeasurement(parsed);
        if (nextValue !== value[key]) {
          onChange({ ...value, [key]: nextValue });
        }
      },
      [draft, onChange, onValidityChange, value],
    );

    return (
      <View style={styles.container}>
        <Text style={styles.formLabel}>Exact dimensions</Text>
        <Text style={styles.hint}>
          Used to check trip capacity. The fare tier upgrades automatically when
          needed.
        </Text>

        <View style={styles.fieldRow}>
          {DIMENSION_FIELDS.map(({ key, label }) => (
            <View key={key} style={styles.field}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <View style={styles.inputFrame}>
                <TextInput
                  accessibilityLabel={`${label} in centimetres`}
                  keyboardType="decimal-pad"
                  maxLength={7}
                  returnKeyType="done"
                  selectTextOnFocus
                  style={styles.input}
                  value={draft[key]}
                  onBlur={() => commitDimension(key)}
                  onChangeText={text => updateDraft(key, text)}
                  onFocus={() => setEditingKey(key)}
                  onSubmitEditing={() => commitDimension(key)}
                />
                <Text style={styles.unit}>cm</Text>
              </View>
            </View>
          ))}
        </View>
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
      </View>
    );
  },
);

const createStyles = (theme: AppTheme) => ({
  container: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  hint: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  fieldRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  field: {
    minWidth: 88,
    flexBasis: 88,
    flexGrow: 1,
  },
  fieldLabel: {
    marginBottom: spacing.xs,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  inputFrame: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.2,
    borderColor: theme.effects.isLiquid
      ? theme.effects.fieldBorder
      : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.fieldSurface
      : theme.colors.surfaceAlt,
  },
  input: {
    minWidth: 0,
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  unit: {
    marginLeft: spacing.xs,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  errorText: {
    marginTop: spacing.sm,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.error,
  },
});
