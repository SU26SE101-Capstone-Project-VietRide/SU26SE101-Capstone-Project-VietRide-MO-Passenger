/**
 * PromoRow — Single-row promo code entry used on the Payment screen.
 *
 * DESIGN.md alignment: rounded chip (12px), high-contrast text.
 */

import React, { memo, useState } from 'react';
import { View, Text, TextInput, ViewStyle } from 'react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

interface PromoRowProps {
  onApply?: (code: string) => void;
  applied?: boolean;
  style?: ViewStyle;
}

export const PromoRow = memo(function PromoRow({
  onApply,
  applied = false,
  style,
}: PromoRowProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [code, setCode] = useState('');

  const handleApply = () => {
    if (!applied && code.trim()) {
      onApply?.(code.trim());
    }
  };

  return (
    <View style={[styles.card, style]}>
      <View style={styles.iconBox}>
        <Text style={styles.iconEmoji}>🎟️</Text>
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.title}>ENTER PROMO CODE</Text>
        <Text style={styles.hint}>Min Spend 300,000đ required</Text>
      </View>
      {!applied ? (
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="Enter code"
          placeholderTextColor={theme.colors.textTertiary}
          onSubmitEditing={handleApply}
          returnKeyType="done"
        />
      ) : (
        <View style={styles.appliedBadge}>
          <Text style={styles.appliedText}>Applied ✓</Text>
        </View>
      )}
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  card: {
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurface : theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    ...theme.effects.cardShadow,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  iconEmoji: {
    fontSize: 18,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  hint: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  input: {
    flex: 1,
    marginLeft: spacing.lg,
    borderWidth: 1.5,
    borderColor: theme.effects.isLiquid ? theme.effects.fieldBorder : theme.colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    minWidth: 100,
    textAlign: 'right',
  },
  appliedBadge: {
    marginLeft: spacing.lg,
    backgroundColor: theme.colors.primaryFaded,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
  },
  appliedText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
});
