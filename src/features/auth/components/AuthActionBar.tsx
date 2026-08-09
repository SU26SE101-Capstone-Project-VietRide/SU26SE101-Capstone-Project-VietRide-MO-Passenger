/**
 * AuthActionBar — Floating bottom CTA bar for auth screens
 *
 * Mirrors Parcel's absolute-positioned action bar:
 * - optional price summary row (used on step 4 / OTP)
 * - primary CTA button with arrow icon
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowLeft } from 'phosphor-react-native';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';

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
}: AuthActionBarProps): React.JSX.Element => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View
      style={[
        styles.root,
        { paddingBottom: Math.max(bottomInset ?? 0, spacing.md) },
      ]}
    >
      {summary ? (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{summary.label}</Text>
          <Text style={styles.summaryValue}>{summary.value}</Text>
        </View>
      ) : null}
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.cta,
          disabled ? styles.ctaDisabled : null,
          pressed && !disabled ? styles.ctaPressed : null,
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        <Text style={styles.ctaLabel}>{label}</Text>
        <ArrowLeft
          size={18}
          color={theme.colors.textInverse}
          weight="bold"
          style={styles.arrow}
        />
      </Pressable>
    </View>
  );
};

const createStyles = (theme: AppTheme) => ({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    ...theme.components.actionBar,
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
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.primary,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
    height: 52,
    gap: spacing.sm,
    ...theme.effects.floatingShadow,
  },
  ctaDisabled: { backgroundColor: theme.colors.textDisabled },
  ctaPressed: { opacity: 0.85 },
  ctaLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textInverse,
  },
  arrow: {
    transform: [{ rotate: '180deg' }],
  },
});
