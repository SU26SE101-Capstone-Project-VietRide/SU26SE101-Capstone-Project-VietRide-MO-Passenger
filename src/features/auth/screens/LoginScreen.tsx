/**
 * LoginScreen - Primary entry point for returning users.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
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

import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { Input, Button } from '@shared/components';
import { useTheme } from '@shared/contexts/ThemeContext';
import { getCardStyle } from '@shared/theme/helpers';
import { useApiError } from '@shared/hooks';
import type { AuthStackParamList } from '@app/navigation/types';
import { login } from '../api/authApi';
import { useAuthStore } from '../store/useAuthStore';
import { useGoogleLogin } from '../hooks/useGoogleLogin';
import { AuthFooter, AuthStepHeader } from '../components';
import {
  apiFieldErrors,
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
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);
  const authError = useAuthStore((state) => state.authError);
  const clearAuthError = useAuthStore((state) => state.clearAuthError);
  const theme = useTheme();
  const isLiquid = theme.variant.startsWith('liquid');
  const { errorMessage, clearError, handleError } = useApiError();
  const {
    signInWithGoogle,
    isPending: isGoogleLoginPending,
    errorMessage: googleLoginError,
  } = useGoogleLogin();

  const [email, setEmail] = useState(route.params?.email ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isGuestPending, setIsGuestPending] = useState(false);

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

  const handleContinueAsGuest = useCallback(async () => {
    clearError();
    clearAuthError();
    setIsGuestPending(true);

    try {
      await continueAsGuest();
    } catch (error) {
      setIsGuestPending(false);
      handleError(error);
    }
  }, [clearAuthError, clearError, continueAsGuest, handleError]);

  const handleGoogleLogin = useCallback(async () => {
    clearError();
    clearAuthError();
    await signInWithGoogle().catch(() => undefined);
  }, [clearAuthError, clearError, signInWithGoogle]);

  const isSubmitDisabled =
    !email.trim() || !password || loginMutation.isPending || isGuestPending || isGoogleLoginPending;

  return (
    <View style={[styles.root, isLiquid && { backgroundColor: theme.colors.background }]}>
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
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <AuthStepHeader
              title={t('auth.welcomeBack')}
              subtitle={t('auth.loginFlow.description')}
            />

            <View style={[styles.formCard, isLiquid && getCardStyle(theme, styles.formCard)]}>
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
                  error={errors.email}
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
                  error={errors.password}
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
              {errorMessage || authError || googleLoginError ? (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errorMessage ?? authError ?? googleLoginError}
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
                accessibilityState={{ disabled: loginMutation.isPending || isGuestPending || isGoogleLoginPending, busy: isGoogleLoginPending }}
                disabled={loginMutation.isPending || isGuestPending || isGoogleLoginPending}
                onPress={handleGoogleLogin}
                style={({ pressed }) => [
                  styles.googleButton,
                  { borderColor: theme.colors.divider, backgroundColor: theme.colors.surface },
                  pressed && !(loginMutation.isPending || isGuestPending || isGoogleLoginPending) ? styles.pressed : null,
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

              <View style={styles.guestDivider}>
                <View style={[styles.dividerLine, { backgroundColor: theme.colors.divider }]} />
                <Text style={[styles.guestDividerText, { color: theme.colors.textTertiary }]}>
                  {t('common.or')}
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.colors.divider }]} />
              </View>

              <Button
                title={t('auth.loginFlow.continueAsGuest')}
                onPress={handleContinueAsGuest}
                disabled={loginMutation.isPending || isGuestPending || isGoogleLoginPending}
                loading={isGuestPending}
                variant="outline"
                size="md"
                fullWidth
              />
            </View>

          </ScrollView>

          <AuthFooter
            prompt={t('auth.loginFlow.noAccount')}
            actionLabel={t('auth.loginFlow.signUp')}
            onAction={() => navigation.navigate('Register')}
          />
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    borderTopWidth: 3,
    borderTopColor: colors.primaryLight,
    ...shadows.md,
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
    color: colors.error,
    marginBottom: spacing.sm,
  },
  successText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.success,
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
    color: colors.primary,
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
  },
  googleButtonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    marginLeft: spacing.sm,
  },
  disabledGoogleButton: {
    opacity: 0.55,
  },
  guestDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  guestDividerText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    marginHorizontal: spacing.sm,
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.75,
  },
});
