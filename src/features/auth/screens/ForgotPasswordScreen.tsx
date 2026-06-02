/**
 * ForgotPasswordScreen — Password reset request
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { Input, Button } from '@shared/components';
import type { AuthStackParamList } from '@app/navigation/types';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(() => {
    // Mock sending reset link
    setSubmitted(true);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FF" />
      <View style={styles.ambientGlow} />

      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          {!submitted ? (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Reset Password 🔐</Text>
                <Text style={styles.subtitle}>
                  Enter your phone number or email and we'll send you instructions to reset your password.
                </Text>
              </View>

              <Input
                label="Phone Number or Email"
                placeholder="e.g. 0987654321"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                autoCapitalize="none"
                value={emailOrPhone}
                onChangeText={setEmailOrPhone}
                containerStyle={{ marginBottom: spacing.xxl }}
              />

              <Button
                title="Send Reset Link"
                onPress={handleSubmit}
                disabled={!emailOrPhone}
              />
            </>
          ) : (
            <View style={styles.successContainer}>
              <View style={styles.successIconBubble}>
                <Text style={styles.successIcon}>✨</Text>
              </View>
              <Text style={styles.title}>Check your inbox</Text>
              <Text style={[styles.subtitle, { textAlign: 'center', marginBottom: spacing.xxxl }]}>
                We've sent a reset link to {emailOrPhone}. Please check your spam folder if you don't see it.
              </Text>

              <Button
                title="Back to Login"
                onPress={() => navigation.navigate('Login')}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7F9FF',
  },
  ambientGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(42, 193, 188, 0.12)',
    width: 585,
    height: 585,
    borderRadius: 9999,
    top: -176.8,
    left: -97.5,
    zIndex: 0,
  },
  navHeader: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.textPrimary,
    fontFamily: fontFamilies.bold,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  header: {
    marginBottom: 48,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.lg,
    color: colors.textSecondary,
    lineHeight: fontSizes.lg * 1.5,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  successIconBubble: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(54, 179, 126, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  successIcon: {
    fontSize: 48,
  },
});
