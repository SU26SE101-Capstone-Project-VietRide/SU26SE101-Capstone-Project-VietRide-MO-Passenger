/**
 * AuthActionBar — Floating bottom CTA bar for auth screens
 *
 * Mirrors Parcel's absolute-positioned action bar:
 * - optional price summary row (used on step 4 / OTP)
 * - primary CTA button with arrow icon
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

export interface AuthActionBarProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  summary?: { label: string; value: string };
  bottomInset?: number;
}

export const AuthActionBar = ({
  label,
  onPress,
  disabled = false,
  summary,
  bottomInset,
}: AuthActionBarProps): React.JSX.Element => (
  <View style={[styles.root, { paddingBottom: Math.max(bottomInset ?? 0, spacing.md) }]}>
    {summary ? (
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>{summary.label}</Text>
        <Text style={styles.summaryValue}>{summary.value}</Text>
      </View>
    ) : null}
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[styles.cta, disabled && styles.ctaDisabled]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      <Text style={styles.ctaLabel}>{label}</Text>
      <ArrowLeft
        size={18}
        color={colors.textInverse}
        weight="bold"
        style={{ transform: [{ rotate: '180deg' }] }}
      />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    ...shadows.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.primary,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 52,
    gap: spacing.sm,
    ...shadows.sm,
  },
  ctaDisabled: { backgroundColor: colors.divider },
  ctaLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textInverse,
  },
});
