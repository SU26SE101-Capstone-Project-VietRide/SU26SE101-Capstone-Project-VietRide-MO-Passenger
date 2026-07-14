/**
 * ResetPasswordScreen - sets a new password using the email reset OTP.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { Input, Button } from '@shared/components';
import { useApiError } from '@shared/hooks';
import { useTheme } from '@shared/contexts/ThemeContext';
import { getCardStyle } from '@shared/theme/helpers';
import { formatCountdown } from '@shared/utils/format';
import type { AuthStackParamList } from '@app/navigation/types';
import { resetPassword } from '../api/authApi';
import { AuthStepHeader } from '../components';
import {
  AUTH_CODE_LENGTH,
  apiFieldErrors,
  otpSchema,
  resetPasswordSchema,
  zodFieldErrors,
  type FieldErrorMap,
} from '../validation/authValidation';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type ScreenRouteProp = RouteProp<AuthStackParamList, 'ResetPassword'>;
type ResetPasswordFormField = 'code' | 'password' | 'confirmPassword';
type ResetPasswordFormErrors = FieldErrorMap<ResetPasswordFormField>;

const resetPasswordFieldAliases: Partial<Record<string, ResetPasswordFormField>> = {
  code: 'code',
  otp: 'code',
  newPassword: 'password',
  password: 'password',
  confirmPassword: 'confirmPassword',
};

export function ResetPasswordScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ScreenRouteProp>();
  const { errorMessage, clearError, handleError } = useApiError();
  const theme = useTheme();
  const isLiquid = theme.variant.startsWith('liquid');

  const { email, otpTtlMinutes = 5 } = route.params;
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ResetPasswordFormErrors>({});
  const [completed, setCompleted] = useState(false);
  const [timer, setTimer] = useState(Math.max(otpTtlMinutes * 60, 1));

  const resetMutation = useMutation({
    mutationFn: resetPassword,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const clearFieldError = useCallback((field: ResetPasswordFormField) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    clearError();
  }, [clearError]);

  const validateField = useCallback((field: ResetPasswordFormField) => {
    if (field === 'code') {
      const parsed = otpSchema.safeParse({ code });

      if (parsed.success) {
        setErrors((prev) => ({ ...prev, code: undefined }));
        return;
      }

      const nextErrors = zodFieldErrors<ResetPasswordFormField>(
        parsed.error,
        resetPasswordFieldAliases,
      );
      setErrors((prev) => ({ ...prev, code: nextErrors.code }));
      return;
    }

    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });

    if (parsed.success) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      return;
    }

    const nextErrors = zodFieldErrors<ResetPasswordFormField>(parsed.error);
    setErrors((prev) => ({ ...prev, [field]: nextErrors[field] }));
  }, [code, confirmPassword, password]);

  const handleReset = useCallback(async () => {
    clearError();

    const codeParsed = otpSchema.safeParse({ code });
    const passwordParsed = resetPasswordSchema.safeParse({ password, confirmPassword });

    if (!codeParsed.success || !passwordParsed.success) {
      setErrors({
        ...(!codeParsed.success
          ? zodFieldErrors<ResetPasswordFormField>(
            codeParsed.error,
            resetPasswordFieldAliases,
          )
          : {}),
        ...(!passwordParsed.success
          ? zodFieldErrors<ResetPasswordFormField>(passwordParsed.error)
          : {}),
      });
      return;
    }

    try {
      await resetMutation.mutateAsync({
        email,
        code: codeParsed.data.code,
        newPassword: passwordParsed.data.password,
      });
      setCompleted(true);
    } catch (error) {
      const apiError = handleError(error);
      setErrors((prev) => ({
        ...prev,
        ...apiFieldErrors<ResetPasswordFormField>(
          apiError.fields,
          resetPasswordFieldAliases,
        ),
      }));
    }
  }, [clearError, code, confirmPassword, email, handleError, password, resetMutation]);

  const isExpired = timer === 0;
  const isSubmitDisabled =
    code.length !== AUTH_CODE_LENGTH ||
    !password ||
    !confirmPassword ||
    isExpired ||
    resetMutation.isPending;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="520" width="100%">
          <Defs>
            <LinearGradient id="resetPasswordGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={theme.isDark ? theme.colors.primaryDark : '#2AC1BC'} stopOpacity={0.7} />
              <Stop offset="35%" stopColor={theme.isDark ? theme.colors.primaryDark : '#2AC1BC'} stopOpacity={0.25} />
              <Stop offset="100%" stopColor={theme.colors.background} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#resetPasswordGrad)" />
        </Svg>
        <View style={[styles.decorCircle, { backgroundColor: theme.effects.ambientGlow }]} />
      </View>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {completed ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={styles.successScroll}
            >
              <View style={styles.successContainer}>
                <View
                  style={[
                    styles.successIconBubble,
                    {
                      backgroundColor: theme.colors.primaryFaded,
                      borderColor: theme.colors.primaryLight,
                    },
                  ]}
                >
                  <Text style={[styles.successIcon, { color: theme.colors.primary }]}>OK</Text>
                </View>
                <Text style={[styles.successTitle, { color: theme.colors.textPrimary }]}>
                  Password updated
                </Text>
                <Text style={[styles.successSubtitle, { color: theme.colors.textSecondary }]}>
                  You can now log in with your new password.
                </Text>

                <Button
                  title="Back to Login"
                  onPress={() => navigation.navigate('Login', { email })}
                  size="md"
                  fullWidth
                  style={styles.backButton}
                />
              </View>
            </ScrollView>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={styles.scrollContent}
            >
              <AuthStepHeader
                title="Create new password"
                subtitle={`Enter the 6-digit code sent to ${email}, then choose a new password.`}
                onBack={() => navigation.goBack()}
                showMascot={false}
              />

              <View style={[styles.formCard, isLiquid && getCardStyle(theme, styles.formCard)]}>
                <View style={styles.inputWrapper}>
                  <Input
                    label="Reset Code"
                    placeholder="123456"
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    maxLength={AUTH_CODE_LENGTH}
                    value={code}
                    required
                    error={errors.code}
                    hint={isExpired ? 'Code expired. Go back and request a new reset code.' : `Code expires in ${formatCountdown(timer)}.`}
                    onBlur={() => validateField('code')}
                    onChangeText={(value) => {
                      setCode(value.replace(/\D/g, '').slice(0, AUTH_CODE_LENGTH));
                      clearFieldError('code');
                    }}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Input
                    label="New Password"
                    placeholder="Enter new password"
                    secureTextEntry
                    textContentType="newPassword"
                    autoComplete="password-new"
                    value={password}
                    required
                    error={errors.password}
                    hint="At least 8 characters with a letter and a number."
                    onBlur={() => validateField('password')}
                    onChangeText={(value) => {
                      setPassword(value);
                      clearFieldError('password');
                    }}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Input
                    label="Confirm New Password"
                    placeholder="Confirm new password"
                    secureTextEntry
                    textContentType="newPassword"
                    autoComplete="password-new"
                    value={confirmPassword}
                    required
                    error={errors.confirmPassword}
                    onBlur={() => validateField('confirmPassword')}
                    onChangeText={(value) => {
                      setConfirmPassword(value);
                      clearFieldError('confirmPassword');
                    }}
                  />
                </View>

                {errorMessage ? (
                  <Text style={[styles.errorText, { color: theme.colors.error }]}>
                    {errorMessage}
                  </Text>
                ) : null}

                <Button
                  title="Update Password"
                  onPress={handleReset}
                  disabled={isSubmitDisabled}
                  loading={resetMutation.isPending}
                  size="lg"
                  fullWidth
                />
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 520,
    zIndex: 0,
  },
  decorCircle: {
    position: 'absolute',
    top: 50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(42, 193, 188, 0.07)',
  },
  container: { flex: 1, backgroundColor: 'transparent' },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: spacing.xxxl,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    borderTopWidth: 3,
    borderTopColor: colors.primaryLight,
    ...shadows.md,
    marginBottom: spacing.xxl,
    marginHorizontal: spacing.xl,
  },
  inputWrapper: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.error,
    marginBottom: spacing.md,
  },
  successScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconBubble: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
  successIcon: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.primary,
  },
  successTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.lg,
    color: colors.textSecondary,
    lineHeight: fontSizes.lg * 1.5,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
  },
  backButton: { marginTop: spacing.xxl, minWidth: 200 },
});
