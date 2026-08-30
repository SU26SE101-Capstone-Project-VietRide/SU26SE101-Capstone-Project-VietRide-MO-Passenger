import React, { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Wallet } from 'phosphor-react-native';

import { VnPayLogo } from '@shared/components';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { formatVnd } from '@shared/utils/format';
import type { ParcelPaymentMethod } from '../types';

interface ParcelPaymentMethodSelectorProps {
  value: ParcelPaymentMethod;
  onChange: (method: ParcelPaymentMethod) => void;
  requiredAmount: number;
  walletBalance?: number;
  walletIsLoading: boolean;
  walletHasError: boolean;
  disabled?: boolean;
}

interface PaymentOptionProps {
  selected: boolean;
  disabled?: boolean;
  label: string;
  subtitle: string;
  brand?: 'vnpay';
  Icon?: React.ElementType;
  iconColor?: string;
  onSelect: () => void;
}

const PaymentOption = memo(function PaymentOption({
  selected,
  disabled = false,
  label,
  subtitle,
  brand,
  Icon,
  iconColor,
  onSelect,
}: PaymentOptionProps): React.JSX.Element {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.paymentOption,
        selected ? styles.paymentOptionActive : null,
        disabled ? styles.paymentOptionDisabled : null,
        pressed && !disabled ? styles.paymentOptionPressed : null,
      ]}
      onPress={onSelect}
    >
      <View style={styles.paymentRadio}>
        {selected ? <View style={styles.paymentRadioDot} /> : null}
      </View>
      <View style={styles.paymentIconBackground}>
        {brand === 'vnpay'
          ? <VnPayLogo />
          : Icon && iconColor
            ? <Icon size={20} color={iconColor} weight="bold" />
            : null}
      </View>
      <View style={styles.paymentOptionText}>
        <Text style={styles.paymentTitle}>{label}</Text>
        <Text style={styles.paymentSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
});

export const ParcelPaymentMethodSelector = memo(
  function ParcelPaymentMethodSelectorComponent({
    value,
    onChange,
    requiredAmount,
    walletBalance,
    walletIsLoading,
    walletHasError,
    disabled = false,
  }: ParcelPaymentMethodSelectorProps): React.JSX.Element {
    const theme = useTheme();
    const { t } = useTranslation();
    const walletHasKnownBalance = typeof walletBalance === 'number';
    const walletHasEnoughBalance =
      walletHasKnownBalance && walletBalance >= requiredAmount;
    const walletDisabled =
      disabled
      || walletIsLoading
      || walletHasError
      || !walletHasEnoughBalance;

    const selectWallet = useCallback(() => {
      if (!walletDisabled) {
        onChange('wallet');
      }
    }, [onChange, walletDisabled]);

    const selectVnPay = useCallback(() => {
      if (!disabled) {
        onChange('vnpay');
      }
    }, [disabled, onChange]);

    const walletSubtitle = walletIsLoading
      ? t('parcel.payment.wallet.checkingBalance')
      : walletHasError || !walletHasKnownBalance
      ? t('parcel.payment.wallet.balanceUnavailable')
      : walletHasEnoughBalance
      ? t('parcel.payment.wallet.balance', {
          amount: formatVnd(walletBalance),
        })
      : t('parcel.payment.wallet.insufficientBalance', {
          amount: formatVnd(walletBalance),
        });

    return (
      <View accessibilityRole="radiogroup">
        <PaymentOption
          selected={value === 'wallet'}
          disabled={walletDisabled}
          label={t('parcel.payment.wallet.label')}
          subtitle={walletSubtitle}
          Icon={Wallet}
          iconColor={theme.colors.primary}
          onSelect={selectWallet}
        />
        <PaymentOption
          selected={value === 'vnpay'}
          disabled={disabled}
          label={t('parcel.payment.vnpay.label')}
          subtitle={t('parcel.payment.vnpay.subtitle')}
          brand="vnpay"
          onSelect={selectVnPay}
        />
      </View>
    );
  },
);

const createStyles = (theme: AppTheme) => ({
  paymentOption: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : theme.colors.surfaceAlt,
    borderRadius: borderRadius.lg,
    borderWidth: 1.2,
    borderColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  paymentOptionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
  },
  paymentOptionDisabled: {
    opacity: 0.55,
  },
  paymentOptionPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  paymentRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorderStrong
      : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurface
      : theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  paymentRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  paymentIconBackground: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurface
      : theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  paymentOptionText: {
    flex: 1,
  },
  paymentTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  paymentSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
});
