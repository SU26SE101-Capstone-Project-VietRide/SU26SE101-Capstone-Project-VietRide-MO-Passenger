/**
 * PasswordResetOtpScreen - confirms the password-reset OTP and receives a reset token.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  StatusBar,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { Button } from '@shared/components';
import { useApiError } from '@shared/hooks';
import { useTheme } from '@shared/contexts/ThemeContext';
import { getCardStyle } from '@shared/theme/helpers';
import type { AuthStackParamList } from '@app/navigation/types';
import { confirmPasswordResetOtp } from '../api/authApi';
import { AuthStepHeader } from '../components';
import {
  AUTH_CODE_LENGTH,
  apiFieldErrors,
  otpSchema,
  zodFieldErrors,
  type FieldErrorMap,
} from '../validation/authValidation';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'PasswordResetOtp'>;
type ScreenRouteProp = RouteProp<AuthStackParamList, 'PasswordResetOtp'>;
type OtpFormField = 'code';
type OtpFormErrors = FieldErrorMap<OtpFormField>;

const otpFieldAliases: Partial<Record<string, OtpFormField>> = {
  code: 'code',
  otp: 'code',
};

const formatTimer = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
};

export function PasswordResetOtpScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ScreenRouteProp>();
  const { errorMessage, clearError, handleError } = useApiError();
  const theme = useTheme();
  const isLiquid = theme.variant.startsWith('liquid');

  const { email, otpTtlMinutes = 5, debugOtpCode } = route.params;
  const [code, setCode] = useState<string[]>(Array(AUTH_CODE_LENGTH).fill(''));
  const [timer, setTimer] = useState(Math.max(otpTtlMinutes * 60, 1));
  const [errors, setErrors] = useState<OtpFormErrors>({});
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const confirmMutation = useMutation({
    mutationFn: confirmPasswordResetOtp,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleCodeChange = (text: string, index: number) => {
    clearError();
    setErrors({});
    const digits = text.replace(/\D/g, '').slice(0, AUTH_CODE_LENGTH);

    if (!digits) {
      setCode((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }

    setCode((prev) => {
      const next = [...prev];
      digits.split('').forEach((digit, offset) => {
        const targetIndex = index + offset;
        if (targetIndex < AUTH_CODE_LENGTH) {
          next[targetIndex] = digit;
        }
      });
      return next;
    });

    const nextFocusIndex = Math.min(index + digits.length, AUTH_CODE_LENGTH - 1);
    if (index + digits.length < AUTH_CODE_LENGTH) {
      inputRefs.current[nextFocusIndex]?.focus();
    } else {
      inputRefs.current[AUTH_CODE_LENGTH - 1]?.blur();
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setCode((prev) => {
        const next = [...prev];
        next[index - 1] = '';
        return next;
      });
    }
  };

  const handleConfirm = useCallback(async () => {
    const fullCode = code.join('');
    const parsed = otpSchema.safeParse({ code: fullCode });

    if (!parsed.success) {
      setErrors(zodFieldErrors<OtpFormField>(parsed.error));
      return;
    }

    clearError();

    try {
      const response = await confirmMutation.mutateAsync({
        email,
        code: parsed.data.code,
      });

      navigation.navigate('ResetPassword', {
        email,
        resetToken: response.resetToken,
        resetTokenTtlMinutes: response.resetTokenTtlMinutes,
      });
    } catch (error) {
      const apiError = handleError(error);
      setErrors(apiFieldErrors<OtpFormField>(
        apiError.fields,
        otpFieldAliases,
      ));
    }
  }, [clearError, code, confirmMutation, email, handleError, navigation]);

  const isPending = confirmMutation.isPending;
  const fullCode = code.join('');
  const isExpired = timer === 0;
  const codeError = errors.code;
  const visibleError = codeError ?? errorMessage;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="520" width="100%">
          <Defs>
            <LinearGradient id="resetOtpGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={theme.isDark ? theme.colors.primaryDark : '#2AC1BC'} stopOpacity={0.7} />
              <Stop offset="35%" stopColor={theme.isDark ? theme.colors.primaryDark : '#2AC1BC'} stopOpacity={0.25} />
              <Stop offset="100%" stopColor={theme.colors.background} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#resetOtpGrad)" />
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
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
          >
            <AuthStepHeader
              title="Enter reset code"
              subtitle={`We sent a 6-digit code to ${email}.`}
              onBack={() => navigation.goBack()}
              showMascot={false}
            />

            <View style={[styles.formCard, isLiquid && getCardStyle(theme, styles.formCard)]}>
              <View style={styles.otpContainer}>
                {code.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    style={[
                      styles.otpInput,
                      {
                        backgroundColor: theme.effects.isLiquid
                          ? theme.effects.fieldSurface
                          : theme.colors.surfaceAlt,
                        borderColor: theme.colors.border,
                        color: theme.colors.textPrimary,
                      },
                      digit ? { borderColor: theme.colors.primary } : null,
                      codeError ? { borderColor: theme.colors.error } : null,
                    ]}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    maxLength={AUTH_CODE_LENGTH}
                    value={digit}
                    editable={!isPending}
                    accessibilityLabel={`Password reset code digit ${index + 1}`}
                    onChangeText={(text) => handleCodeChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <View style={styles.resendContainer}>
                <Text style={[styles.resendText, { color: theme.colors.textSecondary }]}>
                  {isExpired ? 'Code expired. Please request a new code.' : 'Code expires in '}
                </Text>
                {!isExpired ? (
                  <Text style={[styles.timerText, { color: theme.colors.textTertiary }]}>
                    {formatTimer(timer)}
                  </Text>
                ) : null}
              </View>

              {debugOtpCode ? (
                <Text style={[styles.mockHintText, { color: theme.colors.primary }]}>
                  Dev code: {debugOtpCode}
                </Text>
              ) : null}

              {visibleError ? (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {visibleError}
                </Text>
              ) : null}

              <Button
                title="Confirm Code"
                onPress={handleConfirm}
                disabled={fullCode.length !== AUTH_CODE_LENGTH || isPending || isExpired}
                loading={isPending}
                size="lg"
                fullWidth
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
              Wrong email?{' '}
            </Text>
            <Pressable
              onPress={() => navigation.navigate('ForgotPassword')}
              style={({ pressed }) => (pressed ? styles.pressed : null)}
            >
              <Text style={[styles.footerLink, { color: theme.colors.primary }]}>Start over</Text>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
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
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
  },
  otpInput: {
    width: 44,
    height: 56,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  resendText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  timerText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: colors.textTertiary,
  },
  mockHintText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
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
