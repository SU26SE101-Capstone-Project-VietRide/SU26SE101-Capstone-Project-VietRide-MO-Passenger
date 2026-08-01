import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { WarningCircle } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorView({
  message,
  onRetry,
}: ErrorViewProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const displayedMessage = message ?? t('parcel.errors.loadData');

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <WarningCircle size={40} color={theme.colors.error} weight="fill" />
        <Text style={styles.title}>{t('common.error')}</Text>
        <Text style={styles.message}>{displayedMessage}</Text>
        {onRetry ? (
          <Pressable style={styles.button} onPress={onRetry}>
            <Text style={styles.buttonText}>{t('common.retry')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: 'transparent',
  },
  card: {
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.errorLight,
    ...theme.effects.cardShadow,
    width: '100%',
    maxWidth: 320,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  message: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSizes.sm * 1.4,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
});
