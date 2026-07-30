import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { ProfileStackParamList } from '@app/navigation/types';
import { ProfileOverviewScreen } from './screens/ProfileOverviewScreen';
import { EditProfileScreen } from './screens/EditProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SecurityScreen } from './screens/SecurityScreen';
import { ChangePasswordScreen } from './screens/ChangePasswordScreen';
import { SecurityFeatureUnavailableScreen } from './screens/SecurityFeatureUnavailableScreen';
import { PROFILE_SECURITY_CAPABILITIES } from './config/securityCapabilities';
import { ThemeScreen } from './screens/ThemeScreen';
import { FinancialFeatureUnavailableScreen } from './screens/FinancialFeatureUnavailableScreen';
import { WalletScreen } from './screens/WalletScreen';
import { TopUpScreen } from './screens/TopUpScreen';
import { PROFILE_FINANCIAL_CAPABILITIES } from './config/financialCapabilities';
import { OTPVerificationScreen } from '@features/auth';

import { useTheme } from '@shared/contexts/ThemeContext';
import { createNativeStackOptions, useMotion } from '@shared/motion';

const Stack = createNativeStackNavigator<ProfileStackParamList>();
const ChangePasswordRoute = PROFILE_SECURITY_CAPABILITIES.changePassword
  ? ChangePasswordScreen
  : SecurityFeatureUnavailableScreen;
const WalletRoute = PROFILE_FINANCIAL_CAPABILITIES.walletOverview
  ? WalletScreen
  : FinancialFeatureUnavailableScreen;
const TopUpRoute = PROFILE_FINANCIAL_CAPABILITIES.topUp
  ? TopUpScreen
  : FinancialFeatureUnavailableScreen;

export function ProfileNavigator(): React.JSX.Element {
  const theme = useTheme();
  const { reduceMotion } = useMotion();
  const screenOptions = useMemo(
    () => createNativeStackOptions({ theme, reduceMotion }),
    [reduceMotion, theme],
  );

  return (
    <Stack.Navigator
      screenOptions={screenOptions}
      initialRouteName="ProfileOverview"
    >
      <Stack.Screen name="ProfileOverview" component={ProfileOverviewScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="SecuritySettings" component={SecurityScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordRoute} />
      <Stack.Screen name="ThemeSettings" component={ThemeScreen} />
      <Stack.Screen name="Wallet" component={WalletRoute} />
      <Stack.Screen name="TopUp" component={TopUpRoute} />
      <Stack.Screen name="Withdraw" component={FinancialFeatureUnavailableScreen} />
      <Stack.Screen name="SavedPayments" component={FinancialFeatureUnavailableScreen} />
      <Stack.Screen name="AddPaymentMethod" component={FinancialFeatureUnavailableScreen} />
      <Stack.Screen
        name="OTPVerification"
        component={OTPVerificationScreen}
        options={{
          animation: reduceMotion ? 'none' : 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
}
