/**
 * Input — Themed text input with label, error, and icon support
 */

import React, { forwardRef, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';

import {
  colors,
  fontFamilies,
  fontSizes,
  spacing,
  borderRadius,
} from '@shared/theme';

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
    const [isFocused, setIsFocused] = useState(false);
    const hasError = Boolean(error);

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        )}

        <TextInput
          ref={ref}
          placeholderTextColor={colors.textTertiary}
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
            isFocused && styles.inputFocused,
            hasError && styles.inputError,
          ]}
          {...textInputProps}
        />

        {hasError && <Text style={styles.errorText}>{error}</Text>}
        {!hasError && hint && <Text style={styles.hintText}>{hint}</Text>}
      </View>
    );
  },
);

Input.displayName = 'Input';

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error,
  },
  input: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: colors.borderFocused,
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  hintText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
});
