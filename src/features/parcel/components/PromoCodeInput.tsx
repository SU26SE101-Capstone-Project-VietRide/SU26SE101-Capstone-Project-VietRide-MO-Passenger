import React, { memo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Check } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';

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
  return (
    <View style={styles.bentoSummaryCard}>
      <Text style={styles.bentoCardHeading}>Promo Code</Text>
      <View style={styles.promoInputRow}>
        <TextInput
          style={styles.promoInput}
          value={code}
          onChangeText={onChange}
          placeholder="Enter promo code"
          autoCapitalize="characters"
          editable={!applied}
        />
        <TouchableOpacity
          style={[styles.promoApplyButton, applied && styles.promoApplyButtonActive]}
          onPress={onApply}
          activeOpacity={0.8}
          disabled={applied || !code.trim()}
        >
          <Text style={[styles.promoApplyButtonText, applied && styles.promoApplyButtonTextActive]}>
            {applied ? 'Applied' : 'Apply'}
          </Text>
        </TouchableOpacity>
      </View>
      {applied && (
        <View style={styles.promoAppliedRow}>
          <View style={styles.promoSuccessBadge}>
            <Check size={12} color={colors.success} weight="bold" />
            <Text style={styles.promoSuccessText}>WELCOME50K Applied</Text>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  bentoSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  bentoCardHeading: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
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
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  promoApplyButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoApplyButtonActive: {
    backgroundColor: colors.success,
  },
  promoApplyButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textInverse,
  },
  promoApplyButtonTextActive: {
    color: colors.textInverse,
  },
  promoAppliedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  promoSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  promoSuccessText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.success,
  },
});
