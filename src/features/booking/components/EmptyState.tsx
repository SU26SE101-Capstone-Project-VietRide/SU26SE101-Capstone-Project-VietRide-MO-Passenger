/**
 * EmptyState — Themed empty state with mascot illustration
 *
 * Used across booking screens when there are no results to show.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowClockwise } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

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
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

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
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.actionButton, pressed ? styles.actionButtonPressed : null]}
        >
          <ArrowClockwise size={16} weight="bold" color={theme.colors.textInverse} style={styles.actionIconSpacing} />
          <Text style={styles.actionText}>{actionLabel}</Text>
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
  illustrationEmoji: {
    fontSize: 64,
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.components.primaryButton,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
    marginTop: spacing.xxl,
  },
  actionButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  actionIconSpacing: {
    marginRight: spacing.sm,
  },
  actionText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textInverse,
  },
});
