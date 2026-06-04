import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { QrCode, CreditCard } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

type PaymentMethodVariant = 'vnpay' | 'card';

interface PaymentMethodOptionProps {
  variant: PaymentMethodVariant;
  name: string;
  desc: string;
  selected: boolean;
  onPress: () => void;
}

const ICONS: Record<PaymentMethodVariant, React.JSX.Element> = {
  vnpay: <QrCode size={18} weight="fill" color={colors.primary} />,
  card: <CreditCard size={18} weight="fill" color={colors.primary} />,
};

export const PaymentMethodOption = ({
  variant,
  name,
  desc,
  selected,
  onPress,
}: PaymentMethodOptionProps): React.JSX.Element => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={onPress}
    style={[styles.paymentOption, selected && styles.paymentOptionActive]}
  >
    <View style={[styles.radio, selected && styles.radioSelected]}>
      {selected && <View style={styles.radioDot} />}
    </View>
    <View style={styles.paymentIcon}>{ICONS[variant]}</View>
    <View style={styles.paymentInfo}>
      <Text style={styles.paymentName}>{name}</Text>
      <Text style={styles.paymentDesc}>{desc}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  paymentOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaded,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
    ...shadows.sm,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  paymentDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
});
