/**
 * ForgotPasswordScreen — Password reset request
 *
 * Visual style: Parcel booking flow inspired (gradient bg, cat mascot,
 * mint palette, card surfaces with accent border) with traditional auth layout:
 * header (with back arrow) → form card → success state
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
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { Input, Button } from '@shared/components';
import type { AuthStackParamList } from '@app/navigation/types';
import { AuthStepHeader } from '../components';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(() => {
    setSubmitted(true);
  }, []);

  return (
    <View style={styles.root}>
      {/* Gradient background */}
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="520" width="100%">
          <Defs>
            <LinearGradient id="forgotGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#2AC1BC" stopOpacity={0.7} />
              <Stop offset="35%" stopColor="#2AC1BC" stopOpacity={0.25} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#forgotGrad)" />
        </Svg>
        <View style={styles.decorCircle} />
      </View>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {!submitted ? (
            <View style={styles.content}>
              {/* Header with mascot + back arrow */}
              <AuthStepHeader
                title="Reset Password"
                subtitle="Enter your phone number or email to reset your password."
                onBack={() => navigation.goBack()}
              />

              {/* Form card */}
              <View style={styles.formCard}>
                <View style={styles.inputWrapper}>
                  <Input
                    label="Phone Number or Email"
                    placeholder="e.g. 0987654321"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    autoCapitalize="none"
                    value={emailOrPhone}
                    onChangeText={setEmailOrPhone}
                  />
                </View>

                <Button
                  title="Send Reset Link"
                  onPress={handleSubmit}
                  disabled={!emailOrPhone}
                  size="lg"
                  fullWidth
                />
              </View>
            </View>
          ) : (
            /* Success state */
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.successScroll}
            >
              <View style={styles.successContainer}>
                <View style={styles.successIconBubble}>
                  <Text style={styles.successIcon}>✉️</Text>
                </View>
                <Text style={styles.successTitle}>Check your inbox</Text>
                <Text style={styles.successSubtitle}>
                  We've sent a reset link to {emailOrPhone}. Please check your spam
                  folder if you don't see it.
                </Text>

                <Button
                  title="Back to Login"
                  onPress={() => navigation.navigate('Login')}
                  size="lg"
                  fullWidth
                  style={styles.backButton}
                />
              </View>
            </ScrollView>
          )}
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
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
  inputWrapper: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  successScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.huge,
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
  successIcon: { fontSize: 48 },
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
