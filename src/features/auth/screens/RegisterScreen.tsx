/**
 * RegisterScreen - Account creation flow backed by Identity /v1/auth/register.
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { Input, Button } from '@shared/components';
import { useApiError } from '@shared/hooks';
import { useTheme } from '@shared/contexts/ThemeContext';
import { getCardStyle } from '@shared/theme/helpers';
import type { AuthStackParamList } from '@app/navigation/types';
import { register } from '../api/authApi';
import { AuthStepHeader } from '../components';
import {
  apiFieldErrors,
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
  const navigation = useNavigation<NavProp>();
  const { errorMessage, clearError, handleError } = useApiError();
  const theme = useTheme();
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
              <Stop offset="0%" stopColor={theme.isDark ? theme.colors.primaryDark : '#2AC1BC'} stopOpacity={0.7} />
              <Stop offset="35%" stopColor={theme.isDark ? theme.colors.primaryDark : '#2AC1BC'} stopOpacity={0.25} />
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
              title="Join the ride"
              subtitle="Create an account to book and track your journeys."
            />

            <View style={[styles.formCard, isLiquid && getCardStyle(theme, styles.formCard)]}>
              <View style={styles.inputWrapper}>
                <Input
                  label="Full Name"
                  placeholder="e.g. Nguyen Van A"
                  autoCapitalize="words"
                  textContentType="name"
                  autoComplete="name"
                  value={fullName}
                  required
                  error={errors.fullName}
                  onBlur={() => validateField('fullName')}
                  onChangeText={(value) => {
                    setFullName(value);
                    clearFieldError('fullName');
                  }}
                />
              </View>
              <View style={styles.inputWrapper}>
                <Input
                  label="Email"
                  placeholder="user@example.com"
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
                  label="Phone Number"
                  placeholder="0900000000"
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  value={phone}
                  required
                  error={errors.phone}
                  hint="Vietnam phone number, e.g. 0901234567 or +84901234567."
                  onBlur={() => validateField('phone')}
                  onChangeText={(value) => {
                    setPhone(value);
                    clearFieldError('phone');
                  }}
                />
              </View>
              <View style={styles.inputWrapper}>
                <Input
                  label="Password"
                  placeholder="Create a strong password"
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
                  label="Confirm Password"
                  placeholder="Confirm your password"
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

              <Text style={[styles.termsText, { color: theme.colors.textTertiary }]}>
                By creating an account, you agree to our{' '}
                <Text style={[styles.termsLink, { color: theme.colors.primary }]}>Terms of Service</Text> and{' '}
                <Text style={[styles.termsLink, { color: theme.colors.primary }]}>Privacy Policy</Text>.
              </Text>

              <Button
                title="Create Account"
                onPress={handleRegister}
                disabled={isSubmitDisabled}
                loading={registerMutation.isPending}
                size="lg"
                fullWidth
              />
            </View>

          </ScrollView>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <Pressable
              onPress={() => navigation.navigate('Login')}
              style={({ pressed }) => (pressed ? styles.pressed : null)}
            >
              <Text style={[styles.footerLink, { color: theme.colors.primary }]}>Log in</Text>
            </Pressable>
          </View>
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
  termsText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    lineHeight: fontSizes.sm * 1.5,
  },
  termsLink: {
    color: colors.primary,
    fontFamily: fontFamilies.medium,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  footerText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  footerLink: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.primary,
  },
  pressed: {
    opacity: 0.75,
  },
});
