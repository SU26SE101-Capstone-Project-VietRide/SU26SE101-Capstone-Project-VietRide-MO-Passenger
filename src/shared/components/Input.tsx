/**
 * Input — Themed text input with label, error, and icon support
 */

import React, { forwardRef, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TextInputProps,
  ViewStyle,
} from 'react-native';

import {
  fontFamilies,
  fontSizes,
  spacing,
} from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  required?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      containerStyle,
      required = false,
      ...textInputProps
    },
    ref,
  ) => {
    const theme = useTheme();
    const styles = useThemedStyles(createStyles);
    const [isFocused, setIsFocused] = useState(false);
    const hasError = Boolean(error);

    return (
      <View style={[styles.container, containerStyle]}>
        {label ? (
          <Text style={styles.label}>
            {label}
            {required ? <Text style={styles.required}> *</Text> : null}
          </Text>
        ) : null}

        <TextInput
          ref={ref}
          placeholderTextColor={theme.colors.textTertiary}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
          style={[
            styles.input,
            isFocused ? styles.inputFocused : null,
            hasError ? styles.inputError : null,
          ]}
          {...textInputProps}
        />

        {hasError ? <Text style={styles.errorText}>{error}</Text> : null}
        {!hasError && hint ? <Text style={styles.hintText}>{hint}</Text> : null}
      </View>
    );
  },
);

Input.displayName = 'Input';

// ─── Styles ───────────────────────────────────────────────

const createStyles = (theme: AppTheme) => ({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    marginBottom: spacing.xs,
  },
  required: {
    color: theme.colors.error,
  },
  input: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    ...theme.components.field,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: theme.colors.borderFocused,
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.error,
    marginTop: spacing.xs,
  },
  hintText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    marginTop: spacing.xs,
  },
});
