/**
 * ForgotPasswordScreen - starts the email OTP reset-password flow.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { Input, Button } from '@shared/components';
import { useApiError } from '@shared/hooks';
import { useTheme } from '@shared/contexts/ThemeContext';
import { getCardStyle } from '@shared/theme/helpers';
import type { AuthStackParamList } from '@app/navigation/types';
import { requestPasswordReset } from '../api/authApi';
import { AuthStepHeader } from '../components';
import {
  apiFieldErrors,
  forgotPasswordSchema,
  zodFieldErrors,
  type FieldErrorMap,
} from '../validation/authValidation';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
type ForgotPasswordFormField = 'email';
type ForgotPasswordFormErrors = FieldErrorMap<ForgotPasswordFormField>;

const forgotPasswordFieldAliases: Partial<Record<string, ForgotPasswordFormField>> = {
  email: 'email',
};

export function ForgotPasswordScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const { errorMessage, clearError, handleError } = useApiError();
  const theme = useTheme();
  const isLiquid = theme.variant.startsWith('liquid');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<ForgotPasswordFormErrors>({});

  const resetMutation = useMutation({
    mutationFn: requestPasswordReset,
  });

  const clearFieldError = useCallback(() => {
    setErrors({});
    clearError();
  }, [clearError]);

  const validateField = useCallback(() => {
    const parsed = forgotPasswordSchema.safeParse({ email });

    if (parsed.success) {
      setErrors({});
      return;
    }

    setErrors(zodFieldErrors<ForgotPasswordFormField>(parsed.error));
  }, [email]);

  const handleSubmit = useCallback(async () => {
    clearError();

    const parsed = forgotPasswordSchema.safeParse({ email });

    if (!parsed.success) {
      setErrors(zodFieldErrors<ForgotPasswordFormField>(parsed.error));
      return;
    }

    try {
      const response = await resetMutation.mutateAsync(parsed.data);
      navigation.navigate('ResetPassword', {
        email: response.email,
        otpTtlMinutes: response.otpTtlMinutes,
      });
    } catch (error) {
      const apiError = handleError(error);
      setErrors(apiFieldErrors<ForgotPasswordFormField>(
        apiError.fields,
        forgotPasswordFieldAliases,
      ));
    }
  }, [clearError, email, handleError, navigation, resetMutation]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="520" width="100%">
          <Defs>
            <LinearGradient id="forgotGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={theme.colors.accent} stopOpacity={0.7} />
              <Stop offset="35%" stopColor={theme.colors.accent} stopOpacity={0.25} />
              <Stop offset="100%" stopColor={theme.colors.background} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#forgotGrad)" />
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
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.scrollContent}
          >
            <AuthStepHeader
              title={t('auth.forgotPasswordFlow.title')}
              subtitle={t('auth.forgotPasswordFlow.description')}
              onBack={() => navigation.goBack()}
              showMascot={false}
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
                  onBlur={validateField}
                  onChangeText={(value) => {
                    setEmail(value);
                    clearFieldError();
                  }}
                />
              </View>

              {errorMessage ? (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errorMessage}
                </Text>
              ) : null}

              <Text style={[styles.helperText, { color: theme.colors.textTertiary }]}>
                {t('auth.forgotPasswordFlow.privacyHint')}
              </Text>

              <Button
                title={t('auth.forgotPasswordFlow.submit')}
                onPress={handleSubmit}
                disabled={!email.trim() || resetMutation.isPending}
                loading={resetMutation.isPending}
                size="md"
                fullWidth
              />
            </View>
          </ScrollView>
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
  helperText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginBottom: spacing.lg,
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
