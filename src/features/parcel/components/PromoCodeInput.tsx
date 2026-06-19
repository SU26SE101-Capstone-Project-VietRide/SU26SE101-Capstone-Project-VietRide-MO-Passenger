import React, { memo } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Check } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

export interface PromoCodeInputProps {
  code: string;
  onChange: (text: string) => void;
  applied: boolean;
  onApply: () => void;
}

export const PromoCodeInput = memo(function PromoCodeInput({
  code,
  onChange,
  applied,
  onApply,
}: PromoCodeInputProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.bentoSummaryCard}>
      <Text style={styles.bentoCardHeading}>Promo Code</Text>
      <View style={styles.promoInputRow}>
        <TextInput
          style={styles.promoInput}
          value={code}
          onChangeText={onChange}
          placeholder="Enter promo code"
          placeholderTextColor={theme.colors.textTertiary}
          autoCapitalize="characters"
          editable={!applied}
        />
        <Pressable
          style={({ pressed }) => [
            styles.promoApplyButton,
            applied && styles.promoApplyButtonActive,
            pressed && !applied && code.trim() ? styles.promoApplyButtonPressed : null,
          ]}
          onPress={onApply}
          disabled={applied || !code.trim()}
        >
          <Text style={[styles.promoApplyButtonText, applied && styles.promoApplyButtonTextActive]}>
            {applied ? 'Applied' : 'Apply'}
          </Text>
        </Pressable>
      </View>
      {applied && (
        <View style={styles.promoAppliedRow}>
          <View style={styles.promoSuccessBadge}>
            <Check size={12} color={theme.colors.success} weight="bold" />
            <Text style={styles.promoSuccessText}>WELCOME50K Applied</Text>
          </View>
        </View>
      )}
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  bentoSummaryCard: {
    ...theme.components.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  bentoCardHeading: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    marginBottom: spacing.md,
  },
  promoInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  promoInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: spacing.md,
    backgroundColor: theme.effects.isLiquid ? theme.effects.fieldSurface : theme.colors.surfaceAlt,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.fieldBorder : theme.colors.divider,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  promoApplyButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.primary,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoApplyButtonActive: {
    backgroundColor: theme.colors.success,
  },
  promoApplyButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  promoApplyButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
  promoApplyButtonTextActive: {
    color: theme.colors.textInverse,
  },
  promoAppliedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  promoSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  promoSuccessText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.success,
  },
});
