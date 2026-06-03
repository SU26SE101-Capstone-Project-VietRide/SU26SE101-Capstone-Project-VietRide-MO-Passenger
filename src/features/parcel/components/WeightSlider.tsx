import React, { memo, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { PanResponder } from 'react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';

export interface WeightSliderProps {
  value: number;
  unit: 'kg' | 'lbs';
  onValueChange: (v: number) => void;
  onUnitChange: (unit: 'kg' | 'lbs') => void;
}

export const WeightSlider = memo(function WeightSlider({
  value,
  unit,
  onValueChange,
  onUnitChange,
}: WeightSliderProps): React.JSX.Element {
  const sliderWidthRef = useRef(0);

  const handleSliderTouch = (locationX: number) => {
    const w = sliderWidthRef.current;
    if (w <= 0) return;
    const ratio = Math.max(0, Math.min(locationX / w, 1));
    const minWeight = 0.5;
    const maxWeight = unit === 'kg' ? 30 : 66;
    const calculated = minWeight + ratio * (maxWeight - minWeight);
    onValueChange(Number(calculated.toFixed(1)));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => true,
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => handleSliderTouch(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => handleSliderTouch(evt.nativeEvent.locationX),
    })
  ).current;

  const maxWeight = unit === 'kg' ? 30 : 66;
  const pct = Math.max(0, Math.min(((value - 0.5) / (maxWeight - 0.5)) * 100, 100));

  return (
    <>
      <Text style={styles.formLabel}>Weight</Text>
      <View style={styles.unitToggleRow}>
        <TouchableOpacity
          style={[styles.unitButton, unit === 'kg' && styles.unitButtonActive]}
          onPress={() => {
            if (unit === 'lbs') {
              onUnitChange('kg');
              onValueChange(Number((value / 2.20462).toFixed(1)));
            }
          }}
        >
          <Text style={[styles.unitText, unit === 'kg' && styles.unitTextActive]}>kg</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.unitButton, unit === 'lbs' && styles.unitButtonActive]}
          onPress={() => {
            if (unit === 'kg') {
              onUnitChange('lbs');
              onValueChange(Number((value * 2.20462).toFixed(1)));
            }
          }}
        >
          <Text style={[styles.unitText, unit === 'lbs' && styles.unitTextActive]}>lbs</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weightInputCard}>
        <TextInput
          style={styles.weightInput}
          keyboardType="numeric"
          value={value.toString()}
          onChangeText={(text) => {
            const cleanText = text.replace(/[^0-9.]/g, '');
            onValueChange(Number(cleanText) || 0.5);
          }}
        />
        <Text style={styles.weightInputUnit}>{unit}</Text>
      </View>

      <View style={styles.sliderContainer}>
        <View
          style={styles.sliderTrack}
          onLayout={(event) => {
            const { width } = event.nativeEvent.layout;
            sliderWidthRef.current = width;
          }}
          {...panResponder.panHandlers}
        >
          <View pointerEvents="none" style={[styles.sliderFill, { width: `${pct}%` }]} />
          <View pointerEvents="none" style={[styles.sliderThumb, { left: `${pct}%` }]} />
        </View>
        <View style={styles.sliderMinMax}>
          <Text style={styles.sliderLimitText}>0.5 {unit}</Text>
          <Text style={styles.sliderLimitText}>{unit === 'kg' ? '30 kg max' : '66 lbs max'}</Text>
        </View>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  formLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  unitToggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.full,
    padding: 3,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  unitButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  unitButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  unitText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  unitTextActive: {
    color: colors.textInverse,
  },
  weightInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.lg,
    borderWidth: 1.2,
    borderColor: colors.divider,
    paddingHorizontal: spacing.lg,
    height: 52,
    marginBottom: spacing.lg,
  },
  weightInput: {
    flex: 1,
    fontFamily: fontFamilies.bold,
    fontSize: 22,
    color: colors.textPrimary,
    padding: 0,
  },
  weightInputUnit: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  sliderContainer: {
    marginBottom: spacing.lg,
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.divider,
    position: 'relative',
    overflow: 'visible',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  sliderThumb: {
    position: 'absolute',
    top: -9,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  sliderMinMax: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sliderLimitText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
  },
});
