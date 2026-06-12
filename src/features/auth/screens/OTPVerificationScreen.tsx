/**
 * OTPVerificationScreen — Validates user phone number
 *
 * Visual style: Parcel booking flow inspired (gradient bg, cat mascot,
 * mint palette, card surfaces with accent border) with traditional auth layout:
 * header → OTP inputs in card → resend + verify CTA
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GoogleLogo, AppleLogo, FacebookLogo } from 'phosphor-react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { Button } from '@shared/components';
import type { AuthStackParamList } from '@app/navigation/types';
import { useAuthStore } from '../store/useAuthStore';
import { AuthStepHeader } from '../components';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'OTPVerification'>;
type ScreenRouteProp = RouteProp<AuthStackParamList, 'OTPVerification'>;

export function OTPVerificationScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ScreenRouteProp>();
  const setUser = useAuthStore((state) => state.setUser);

  const phone = route.params?.phone || 'your number';
  const CODE_LENGTH = 4;

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [timer, setTimer] = useState(59);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text.slice(-1);
    setCode(newCode);
    if (text && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
    }
  };

  const handleVerify = useCallback(() => {
    const fullCode = code.join('');
    if (fullCode.length === CODE_LENGTH) {
      setUser({
        id: 'mock-user-id',
        fullName: 'VietRide Rider',
        phone,
        email: null,
        avatarUrl: null,
      });
    }
  }, [code, setUser, phone]);

  return (
    <View style={styles.root}>
      {/* Gradient background */}
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="520" width="100%">
          <Defs>
            <LinearGradient id="otpGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#2AC1BC" stopOpacity={0.7} />
              <Stop offset="35%" stopColor="#2AC1BC" stopOpacity={0.25} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#otpGrad)" />
        </Svg>
        <View style={styles.decorCircle} />
      </View>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header with mascot */}
            <AuthStepHeader
              title="Verify it's you"
              subtitle={`We sent a 4-digit code to ${phone}.`}
            />

            {/* OTP inputs in a card */}
            <View style={styles.formCard}>
              <View style={styles.otpContainer}>
                {code.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    style={[
                      styles.otpInput,
                      digit ? styles.otpInputFilled : null,
                    ]}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    maxLength={1}
                    value={digit}
                    onChangeText={(text) => handleCodeChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive code? </Text>
                {timer > 0 ? (
                  <Text style={styles.timerText}>
                    Resend in 00:{timer.toString().padStart(2, '0')}
                  </Text>
                ) : (
                  <TouchableOpacity onPress={() => setTimer(59)}>
                    <Text style={styles.resendLink}>Resend Now</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Button
                title="Verify Code"
                onPress={handleVerify}
                disabled={code.join('').length !== CODE_LENGTH}
                size="lg"
                fullWidth
              />
            </View>


          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Verified by mistake? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.footerLink}>Go back</Text>
            </TouchableOpacity>
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
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
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
    paddingHorizontal: spacing.sm,
  },
  otpInput: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
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
  resendLink: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.primary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxl,
    marginTop: spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.divider },
  dividerLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
    marginHorizontal: spacing.md,
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  socialBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.divider,
    ...shadows.sm,
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
});
