import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { ProfileStackParamList } from '@app/navigation/types';
import { ProfileOverviewScreen } from './screens/ProfileOverviewScreen';
import { EditProfileScreen } from './screens/EditProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SecurityScreen } from './screens/SecurityScreen';
import { ChangePasswordScreen } from './screens/ChangePasswordScreen';
import { ThemeScreen } from './screens/ThemeScreen';
import { WalletScreen } from './screens/WalletScreen';
import { TopUpScreen } from './screens/TopUpScreen';
import { WithdrawScreen } from './screens/WithdrawScreen';
import { AddPaymentMethodScreen } from './screens/AddPaymentMethodScreen';

import { useTheme } from '@shared/contexts/ThemeContext';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

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
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="ThemeSettings" component={ThemeScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="TopUp" component={TopUpScreen} />
      <Stack.Screen name="Withdraw" component={WithdrawScreen} />
      <Stack.Screen name="AddPaymentMethod" component={AddPaymentMethodScreen} />

    </Stack.Navigator>
  );
}
