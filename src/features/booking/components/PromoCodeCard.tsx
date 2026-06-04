import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Tag } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

export const PromoCodeCard = (): React.JSX.Element => (
  <TouchableOpacity style={styles.promoCard} activeOpacity={0.7}>
    <View style={styles.promoIconContainer}>
      <Tag size={18} weight="fill" color={colors.primary} />
    </View>
    <View style={styles.promoInfo}>
      <Text style={styles.promoTitle}>ENTER PROMO CODE</Text>
      <Text style={styles.promoHint}>Min Spend 300,000đ required</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  promoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.md,
  },
  promoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  promoInfo: {
    flex: 1,
  },
  promoTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  promoHint: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
});
