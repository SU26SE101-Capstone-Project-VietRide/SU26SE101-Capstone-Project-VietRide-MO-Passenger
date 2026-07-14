import React from 'react';
import { Text, View } from 'react-native';
import { ShieldCheck } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import { borderRadius, fontFamilies, fontSizes, spacing } from '@shared/theme';
import type { AppTheme } from '@shared/theme';

export function FinancialFeatureNotice(): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container} accessibilityRole="text">
      <View style={styles.iconContainer}>
        <ShieldCheck size={24} color={theme.colors.primary} weight="duotone" />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>
          {t('profile.financialUnavailableTitle', 'Wallet & payments unavailable')}
        </Text>
        <Text style={styles.description}>
          {t(
            'profile.financialUnavailableDescription',
            'Wallet balance, top-up, withdrawal, and saved payment management are not enabled in this app yet.',
          )}
        </Text>
        <Text style={styles.safetyNote}>
          {t(
            'profile.financialUnavailableSafety',
            'VietRide does not collect card numbers or CVV on this screen.',
          )}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    ...theme.components.card,
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 44,
    height: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.primaryFaded,
    marginRight: spacing.md,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  description: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  safetyNote: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    lineHeight: 17,
    color: theme.colors.primary,
    marginTop: spacing.sm,
  },
});

