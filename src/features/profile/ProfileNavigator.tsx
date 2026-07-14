import React from 'react';
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
import { OTPVerificationScreen } from '@features/auth';

import { useTheme } from '@shared/contexts/ThemeContext';

const Stack = createNativeStackNavigator<ProfileStackParamList>();
const ChangePasswordRoute = PROFILE_SECURITY_CAPABILITIES.changePassword
  ? ChangePasswordScreen
  : SecurityFeatureUnavailableScreen;

export function ProfileNavigator(): React.JSX.Element {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'slide_from_right',
      }}
      initialRouteName="ProfileOverview"
    >
      <Stack.Screen name="ProfileOverview" component={ProfileOverviewScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="SecuritySettings" component={SecurityScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordRoute} />
      <Stack.Screen name="ThemeSettings" component={ThemeScreen} />
      <Stack.Screen name="Wallet" component={FinancialFeatureUnavailableScreen} />
      <Stack.Screen name="TopUp" component={FinancialFeatureUnavailableScreen} />
      <Stack.Screen name="Withdraw" component={FinancialFeatureUnavailableScreen} />
      <Stack.Screen name="AddPaymentMethod" component={FinancialFeatureUnavailableScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} options={{ animation: 'slide_from_bottom' }} />
    </Stack.Navigator>
  );
}
