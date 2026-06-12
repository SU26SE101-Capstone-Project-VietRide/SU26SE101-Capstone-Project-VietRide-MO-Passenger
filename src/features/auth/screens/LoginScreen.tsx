/**
 * LoginScreen — Primary entry point for returning users
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
import { useAuthStore } from '../store/useAuthStore';
import { AuthStepHeader } from '../components';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const setUser = useAuthStore((state) => state.setUser);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = useCallback(() => {
    setUser({
      id: 'mock-user-id',
      fullName: 'Viết Thông',
      phone: phone || '0987654321',
      email: null,
      avatarUrl: null,
    });
  }, [setUser, phone]);

  return (
    <View style={styles.root}>
      {/* Gradient background with decorative accent */}
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="520" width="100%">
          <Defs>
            <LinearGradient id="loginGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#2AC1BC" stopOpacity={0.7} />
              <Stop offset="35%" stopColor="#2AC1BC" stopOpacity={0.25} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#loginGrad)" />
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
              title="Welcome back!"
              subtitle="Log in to book your next ride."
            />

            {/* Form card — mint accent top border, elevated shadow */}
            <View style={styles.formCard}>
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
                  placeholder="Enter your password"
                  secureTextEntry
                  textContentType="password"
                  autoComplete="password"
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.forgotButton}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              <Button
                title="Log In"
                onPress={handleLogin}
                disabled={!phone || !password}
                size="md"
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
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Sign up</Text>
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
  loginButton: { marginTop: spacing.sm },
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
