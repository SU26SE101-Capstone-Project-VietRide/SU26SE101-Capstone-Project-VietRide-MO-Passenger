/**
 * EmptyState - Refined empty state for booking screens.
 *
 * Used across booking screens when there are no results to show.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowClockwise, MagnifyingGlass } from 'phosphor-react-native';
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
  emoji,
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps): React.JSX.Element => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <View style={styles.iconWrap}>
          {emoji ? (
            <Text style={styles.illustrationEmoji}>{emoji}</Text>
          ) : (
            <MagnifyingGlass size={30} weight="duotone" color={theme.colors.primary} />
          )}
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
            <ArrowClockwise size={15} weight="bold" color={theme.colors.textInverse} style={styles.actionIconSpacing} />
            <Text style={styles.actionText}>{actionLabel}</Text>
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
  illustrationEmoji: {
    fontSize: fontSizes.h2,
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.components.primaryButton,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  actionButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  actionIconSpacing: {
    marginRight: spacing.sm,
  },
  actionText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
});
