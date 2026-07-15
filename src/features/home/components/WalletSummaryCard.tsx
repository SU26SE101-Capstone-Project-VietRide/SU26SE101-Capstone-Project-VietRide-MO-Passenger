import React, { memo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { ArrowRight, Wallet } from 'phosphor-react-native';

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

interface WalletSummaryCardProps {
  balance?: number;
  isLoading: boolean;
  hasError: boolean;
  onPress: () => void;
}

export const WalletSummaryCard = memo(function WalletSummaryCardComponent({
  balance,
  isLoading,
  hasError,
  onPress,
}: WalletSummaryCardProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open VietRide wallet"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.iconBadge}>
        <Wallet size={22} color={theme.colors.primary} weight="fill" />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>VietRide Wallet</Text>
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <>
            <Text style={balance === undefined ? styles.error : styles.balance}>
            {balance === undefined
              ? 'Balance unavailable'
              : formatVnd(balance)}
            </Text>
            {hasError && balance !== undefined ? (
              <Text style={styles.stale}>May be out of date</Text>
            ) : null}
          </>
        )}
      </View>
      <ArrowRight size={19} color={theme.colors.textSecondary} weight="bold" />
    </Pressable>
  );
});

const createStyles = (theme: AppTheme) => ({
  card: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.effects.glassBorderStrong,
    borderRadius: borderRadius.xl,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.effects.glassSurfaceStrong,
  },
  iconBadge: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  balance: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  error: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.error,
  },
  stale: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.warning,
  },
  pressed: {
    opacity: 0.82,
  },
});
