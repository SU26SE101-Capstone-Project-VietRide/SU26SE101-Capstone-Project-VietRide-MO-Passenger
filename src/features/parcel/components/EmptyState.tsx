import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Package } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

interface EmptyStateProps {
  title: string;
  description: string;
  buttonText?: string;
  onPressButton?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  buttonText,
  onPressButton,
  icon,
}: EmptyStateProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {icon || <Package size={48} color={theme.colors.textTertiary} weight="light" />}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {buttonText && onPressButton ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={buttonText}
          style={styles.button}
          onPress={onPressButton}
        >
          <Text style={styles.buttonText}>{buttonText}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: 'transparent',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.effects.isLiquid ? theme.effects.contentSurfaceSoft : theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSizes.sm * 1.5,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
});
