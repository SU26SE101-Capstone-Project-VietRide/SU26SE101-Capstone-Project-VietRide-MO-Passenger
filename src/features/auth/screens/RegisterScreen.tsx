/**
 * RegisterScreen - Account creation flow backed by Identity /v1/auth/register.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { Trans, useTranslation } from 'react-i18next';
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
import { getCardStyle } from '@shared/theme/helpers';
import type { AuthStackParamList } from '@app/navigation/types';
import { register } from '../api/authApi';
import { AuthFooter, AuthStepHeader } from '../components';
import {
  apiFieldErrors,
  localizeAuthMessage,
  registerSchema,
  zodFieldErrors,
  type FieldErrorMap,
} from '../validation/authValidation';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;
type RegisterFormField =
  | 'fullName'
  | 'email'
  | 'phone'
  | 'password'
  | 'confirmPassword';
type RegisterFormErrors = FieldErrorMap<RegisterFormField>;

const registerFieldAliases: Partial<Record<string, RegisterFormField>> = {
  displayName: 'fullName',
  email: 'email',
  phone: 'phone',
  password: 'password',
  confirmPassword: 'confirmPassword',
};

export function RegisterScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const { errorMessage, clearError, handleError } = useApiError();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isLiquid = theme.variant.startsWith('liquid');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<RegisterFormErrors>({});

  const registerMutation = useMutation({
    mutationFn: register,
  });

  const validateField = useCallback((field: RegisterFormField) => {
    const parsed = registerSchema.safeParse({
      displayName: fullName,
      email,
      phone,
      password,
      confirmPassword,
    });

    if (parsed.success) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      return;
    }

    const nextErrors = zodFieldErrors<RegisterFormField>(
      parsed.error,
      registerFieldAliases,
    );
    setErrors((prev) => ({ ...prev, [field]: nextErrors[field] }));
  }, [confirmPassword, email, fullName, password, phone]);

  const handleRegister = useCallback(async () => {
    clearError();

    const parsed = registerSchema.safeParse({
      displayName: fullName,
      email,
      phone,
      password,
      confirmPassword,
    });

    if (!parsed.success) {
      setErrors(zodFieldErrors<RegisterFormField>(
        parsed.error,
        registerFieldAliases,
      ));
      return;
    }

    const payload = {
      email: parsed.data.email,
      password: parsed.data.password,
      displayName: parsed.data.displayName,
      phone: parsed.data.phone,
    };

    try {
      const response = await registerMutation.mutateAsync(payload);
      navigation.navigate('OTPVerification', {
        email: response.email,
        phone: payload.phone,
        otpTtlMinutes: response.otpTtlMinutes,
        purpose: 'REGISTRATION',
      });
    } catch (error) {
      const apiError = handleError(error);
      setErrors((prev) => ({
        ...prev,
        ...apiFieldErrors<RegisterFormField>(
          apiError.fields,
          registerFieldAliases,
        ),
      }));
    }
  }, [
    clearError,
    confirmPassword,
    email,
    fullName,
    handleError,
    navigation,
    password,
    phone,
    registerMutation,
  ]);

  const clearFieldError = useCallback((field: keyof RegisterFormErrors) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    clearError();
  }, [clearError]);

  const isSubmitDisabled =
    !fullName.trim() ||
    !email.trim() ||
    !phone.trim() ||
    !password ||
    !confirmPassword ||
    registerMutation.isPending;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="520" width="100%">
          <Defs>
            <LinearGradient id="registerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={theme.colors.accent} stopOpacity={0.7} />
              <Stop offset="35%" stopColor={theme.colors.accent} stopOpacity={0.25} />
              <Stop offset="100%" stopColor={theme.colors.background} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#registerGrad)" />
        </Svg>
        <View style={[styles.decorCircle, { backgroundColor: theme.effects.ambientGlow }]} />
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
              title={t('auth.registerFlow.title')}
              subtitle={t('auth.registerFlow.description')}
            />

            <View style={[styles.formCard, isLiquid && getCardStyle(theme, styles.formCard)]}>
              <View style={styles.inputWrapper}>
                <Input
                  label={t('auth.fields.fullName')}
                  placeholder={t('auth.fields.fullNamePlaceholder')}
                  autoCapitalize="words"
                  textContentType="name"
                  autoComplete="name"
                  value={fullName}
                  required
                  error={localizeAuthMessage(errors.fullName, t)}
                  onBlur={() => validateField('fullName')}
                  onChangeText={(value) => {
                    setFullName(value);
                    clearFieldError('fullName');
                  }}
                />
              </View>
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
                  label={t('auth.phone')}
                  placeholder="0900000000"
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  value={phone}
                  required
                  error={localizeAuthMessage(errors.phone, t)}
                  hint={t('auth.fields.phoneHint')}
                  onBlur={() => validateField('phone')}
                  onChangeText={(value) => {
                    setPhone(value);
                    clearFieldError('phone');
                  }}
                />
              </View>
              <View style={styles.inputWrapper}>
                <Input
                  label={t('auth.password')}
                  placeholder={t('auth.fields.createPasswordPlaceholder')}
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
                  label={t('auth.fields.confirmPassword')}
                  placeholder={t('auth.fields.confirmPasswordPlaceholder')}
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

              <Text style={[styles.termsText, { color: theme.colors.textTertiary }]}>
                <Trans
                  i18nKey="auth.registerFlow.agreement"
                  components={{
                    terms: (
                      <Text
                        style={[styles.termsLink, { color: theme.colors.primary }]}
                      />
                    ),
                    privacy: (
                      <Text
                        style={[styles.termsLink, { color: theme.colors.primary }]}
                      />
                    ),
                  }}
                />
              </Text>

              <Button
                title={t('auth.createAccount')}
                onPress={handleRegister}
                disabled={isSubmitDisabled}
                loading={registerMutation.isPending}
                size="lg"
                fullWidth
              />
            </View>

          </ScrollView>

          <AuthFooter
            prompt={t('auth.registerFlow.hasAccount')}
            actionLabel={t('auth.login')}
            onAction={() => navigation.navigate('Login')}
          />
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderTopWidth: 3,
    borderTopColor: theme.colors.primaryLight,
    ...theme.effects.cardShadow,
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
  termsText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    lineHeight: fontSizes.sm * 1.5,
  },
  termsLink: {
    color: theme.colors.primary,
    fontFamily: fontFamilies.medium,
  },
});
