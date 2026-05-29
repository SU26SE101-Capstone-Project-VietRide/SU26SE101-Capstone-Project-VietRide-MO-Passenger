/**
 * Button — Primary reusable button component
 *
 * Supports multiple variants, sizes, loading state,
 * and disabled state. Fully themed.
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';

import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';

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
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.base,
        variantStyles[variant].container,
        sizeStyles[size].container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.textInverse : colors.primary}
        />
      ) : (
        <Text
          style={[
            styles.text,
            variantStyles[variant].text,
            sizeStyles[size].text,
            isDisabled && styles.disabledText,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Base Styles ──────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  text: {
    fontFamily: fontFamilies.semiBold,
    letterSpacing: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: colors.textDisabled,
  },
});

// ─── Variant Styles ───────────────────────────────────────

const variantStyles: Record<
  ButtonVariant,
  { container: ViewStyle; text: TextStyle }
> = {
  primary: {
    container: {
      backgroundColor: colors.primary,
    },
    text: {
      color: colors.textInverse,
    },
  },
  secondary: {
    container: {
      backgroundColor: colors.primaryFaded,
    },
    text: {
      color: colors.primary,
    },
  },
  outline: {
    container: {
      backgroundColor: colors.transparent,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    text: {
      color: colors.primary,
    },
  },
  ghost: {
    container: {
      backgroundColor: colors.transparent,
    },
    text: {
      color: colors.primary,
    },
  },
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
