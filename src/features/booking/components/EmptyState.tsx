/**
 * EmptyState — Themed empty state with mascot illustration
 *
 * Used across booking screens when there are no results to show.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowClockwise } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

interface EmptyStateProps {
  /** Emoji or icon displayed inside the circle */
  emoji?: string;
  /** Main heading text */
  title: string;
  /** Supporting description text */
  subtitle?: string;
  /** Optional retry/action button label */
  actionLabel?: string;
  /** Action button callback */
  onAction?: () => void;
}

export const EmptyState = ({
  emoji = '🚌',
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps): React.JSX.Element => {
  return (
    <View style={styles.container}>
      <View style={styles.illustrationContainer}>
        <View style={styles.illustrationCircle}>
          <Text style={styles.illustrationEmoji}>{emoji}</Text>
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle != null && subtitle.trim().length > 0 && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
      {actionLabel != null && onAction != null && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onAction}
          style={styles.actionButton}
        >
          <ArrowClockwise size={16} weight="bold" color={colors.textInverse} style={styles.actionIconSpacing} />
          <Text style={styles.actionText}>{actionLabel}</Text>
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
  illustrationEmoji: {
    fontSize: 64,
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
    marginTop: spacing.xxl,
    ...shadows.lg,
  },
  actionIconSpacing: {
    marginRight: spacing.sm,
  },
  actionText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textInverse,
  },
});
