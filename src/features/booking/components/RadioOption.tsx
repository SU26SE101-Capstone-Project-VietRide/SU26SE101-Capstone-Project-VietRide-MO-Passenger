/**
 * RadioOption — Selectable option row with radio indicator
 *
 * Used by: Drop-off type selection (Checkout), Payment method selection (Payment).
 * Supports an optional leading icon slot and a trailing badge.
 */

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

interface RadioOptionProps {
  label: string;
  sublabel?: string;
  selected?: boolean;
  disabled?: boolean;
  iconEmoji?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const RadioOption = memo(function RadioOption({
  label,
  sublabel,
  selected = false,
  disabled = false,
  iconEmoji,
  onPress,
  style,
}: RadioOptionProps): React.JSX.Element {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.option,
        selected && styles.optionSelected,
        disabled && styles.optionDisabled,
        style,
      ]}
    >
      {iconEmoji && (
        <View style={[styles.iconBox, selected && styles.iconBoxActive]}>
          <Text style={styles.iconEmoji}>{iconEmoji}</Text>
        </View>
      )}
      <View style={styles.textBlock}>
        <Text style={[styles.label, selected && styles.labelActive]}>{label}</Text>
        {sublabel ? (
          <Text style={styles.sublabel}>{sublabel}</Text>
        ) : null}
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaded,
  },
  optionDisabled: {
    opacity: 0.45,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
    ...shadows.sm,
  },
  iconBoxActive: {
    backgroundColor: colors.primaryFaded,
  },
  iconEmoji: {
    fontSize: 18,
  },
  textBlock: {
    flex: 1,
  },
  label: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  labelActive: {
    color: colors.primary,
  },
  sublabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});
