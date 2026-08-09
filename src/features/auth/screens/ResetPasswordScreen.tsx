/**
 * ResetPasswordScreen - sets a new password using the email reset OTP.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { Input, Button } from '@shared/components';
import { useApiError, useThemedStyles } from '@shared/hooks';
import { useTheme } from '@shared/contexts/ThemeContext';
import { formatCountdown } from '@shared/utils/format';
import type { AuthStackParamList } from '@app/navigation/types';
import { resetPassword } from '../api/authApi';
import { AuthStepHeader } from '../components';
import {
  AUTH_CODE_LENGTH,
  apiFieldErrors,
  localizeAuthMessage,
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
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ScreenRouteProp>();
  const { errorMessage, clearError, handleError } = useApiError();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const { email, otpTtlMinutes = 5 } = route.params;
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ResetPasswordFormErrors>({});
  const [completed, setCompleted] = useState(false);
  const initialTtlSeconds = Math.max(otpTtlMinutes * 60, 1);
  const [expiresAt] = useState(() => Date.now() + initialTtlSeconds * 1000);
  const [timer, setTimer] = useState(initialTtlSeconds);

  const resetMutation = useMutation({
    mutationFn: resetPassword,
  });

  useEffect(() => {
    const syncTimer = () => {
      setTimer(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    };
    syncTimer();
    const interval = setInterval(syncTimer, 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncTimer();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [expiresAt]);

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
              <Stop offset="0%" stopColor={theme.colors.accent} stopOpacity={0.7} />
              <Stop offset="35%" stopColor={theme.colors.accent} stopOpacity={0.25} />
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
                  <Text style={[styles.successIcon, { color: theme.colors.primary }]}>
                    {t('common.ok')}
                  </Text>
                </View>
                <Text style={[styles.successTitle, { color: theme.colors.textPrimary }]}>
                  {t('auth.resetPassword.successTitle')}
                </Text>
                <Text style={[styles.successSubtitle, { color: theme.colors.textSecondary }]}>
                  {t('auth.resetPassword.successDescription')}
                </Text>

                <Button
                  title={t('auth.resetPassword.backToLogin')}
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
                title={t('auth.resetPassword.title')}
                subtitle={t('auth.resetPassword.description', { email })}
                onBack={() => navigation.goBack()}
                showMascot={false}
              />

              <View style={styles.formCard}>
                <View style={styles.inputWrapper}>
                  <Input
                    label={t('auth.fields.resetCode')}
                    placeholder="123456"
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    maxLength={AUTH_CODE_LENGTH}
                    value={code}
                    required
                    error={localizeAuthMessage(errors.code, t)}
                    hint={
                      isExpired
                        ? t('auth.resetPassword.codeExpired')
                        : t('auth.resetPassword.codeExpiresIn', {
                            time: formatCountdown(timer),
                          })
                    }
                    onBlur={() => validateField('code')}
                    onChangeText={(value) => {
                      setCode(value.replace(/\D/g, '').slice(0, AUTH_CODE_LENGTH));
                      clearFieldError('code');
                    }}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Input
                    label={t('auth.fields.newPassword')}
                    placeholder={t('auth.fields.newPasswordPlaceholder')}
                    secureTextEntry
                    textContentType="newPassword"
                    autoComplete="password-new"
                    value={password}
                    required
                    error={localizeAuthMessage(errors.password, t)}
                    hint={t('auth.fields.passwordRequirements')}
                    onBlur={() => validateField('password')}
                    onChangeText={(value) => {
                      setPassword(value);
                      clearFieldError('password');
                    }}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Input
                    label={t('auth.fields.confirmNewPassword')}
                    placeholder={t('auth.fields.confirmNewPasswordPlaceholder')}
                    secureTextEntry
                    textContentType="newPassword"
                    autoComplete="password-new"
                    value={confirmPassword}
                    required
                    error={localizeAuthMessage(errors.confirmPassword, t)}
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

                {isExpired ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => navigation.navigate('ForgotPassword')}
                    style={({ pressed }) => [
                      styles.expiredAction,
                      pressed ? styles.expiredActionPressed : null,
                    ]}
                  >
                    <Text style={styles.expiredActionText}>
                      {t('auth.resetPassword.requestNewCode')}
                    </Text>
                  </Pressable>
                ) : null}

                <Button
                  title={t('auth.resetPassword.submit')}
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

const createStyles = (theme: AppTheme) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
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
    backgroundColor: theme.effects.ambientGlow,
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
    ...theme.components.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderTopWidth: 3,
    borderTopColor: theme.colors.primaryLight,
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
    color: theme.colors.error,
    marginBottom: spacing.md,
  },
  expiredAction: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  expiredActionPressed: { opacity: 0.72 },
  expiredActionText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
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
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
    borderWidth: 2,
    borderColor: theme.colors.primaryLight,
  },
  successIcon: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.primary,
  },
  successTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.textPrimary,
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.lg,
    color: theme.colors.textSecondary,
    lineHeight: fontSizes.lg * 1.5,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
  },
  backButton: { marginTop: spacing.xxl, minWidth: 200 },
});
