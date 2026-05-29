/**
 * Auth Navigator — Stack for unauthenticated flows
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';

import type { AuthStackParamList } from './types';
import { colors, fontFamilies, fontSizes } from '@shared/theme';

const Stack = createNativeStackNavigator<AuthStackParamList>();

// ─── Placeholder Screens (replaced in Phase 4) ───────────

function LoginScreen(): React.JSX.Element {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Login Screen</Text>
    </View>
  );
}

function RegisterScreen(): React.JSX.Element {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Register Screen</Text>
    </View>
  );
}

function OTPVerificationScreen(): React.JSX.Element {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>OTP Verification Screen</Text>
    </View>
  );
}

function ForgotPasswordScreen(): React.JSX.Element {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Forgot Password Screen</Text>
    </View>
  );
}

// ─── Navigator ────────────────────────────────────────────

export function AuthNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  placeholderText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.lg,
    color: colors.textSecondary,
  },
});
