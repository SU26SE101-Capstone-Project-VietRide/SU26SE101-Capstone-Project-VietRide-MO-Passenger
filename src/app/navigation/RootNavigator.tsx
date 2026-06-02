/**
 * Root Navigator — Switches between Auth and Main flows
 *
 * Uses the auth store to determine which navigator to render.
 * When the user is authenticated, Main (tabs) is shown;
 * otherwise Auth (login/register) is shown.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { BookingNavigator } from '@features/booking';
import { ParcelNavigator } from '@features/parcel';
import { ChatbotScreen } from '@features/chatbot';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { colors } from '@shared/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator(): React.JSX.Element {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="Booking" component={BookingNavigator} />
          <Stack.Screen name="Parcel" component={ParcelNavigator} />
          <Stack.Screen name="Chatbot" component={ChatbotScreen} options={{ animation: 'slide_from_bottom' }} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
