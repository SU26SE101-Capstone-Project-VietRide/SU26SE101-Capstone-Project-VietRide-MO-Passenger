/**
 * LoadingState — Centered loading indicator with optional mascot
 *
 * Used when booking data is being fetched.
 */

import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

interface LoadingStateProps {
  /** Optional custom loading text (default: "Finding the best routes…") */
  text?: string;
}

export const LoadingState = ({ text = 'Finding the best routes…' }: LoadingStateProps): React.JSX.Element => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <View style={styles.mascotContainer}>
        <View style={styles.mascotBorder}>
          <View style={styles.mascotInner}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        </View>
      </View>
      <Text style={styles.title}>{text}</Text>
      <Text style={styles.subtitle}>Our tiny buses are speeding your way!</Text>
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
  mascotContainer: {
    marginBottom: spacing.xxl,
  },
  mascotBorder: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.xl,
    borderWidth: 3,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  mascotInner: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.effects.cardShadow,
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
  },
});
