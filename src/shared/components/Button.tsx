/**
 * Button — Primary reusable button component
 *
 * Supports multiple variants, sizes, loading state,
 * and disabled state. Fully themed.
 */

import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';

import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isDisabled = disabled || loading;
  const variantStyle = getVariantStyle(theme, variant);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
          styles.base,
          variantStyle.container,
          sizeStyles[size].container,
          fullWidth ? styles.fullWidth : null,
          pressed && !isDisabled ? styles.pressed : null,
          isDisabled ? styles.disabled : null,
          style,
        ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? theme.colors.textInverse : theme.colors.primary}
        />
      ) : (
        <Text
          style={[
            styles.text,
            variantStyle.text,
            sizeStyles[size].text,
            isDisabled ? styles.disabledText : null,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

// ─── Base Styles ──────────────────────────────────────────

const createStyles = (theme: AppTheme) => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fontFamilies.semiBold,
    letterSpacing: 0,
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: theme.colors.textDisabled,
  },
});

// ─── Variant Styles ───────────────────────────────────────

const flatButtonSurface = {
  shadowColor: 'transparent',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
  boxShadow: 'none',
} as ViewStyle;

const getVariantStyle = (
  theme: AppTheme,
  variant: ButtonVariant,
): { container: ViewStyle; text: TextStyle } => {
  switch (variant) {
    case 'secondary':
      return {
        container: theme.components.secondaryButton,
        text: { color: theme.colors.primary },
      };
    case 'outline':
      return {
        container: {
          ...flatButtonSurface,
          backgroundColor: theme.colors.transparent,
          borderWidth: 1.5,
          borderColor: theme.colors.primary,
          borderRadius: theme.components.primaryButton.borderRadius,
        },
        text: { color: theme.colors.primary },
      };
    case 'ghost':
      return {
        container: {
          ...flatButtonSurface,
          backgroundColor: theme.colors.transparent,
          borderWidth: 0,
          borderRadius: theme.components.primaryButton.borderRadius,
        },
        text: { color: theme.colors.primary },
      };
    case 'primary':
    default:
      return {
        container: theme.components.primaryButton,
        text: { color: theme.colors.textInverse },
      };
  }
};

// ─── Size Styles ──────────────────────────────────────────

const sizeStyles: Record<
  ButtonSize,
  { container: ViewStyle; text: TextStyle }
> = {
  sm: {
    container: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      minHeight: 36,
    },
    text: {
      fontSize: fontSizes.sm,
    },
  },
  md: {
    container: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      minHeight: 48,
    },
    text: {
      fontSize: fontSizes.md,
    },
  },
  lg: {
    container: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xxl,
      minHeight: 56,
    },
    text: {
      fontSize: fontSizes.lg,
    },
  },
};
