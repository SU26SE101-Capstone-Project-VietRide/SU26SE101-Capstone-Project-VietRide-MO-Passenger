/**
 * PromoRow — Single-row promo code entry used on the Payment screen.
 *
 * DESIGN.md alignment: rounded chip (12px), high-contrast text.
 */

import React, { memo, useCallback, useState } from 'react';
import { View, Text, TextInput, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { formatVnd } from '@shared/utils/format';

interface PromoRowProps {
  onApply?: (code: string) => void;
  applied?: boolean;
  style?: ViewStyle;
}

export const PromoRow = memo(function PromoRowComponent({
  onApply,
  applied = false,
  style,
}: PromoRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [code, setCode] = useState('');

  const handleApply = useCallback(() => {
    if (!applied && code.trim()) {
      onApply?.(code.trim());
    }
  }, [applied, code, onApply]);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.iconBox}>
        <Text style={styles.iconEmoji}>🎟️</Text>
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{t('booking.promo.title')}</Text>
        <Text style={styles.hint}>
          {t('booking.promo.minimumSpend', {
            amount: formatVnd(300_000, { clampNegative: true }),
          })}
        </Text>
      </View>
      {!applied ? (
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder={t('booking.promo.placeholder')}
          placeholderTextColor={theme.colors.textTertiary}
          onSubmitEditing={handleApply}
          returnKeyType="done"
        />
      ) : (
        <View style={styles.appliedBadge}>
          <Text style={styles.appliedText}>{t('booking.promo.applied')}</Text>
        </View>
      )}
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  card: {
    ...theme.components.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: fontSizes.xl,
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
