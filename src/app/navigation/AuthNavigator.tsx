/**
 * Auth Navigator — Stack for unauthenticated flows
 */

import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { AuthStackParamList } from './types';

import {
  LoginScreen,
  RegisterScreen,
  OTPVerificationScreen,
  ForgotPasswordScreen,
  ResetPasswordScreen,
} from '@features/auth';
import { useTheme } from '@shared/contexts/ThemeContext';
import { createNativeStackOptions, useMotion } from '@shared/motion';

const Stack = createNativeStackNavigator<AuthStackParamList>();

// ─── Navigator ────────────────────────────────────────────

export function AuthNavigator(): React.JSX.Element {
  const theme = useTheme();
  const { reduceMotion } = useMotion();
  const screenOptions = useMemo(
    () =>
      createNativeStackOptions({
        theme,
        reduceMotion,
        transparent: true,
      }),
    [reduceMotion, theme],
  );

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}
