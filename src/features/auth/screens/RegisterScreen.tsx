/**
 * RegisterScreen — Account creation flow
 *
 * Visual style: Parcel booking flow inspired (gradient bg, cat mascot,
 * mint palette, card surfaces with accent border) with traditional auth layout:
 * header → form card → social login → footer
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
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GoogleLogo, AppleLogo, FacebookLogo } from 'phosphor-react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { Input, Button } from '@shared/components';
import type { AuthStackParamList } from '@app/navigation/types';
import { AuthStepHeader } from '../components';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export function RegisterScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = useCallback(() => {
    navigation.navigate('OTPVerification', { phone });
  }, [navigation, phone]);

  return (
    <View style={styles.root}>
      {/* Gradient background with decorative accent */}
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="520" width="100%">
          <Defs>
            <LinearGradient id="registerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#2AC1BC" stopOpacity={0.7} />
              <Stop offset="35%" stopColor="#2AC1BC" stopOpacity={0.25} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#registerGrad)" />
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
              title="Join the ride"
              subtitle="Create an account to book and track your journeys."
            />

            {/* Form card — mint accent top border, elevated shadow */}
            <View style={styles.formCard}>
              <View style={styles.inputWrapper}>
                <Input
                  label="Full Name"
                  placeholder="e.g. Nguyen Van A"
                  autoCapitalize="words"
                  textContentType="name"
                  autoComplete="name"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
              <View style={styles.inputWrapper}>
                <Input
                  label="Phone Number"
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
              <View style={styles.inputWrapper}>
                <Input
                  label="Password"
                  placeholder="Create a strong password"
                  secureTextEntry
                  textContentType="password"
                  autoComplete="password"
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
              <View style={styles.inputWrapper}>
                <Input
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  secureTextEntry
                  textContentType="password"
                  autoComplete="password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>

              <Text style={styles.termsText}>
                By creating an account, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>.
              </Text>

              <Button
                title="Create Account"
                onPress={handleRegister}
                disabled={!fullName || !phone || !password}
                size="lg"
                fullWidth
              />
            </View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Auth — icon-only circles */}
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
                <GoogleLogo size={22} color="#4285F4" weight="bold" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
                <AppleLogo size={24} color="#000000" weight="bold" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
                <FacebookLogo size={22} color="#1877F2" weight="fill" />
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Log in</Text>
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: 0,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxl,
    marginTop: spacing.sm,
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
