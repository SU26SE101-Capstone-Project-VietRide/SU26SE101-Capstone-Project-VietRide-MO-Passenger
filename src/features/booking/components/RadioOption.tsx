/**
 * RadioOption — Selectable option row with radio indicator
 *
 * Used by: Drop-off type selection (Checkout), Payment method selection (Payment).
 * Supports an optional leading icon slot and a trailing badge.
 */

import React, { memo } from 'react';
import { View, Text, Pressable, ViewStyle } from 'react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

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
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        disabled && styles.optionDisabled,
        pressed && !disabled && styles.optionPressed,
        style,
      ]}
    >
      {iconEmoji ? (
        <View style={[styles.iconBox, selected && styles.iconBoxActive]}>
          <Text style={styles.iconEmoji}>{iconEmoji}</Text>
        </View>
      ) : null}
      <View style={styles.textBlock}>
        <Text style={[styles.label, selected && styles.labelActive]}>{label}</Text>
        {sublabel ? (
          <Text style={styles.sublabel}>{sublabel}</Text>
        ) : null}
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
});

const createStyles = (theme: AppTheme) => ({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurface : theme.colors.surface,
  },
  optionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
  },
  optionDisabled: {
    opacity: 0.45,
  },
  optionPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  iconBoxActive: {
    backgroundColor: theme.colors.primaryFaded,
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
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  labelActive: {
    color: theme.colors.primary,
  },
  sublabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorderStrong : theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: theme.colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
});
