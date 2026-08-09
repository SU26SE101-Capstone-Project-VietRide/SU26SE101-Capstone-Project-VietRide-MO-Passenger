/**
 * Input — Themed text input with label, error, and icon support
 */

import React, { forwardRef, useId, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TextInputProps,
  ViewStyle,
  StyleProp,
  TextStyle,
  Pressable,
} from 'react-native';
import { Eye, EyeSlash } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

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
  inputStyle?: StyleProp<TextStyle>;
  required?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      containerStyle,
      inputStyle,
      required = false,
      ...textInputProps
    },
    ref,
  ) => {
    const theme = useTheme();
    const { t } = useTranslation();
    const styles = useThemedStyles(createStyles);
    const [isFocused, setIsFocused] = useState(false);
    const hasError = Boolean(error);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const inputId = useId().replace(/:/g, '');
    const labelId = `${inputId}-label`;
    const descriptionId = `${inputId}-description`;
    const isPassword = textInputProps.secureTextEntry === true;

    return (
      <View style={[styles.container, containerStyle]}>
        {label ? (
          <Text nativeID={labelId} style={styles.label}>
            {label}
            {required ? <Text style={styles.required}> *</Text> : null}
          </Text>
        ) : null}

        <View style={styles.inputWrap}>
          <TextInput
            {...textInputProps}
            ref={ref}
            accessibilityLabel={textInputProps.accessibilityLabel ?? label}
            aria-labelledby={label ? labelId : undefined}
            aria-describedby={(hasError || hint) ? descriptionId : undefined}
            aria-invalid={hasError}
            secureTextEntry={isPassword && !passwordVisible}
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
              isPassword ? styles.passwordInput : null,
              isFocused ? styles.inputFocused : null,
              hasError ? styles.inputError : null,
              inputStyle,
            ]}
          />
          {isPassword ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={passwordVisible
                ? t('common.hidePassword')
                : t('common.showPassword')}
              onPress={() => setPasswordVisible((visible) => !visible)}
              style={({ pressed }) => [
                styles.passwordToggle,
                pressed ? styles.passwordTogglePressed : null,
              ]}
            >
              {passwordVisible
                ? <EyeSlash size={20} color={theme.colors.textSecondary} />
                : <Eye size={20} color={theme.colors.textSecondary} />}
            </Pressable>
          ) : null}
        </View>

        {hasError ? <Text nativeID={descriptionId} style={styles.errorText}>{error}</Text> : null}
        {!hasError && hint ? <Text nativeID={descriptionId} style={styles.hintText}>{hint}</Text> : null}
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
  inputWrap: { position: 'relative' as const },
  input: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    ...theme.components.field,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  passwordInput: { paddingRight: 56 },
  passwordToggle: {
    position: 'absolute' as const,
    right: spacing.xs,
    top: 2,
    width: 44,
    height: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  passwordTogglePressed: { opacity: 0.65 },
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
    // Helper copy is functional text, so it uses the stronger secondary token
    // instead of the decorative tertiary token in both themes.
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
});
