/**
 * LoginScreen - Primary entry point for returning users.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StatusBar,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { GoogleLogo } from 'phosphor-react-native';

import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { AppKeyboardAwareScrollView, Input, Button } from '@shared/components';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useApiError, useThemedStyles } from '@shared/hooks';
import { getLocalizedApiErrorMessage } from '@shared/api/errors';
import type { AuthStackParamList } from '@app/navigation/types';
import { login } from '../api/authApi';
import { AUTH_ERROR_TRANSLATION_KEYS } from '../authErrorKeys';
import { useAuthStore } from '../store/useAuthStore';
import { useGoogleLogin } from '../hooks/useGoogleLogin';
import { AuthFooter, AuthStepHeader } from '../components';
import {
  apiFieldErrors,
  localizeAuthMessage,
  loginSchema,
  zodFieldErrors,
  type FieldErrorMap,
} from '../validation/authValidation';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
type ScreenRouteProp = RouteProp<AuthStackParamList, 'Login'>;
type LoginFormField = 'email' | 'password';
type LoginFormErrors = FieldErrorMap<LoginFormField>;

export function LoginScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ScreenRouteProp>();
  const setSession = useAuthStore((state) => state.setSession);
  const authError = useAuthStore((state) => state.authError);
  const clearAuthError = useAuthStore((state) => state.clearAuthError);
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { errorMessage, clearError, handleError } = useApiError();
  const {
    signInWithGoogle,
    isPending: isGoogleLoginPending,
    errorMessage: googleLoginError,
  } = useGoogleLogin();

  const [email, setEmail] = useState(route.params?.email ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const authErrorMessage = useMemo(
    () => authError
      ? getLocalizedApiErrorMessage(authError, t, AUTH_ERROR_TRANSLATION_KEYS)
      : null,
    [authError, t],
  );

  const loginMutation = useMutation({
    mutationFn: login,
  });

  const clearFieldError = useCallback((field: LoginFormField) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    clearError();
    clearAuthError();
  }, [clearAuthError, clearError]);

  const validateField = useCallback((field: LoginFormField) => {
    const parsed = loginSchema.safeParse({ email, password });

    if (parsed.success) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      return;
    }

    const nextErrors = zodFieldErrors<LoginFormField>(parsed.error);
    setErrors((prev) => ({ ...prev, [field]: nextErrors[field] }));
  }, [email, password]);

  const handleLogin = useCallback(async () => {
    clearError();
    clearAuthError();

    const parsed = loginSchema.safeParse({ email, password });

    if (!parsed.success) {
      setErrors(zodFieldErrors<LoginFormField>(parsed.error));
      return;
    }

    try {
      const session = await loginMutation.mutateAsync(parsed.data);
      await setSession(session);
    } catch (error) {
      const apiError = handleError(error);
      setErrors((prev) => ({
        ...prev,
        ...apiFieldErrors<LoginFormField>(apiError.fields),
      }));
    }
  }, [clearAuthError, clearError, email, handleError, loginMutation, password, setSession]);

  const handleGoogleLogin = useCallback(async () => {
    clearError();
    clearAuthError();
    await signInWithGoogle().catch(() => undefined);
  }, [clearAuthError, clearError, signInWithGoogle]);

  const isSubmitDisabled =
    !email.trim() || !password || loginMutation.isPending || isGoogleLoginPending;

  return (
    <View style={styles.root}>
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="520" width="100%">
          <Defs>
            <LinearGradient id="loginGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={theme.colors.accent} stopOpacity={0.7} />
              <Stop offset="35%" stopColor={theme.colors.accent} stopOpacity={0.25} />
              <Stop offset="100%" stopColor={theme.colors.background} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#loginGrad)" />
        </Svg>
        <View
          style={[
            styles.decorCircle,
            { backgroundColor: theme.effects.ambientGlow },
          ]}
        />
      </View>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <View
          style={styles.keyboardView}
        >
          <AppKeyboardAwareScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <AuthStepHeader
              title={t('auth.welcomeBack')}
              subtitle={t('auth.loginFlow.description')}
            />

            <View style={styles.formCard}>
              <View style={styles.inputWrapper}>
                <Input
                  label={t('auth.fields.email')}
                  placeholder={t('auth.fields.emailPlaceholder')}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  autoCapitalize="none"
                  value={email}
                  required
                  error={localizeAuthMessage(errors.email, t)}
                  onBlur={() => validateField('email')}
                  onChangeText={(value) => {
                    setEmail(value);
                    clearFieldError('email');
                  }}
                />
              </View>
              <View style={styles.inputWrapper}>
                <Input
                  label={t('auth.password')}
                  placeholder={t('auth.fields.passwordPlaceholder')}
                  secureTextEntry
                  textContentType="password"
                  autoComplete="password"
                  value={password}
                  required
                  error={localizeAuthMessage(errors.password, t)}
                  onBlur={() => validateField('password')}
                  onChangeText={(value) => {
                    setPassword(value);
                    clearFieldError('password');
                  }}
                />
              </View>

              {route.params?.verified ? (
                <Text style={[styles.successText, { color: theme.colors.success }]}>
                  {t('auth.loginFlow.emailVerified')}
                </Text>
              ) : null}
              {errorMessage || authErrorMessage || googleLoginError ? (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errorMessage ?? authErrorMessage ?? googleLoginError}
                </Text>
              ) : null}

              <Pressable
                onPress={() => navigation.navigate('ForgotPassword')}
                style={({ pressed }) => [
                  styles.forgotButton,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={[styles.forgotText, { color: theme.colors.primary }]}>
                  {t('auth.forgotPassword')}
                </Text>
              </Pressable>

              <Button
                title={t('auth.login')}
                onPress={handleLogin}
                disabled={isSubmitDisabled}
                loading={loginMutation.isPending}
                size="md"
                fullWidth
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('auth.loginFlow.google')}
                accessibilityState={{ disabled: loginMutation.isPending || isGoogleLoginPending, busy: isGoogleLoginPending }}
                disabled={loginMutation.isPending || isGoogleLoginPending}
                onPress={handleGoogleLogin}
                style={({ pressed }) => [
                  styles.googleButton,
                  pressed && !(loginMutation.isPending || isGoogleLoginPending) ? styles.pressed : null,
                  isGoogleLoginPending ? styles.disabledGoogleButton : null,
                ]}
              >
                <GoogleLogo size={20} color={theme.colors.textPrimary} weight="bold" />
                <Text style={[styles.googleButtonText, { color: theme.colors.textPrimary }]}>
                  {isGoogleLoginPending
                    ? t('auth.loginFlow.googleConnecting')
                    : t('auth.loginFlow.google')}
                </Text>
              </Pressable>
            </View>

          </AppKeyboardAwareScrollView>

          <AuthFooter
            prompt={t('auth.loginFlow.noAccount')}
            actionLabel={t('auth.loginFlow.signUp')}
            onAction={() => navigation.navigate('Register')}
          />
        </View>
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  formCard: {
    ...theme.components.card,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderTopWidth: 3,
    borderTopColor: theme.colors.primaryLight,
    marginBottom: spacing.lg,
  },
  inputWrapper: {
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: 0,
  },
  errorText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.error,
    marginBottom: spacing.sm,
  },
  successText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.success,
    marginBottom: spacing.sm,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  forgotText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  googleButton: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    backgroundColor: theme.effects.contentSurfaceSoft,
    borderColor: theme.effects.contentBorder,
  },
  googleButtonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    marginLeft: spacing.sm,
  },
  disabledGoogleButton: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.75,
  },
});
