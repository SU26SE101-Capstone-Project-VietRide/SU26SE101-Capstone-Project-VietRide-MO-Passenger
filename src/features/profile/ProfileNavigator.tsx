import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { ProfileStackParamList } from '@app/navigation/types';
import { ProfileOverviewScreen } from './screens/ProfileOverviewScreen';
import { EditProfileScreen } from './screens/EditProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SavedPaymentsScreen } from './screens/SavedPaymentsScreen';
import { BookingHistoryScreen } from './screens/BookingHistoryScreen';
import { colors } from '@shared/theme';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
      initialRouteName="ProfileOverview"
    >
      <Stack.Screen name="ProfileOverview" component={ProfileOverviewScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="SavedPayments" component={SavedPaymentsScreen as any} />
      <Stack.Screen name="BookingHistory" component={BookingHistoryScreen} />
    </Stack.Navigator>
  );
}
