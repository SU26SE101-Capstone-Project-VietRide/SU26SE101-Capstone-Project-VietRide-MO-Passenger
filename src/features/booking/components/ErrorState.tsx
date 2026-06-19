/**
 * ErrorState — Connection error state with retry action
 *
 * Used when the booking API fails to load.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
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
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <View style={styles.illustrationContainer}>
        <View style={styles.illustrationCircle}>
          <WifiSlash size={64} weight="thin" color={theme.colors.primary} />
        </View>
      </View>
      <Text style={styles.title}>Oops! Lost Connection</Text>
      <Text style={styles.subtitle}>
        We can't find any rides without the internet. Please check your
        signal and try again.
      </Text>
      {onRetry != null && (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [styles.retryButton, pressed ? styles.retryButtonPressed : null]}
        >
          <ArrowClockwise size={16} weight="bold" color={theme.colors.textInverse} style={styles.retryIconSpacing} />
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      )}
    </View>
  );
};

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 80,
  },
  illustrationContainer: {
    marginBottom: spacing.xxl,
  },
  illustrationCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSizes.md * 1.6,
    maxWidth: 300,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.components.primaryButton,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
    marginTop: spacing.xxl,
  },
  retryButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  retryIconSpacing: {
    marginRight: spacing.sm,
  },
  retryText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textInverse,
  },
});
