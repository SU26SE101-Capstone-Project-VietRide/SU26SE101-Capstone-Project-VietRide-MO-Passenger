/**
 * ErrorState — Connection error state with retry action
 *
 * Used when the booking API fails to load.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WifiSlash, ArrowClockwise } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

interface ErrorStateProps {
  /** Optional retry action callback */
  onRetry?: () => void;
}

export const ErrorState = ({ onRetry }: ErrorStateProps): React.JSX.Element => {
  return (
    <View style={styles.container}>
      <View style={styles.illustrationContainer}>
        <View style={styles.illustrationCircle}>
          <WifiSlash size={64} weight="thin" color={colors.primary} />
        </View>
      </View>
      <Text style={styles.title}>Oops! Lost Connection</Text>
      <Text style={styles.subtitle}>
        We can't find any rides without the internet. Please check your
        signal and try again.
      </Text>
      {onRetry != null && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onRetry}
          style={styles.retryButton}
        >
          <ArrowClockwise size={16} weight="bold" color={colors.textInverse} style={styles.retryIconSpacing} />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSizes.md * 1.6,
    maxWidth: 300,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
    marginTop: spacing.xxl,
    ...shadows.lg,
  },
  retryIconSpacing: {
    marginRight: spacing.sm,
  },
  retryText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textInverse,
  },
});
