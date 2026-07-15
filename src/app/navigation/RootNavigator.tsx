/**
 * Root Navigator — Switches between Auth and Main flows
 *
 * Uses the auth store to determine which navigator to render.
 * When the user is authenticated or browsing as guest, Main (tabs) is shown;
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
import { TrackingScreen } from '@features/tracking';
import {
  useAuthInitializer,
  useAuthStore,
  useAuthSync,
  useTokenRefreshScheduler,
} from '@features/auth';
import { useTheme } from '@shared/contexts/ThemeContext';
import { LoadingOverlay } from '@shared/components';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator(): React.JSX.Element {
  useAuthInitializer();
  useAuthSync();
  useTokenRefreshScheduler();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isGuest = useAuthStore((state) => state.isGuest);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const theme = useTheme();
  const canEnterApp = isAuthenticated || isGuest;

  if (isAuthLoading) {
    return <LoadingOverlay visible message="Đang kiểm tra phiên đăng nhập..." />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'fade',
      }}
    >
      {canEnterApp ? (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="Booking" component={BookingNavigator} />
          <Stack.Screen name="Parcel" component={ParcelNavigator} />
          <Stack.Screen name="Chatbot" component={ChatbotScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="Tracking" component={TrackingScreen} options={{ animation: 'slide_from_right' }} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
