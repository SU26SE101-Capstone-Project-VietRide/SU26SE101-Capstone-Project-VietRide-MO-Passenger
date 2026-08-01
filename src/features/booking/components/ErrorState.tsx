/**
 * ErrorState - Connection error state with retry action.
 *
 * Used when the booking API fails to load.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { WifiSlash, ArrowClockwise } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

interface ErrorStateProps {
  /** Optional retry action callback */
  onRetry?: () => void;
}

export const ErrorState = ({ onRetry }: ErrorStateProps): React.JSX.Element => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <View style={styles.iconWrap}>
          <WifiSlash size={30} weight="duotone" color={theme.colors.primary} />
        </View>
        <Text style={styles.title}>{t('booking.states.connectionFailed')}</Text>
        <Text style={styles.subtitle}>
          {t('booking.states.connectionFailedDescription')}
        </Text>
        {onRetry != null && (
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [styles.retryButton, pressed ? styles.retryButtonPressed : null]}
          >
            <ArrowClockwise size={15} weight="bold" color={theme.colors.textInverse} style={styles.retryIconSpacing} />
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
  panel: {
    ...theme.components.card,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xl,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSizes.sm * 1.6,
    maxWidth: 280,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.components.primaryButton,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  retryButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  retryIconSpacing: {
    marginRight: spacing.sm,
  },
  retryText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
});
