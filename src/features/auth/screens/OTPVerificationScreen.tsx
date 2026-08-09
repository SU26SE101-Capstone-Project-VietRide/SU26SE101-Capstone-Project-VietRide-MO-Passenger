/**
 * OTPVerificationScreen — email verification flow for registration/profile.
 *
 * purpose='REGISTRATION' -> verifyEmail API.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StatusBar,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  AppState,
  useWindowDimensions,
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
import { Button } from '@shared/components';
import { useApiError, useThemedStyles } from '@shared/hooks';
import { getTokenSessionEpoch } from '@shared/utils/storage';
import { useTheme } from '@shared/contexts/ThemeContext';
import { formatCountdown } from '@shared/utils/format';
import type { AuthStackParamList, ProfileStackParamList } from '@app/navigation/types';
import { verifyEmail, resendVerificationEmail } from '../api/authApi';
import { useAuthStore } from '../store/useAuthStore';
import { AuthFooter, AuthStepHeader } from '../components';
import {
  AUTH_CODE_LENGTH,
  apiFieldErrors,
  localizeAuthMessage,
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
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList & ProfileStackParamList>>();
  const route = useRoute<ScreenRouteProp>();
  const { errorMessage, clearError, handleError } = useApiError();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { width: viewportWidth } = useWindowDimensions();
  const isNarrow = viewportWidth <= 340;
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
  const initialTtlSeconds = Math.max(otpTtlMinutes * 60, 1);
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + initialTtlSeconds * 1000);
  const [timer, setTimer] = useState(initialTtlSeconds);
  const [errors, setErrors] = useState<OtpFormErrors>({});
  const [resendSucceeded, setResendSucceeded] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const verifyMutation = useMutation({ mutationFn: verifyEmail });
  const resendMutation = useMutation({ mutationFn: resendVerificationEmail });

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

  // ─── Input handling ──────────────────────────────────────
  const handleCodeChange = (text: string, index: number) => {
    clearError();
    setErrors({});
    setResendSucceeded(false);
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
    setResendSucceeded(false);

    try {
      const response = await resendMutation.mutateAsync({ email, purpose });
      // Reset timer with new TTL from server
      const ttlSeconds = Math.max((response.otpTtlMinutes ?? otpTtlMinutes) * 60, 1);
      setExpiresAt(Date.now() + ttlSeconds * 1000);
      setTimer(ttlSeconds);
      // Clear existing code
      setCode(Array(AUTH_CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      setResendSucceeded(true);
    } catch (error) {
      handleError(error);
    }
  }, [clearError, email, purpose, resendMutation, handleError, otpTtlMinutes]);

  const isPending = verifyMutation.isPending;
  const fullCode = code.join('');
  const isExpired = timer === 0;
  const codeError = localizeAuthMessage(errors.code, t);
  const visibleError = codeError ?? errorMessage;

  // ─── Dynamic copy based on purpose ──────────────────────
  const headerTitle = t('auth.otp.title');
  const headerSubtitle = phone
    ? t('auth.otp.descriptionWithPhone', { email, phone })
    : t('auth.otp.description', { email });
  const expiredText = t('auth.otp.expired');
  const buttonTitle = t('auth.otp.verify');
  const footerQuestion = t('auth.otp.wrongEmail');

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="520" width="100%">
          <Defs>
            <LinearGradient id="otpGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={theme.colors.accent} stopOpacity={0.7} />
              <Stop offset="35%" stopColor={theme.colors.accent} stopOpacity={0.25} />
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
            contentContainerStyle={[
              styles.scrollContent,
              isNarrow ? styles.scrollContentNarrow : null,
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <AuthStepHeader
              title={headerTitle}
              subtitle={headerSubtitle}
            />

            <View style={[styles.formCard, isNarrow ? styles.formCardNarrow : null]}>
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
                    accessibilityLabel={t('auth.otp.digitAccessibility', {
                      position: index + 1,
                    })}
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
                      {t('auth.otp.expiresIn')}{' '}
                    </Text>
                    <Text style={[styles.timerText, { color: theme.colors.textTertiary }]}>
                      {formatCountdown(timer)}
                    </Text>
                  </>
                )}
              </View>

              {/* Resend button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('auth.otpResend')}
                accessibilityState={{ disabled: resendMutation.isPending, busy: resendMutation.isPending }}
                onPress={handleResend}
                disabled={resendMutation.isPending}
                style={({ pressed }) => [
                  styles.resendButton,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={[styles.resendLink, { color: theme.colors.primary }]}>
                  {resendMutation.isPending
                    ? t('auth.otp.sending')
                    : t('auth.otpResend')}
                </Text>
              </Pressable>

              {resendSucceeded ? (
                <Text style={styles.successText}>
                  {t('auth.otp.resendSuccess')}
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

          <AuthFooter
            prompt={footerQuestion}
            actionLabel={t('common.back')}
            onAction={() => navigation.goBack()}
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  scrollContentNarrow: { paddingHorizontal: spacing.sm },
  formCard: {
    ...theme.components.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderTopWidth: 3,
    borderTopColor: theme.colors.primaryLight,
    marginBottom: spacing.xxl,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: spacing.xxl,
  },
  formCardNarrow: { paddingHorizontal: spacing.xs },
  otpInput: {
    width: 44,
    height: 56,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.effects.fieldSurface,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.textPrimary,
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
    color: theme.colors.textSecondary,
  },
  timerText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: theme.colors.textTertiary,
  },
  resendButton: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  resendLink: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.primary,
  },
  successText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.success,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
