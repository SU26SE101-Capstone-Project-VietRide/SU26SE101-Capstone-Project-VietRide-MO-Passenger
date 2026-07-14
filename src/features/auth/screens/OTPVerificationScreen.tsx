/**
 * OTPVerificationScreen — email verification flow for registration/profile.
 *
 * purpose='REGISTRATION' -> verifyEmail API.
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
import { getTokenSessionEpoch } from '@shared/utils/storage';
import { useTheme } from '@shared/contexts/ThemeContext';
import { getCardStyle } from '@shared/theme/helpers';
import { formatCountdown } from '@shared/utils/format';
import type { AuthStackParamList, ProfileStackParamList } from '@app/navigation/types';
import { verifyEmail, resendVerificationEmail } from '../api/authApi';
import { useAuthStore } from '../store/useAuthStore';
import { AuthStepHeader } from '../components';
import {
  AUTH_CODE_LENGTH,
  apiFieldErrors,
  otpSchema,
  zodFieldErrors,
  type FieldErrorMap,
} from '../validation/authValidation';

// The screen can be reached from either Auth or Profile stack
type OTPParams = AuthStackParamList['OTPVerification'] | ProfileStackParamList['OTPVerification'];
type ScreenRouteProp = RouteProp<{ OTPVerification: OTPParams }, 'OTPVerification'>;
type OtpFormField = 'code';
type OtpFormErrors = FieldErrorMap<OtpFormField>;

const otpFieldAliases: Partial<Record<string, OtpFormField>> = {
  code: 'code',
  otp: 'code',
};

export function OTPVerificationScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList & ProfileStackParamList>>();
  const route = useRoute<ScreenRouteProp>();
  const { errorMessage, clearError, handleError } = useApiError();
  const theme = useTheme();
  const isLiquid = theme.variant.startsWith('liquid');
  const setUser = useAuthStore((state) => state.setUser);
  const currentUser = useAuthStore((state) => state.user);

  const {
    email,
    phone,
    otpTtlMinutes = 5,
    purpose,
    fromProfile = false,
  } = route.params;

  const [code, setCode] = useState<string[]>(Array(AUTH_CODE_LENGTH).fill(''));
  const [timer, setTimer] = useState(Math.max(otpTtlMinutes * 60, 1));
  const [errors, setErrors] = useState<OtpFormErrors>({});
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const verifyMutation = useMutation({ mutationFn: verifyEmail });
  const resendMutation = useMutation({ mutationFn: resendVerificationEmail });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ─── Input handling ──────────────────────────────────────
  const handleCodeChange = (text: string, index: number) => {
    clearError();
    setErrors({});
    setResendMessage(null);
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

  // ─── Submit ──────────────────────────────────────────────
  const handleVerify = useCallback(async () => {
    const sessionEpoch = getTokenSessionEpoch();
    const fullCode = code.join('');

    const parsed = otpSchema.safeParse({ code: fullCode });

    if (!parsed.success) {
      setErrors(zodFieldErrors<OtpFormField>(parsed.error));
      return;
    }

    clearError();

    try {
      const response = await verifyMutation.mutateAsync({
        email,
        code: parsed.data.code,
        purpose: 'REGISTRATION',
      });

      if (fromProfile && currentUser) {
        if (setUser(
          { ...currentUser, status: response.status ?? 'ACTIVE' },
          sessionEpoch,
        )) {
          navigation.goBack();
        }
      } else {
        navigation.navigate('Login', { email, verified: true });
      }
    } catch (error) {
      const apiError = handleError(error);
      setErrors(apiFieldErrors<OtpFormField>(
        apiError.fields,
        otpFieldAliases,
      ));
    }
  }, [clearError, code, email, handleError, navigation, verifyMutation, fromProfile, currentUser, setUser]);

  // ─── Resend OTP ──────────────────────────────────────────
  const handleResend = useCallback(async () => {
    clearError();
    setErrors({});
    setResendMessage(null);

    try {
      const response = await resendMutation.mutateAsync({ email, purpose });
      // Reset timer with new TTL from server
      setTimer(Math.max((response.otpTtlMinutes ?? otpTtlMinutes) * 60, 1));
      // Clear existing code
      setCode(Array(AUTH_CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      setResendMessage('A new code has been sent to your email.');
    } catch (error) {
      handleError(error);
    }
  }, [clearError, email, purpose, resendMutation, handleError, otpTtlMinutes]);

  const isPending = verifyMutation.isPending;
  const fullCode = code.join('');
  const isExpired = timer === 0;
  const codeError = errors.code;
  const visibleError = codeError ?? errorMessage;

  // ─── Dynamic copy based on purpose ──────────────────────
  const headerTitle = 'Verify it\'s you';
  const headerSubtitle = `We sent a 6-digit code to ${email}${phone ? ` (${phone})` : ''}.`;
  const expiredText = 'Code expired. Please request a new code.';
  const buttonTitle = 'Verify Code';
  const footerQuestion = 'Wrong email?';

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="520" width="100%">
          <Defs>
            <LinearGradient id="otpGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={theme.isDark ? theme.colors.primaryDark : '#2AC1BC'} stopOpacity={0.7} />
              <Stop offset="35%" stopColor={theme.isDark ? theme.colors.primaryDark : '#2AC1BC'} stopOpacity={0.25} />
              <Stop offset="100%" stopColor={theme.colors.background} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#otpGrad)" />
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
              title={headerTitle}
              subtitle={headerSubtitle}
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
                    accessibilityLabel={`Verification code digit ${index + 1}`}
                    onChangeText={(text) => handleCodeChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <View style={styles.resendContainer}>
                {isExpired ? (
                  <Text style={[styles.resendText, { color: theme.colors.textSecondary }]}>
                    {expiredText}
                  </Text>
                ) : (
                  <>
                    <Text style={[styles.resendText, { color: theme.colors.textSecondary }]}>
                      Code expires in{' '}
                    </Text>
                    <Text style={[styles.timerText, { color: theme.colors.textTertiary }]}>
                      {formatCountdown(timer)}
                    </Text>
                  </>
                )}
              </View>

              {/* Resend button */}
              <Pressable
                onPress={handleResend}
                disabled={resendMutation.isPending}
                style={({ pressed }) => [
                  styles.resendButton,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={[styles.resendLink, { color: theme.colors.primary }]}>
                  {resendMutation.isPending ? 'Sending...' : 'Resend Code'}
                </Text>
              </Pressable>

              {resendMessage ? (
                <Text style={[styles.successText, { color: theme.colors.success ?? '#22C55E' }]}>
                  {resendMessage}
                </Text>
              ) : null}

              {visibleError ? (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {visibleError}
                </Text>
              ) : null}

              <Button
                title={buttonTitle}
                onPress={handleVerify}
                disabled={fullCode.length !== AUTH_CODE_LENGTH || isPending || isExpired}
                loading={isPending}
                size="lg"
                fullWidth
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
              {footerQuestion}{' '}
            </Text>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => (pressed ? styles.pressed : null)}
            >
              <Text style={[styles.footerLink, { color: theme.colors.primary }]}>Go back</Text>
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
    marginBottom: spacing.sm,
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
  resendButton: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  resendLink: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: colors.primary,
  },
  successText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: '#22C55E',
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
