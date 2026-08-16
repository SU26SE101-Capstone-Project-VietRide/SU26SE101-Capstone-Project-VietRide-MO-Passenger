/**
 * Root Navigator — Switches between Auth and Main flows
 *
 * Uses the auth store to determine which navigator to render.
 * Only authenticated users with a completed phone profile can enter Main.
 */

import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { BookingNavigator } from '@features/booking';
import { ParcelNavigator } from '@features/parcel';
import { ChatbotScreen } from '@features/chatbot';
import { TrackingScreen } from '@features/tracking';
import { PolicyDetailScreen, PolicyListScreen } from '@features/policy';
import { NotificationDetailScreen } from '@features/home/screens/NotificationDetailScreen';
import { BookingPendingActionScreen } from '@features/booking/screens/BookingPendingActionScreen';
import {
  useAuthInitializer,
  useAuthStore,
  useAuthSync,
  useTokenRefreshScheduler,
  CompleteProfileScreen,
} from '@features/auth';
import { useTheme } from '@shared/contexts/ThemeContext';
import { AppLaunchScreen } from '@shared/components';
import { PaymentLifecycleCoordinator } from '@app/components/PaymentLifecycleCoordinator';
import { createNativeStackOptions, useMotion } from '@shared/motion';

const Stack = createNativeStackNavigator<RootStackParamList>();

const renderAuthScreen = (): React.JSX.Element => (
  <Stack.Screen
    name="Auth"
    navigationKey="signed-out-auth"
    component={AuthNavigator}
  />
);

const renderCompleteProfileScreen = (): React.JSX.Element => (
  <Stack.Screen
    name="CompleteProfile"
    component={CompleteProfileScreen}
  />
);

export function RootNavigator(): React.JSX.Element {
  useAuthInitializer();
  useAuthSync();
  useTokenRefreshScheduler();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();
  const { t } = useTranslation();
  const { reduceMotion } = useMotion();
  const screenOptions = useMemo(
    () =>
      createNativeStackOptions({
        theme,
        reduceMotion,
        animation: 'fade',
      }),
    [reduceMotion, theme],
  );
  const needsPhoneCompletion = isAuthenticated && Boolean(user && !user.phone);
  const canEnterApp = isAuthenticated && Boolean(user?.phone);

  if (isAuthLoading || (isAuthenticated && !user)) {
    return <AppLaunchScreen message={t('app.restoringSession')} />;
  }

  return (
    <>
      <PaymentLifecycleCoordinator />
      <Stack.Navigator
        screenOptions={screenOptions}
      >
        {needsPhoneCompletion ? (
          renderCompleteProfileScreen()
        ) : canEnterApp ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="Booking" component={BookingNavigator} />
            <Stack.Screen name="Parcel" component={ParcelNavigator} />
            <Stack.Screen
              name="Chatbot"
              component={ChatbotScreen}
              options={{
                animation: reduceMotion ? 'none' : 'slide_from_bottom',
              }}
            />
            <Stack.Screen name="Tracking" component={TrackingScreen} />
            <Stack.Screen
              name="NotificationDetail"
              component={NotificationDetailScreen}
            />
            <Stack.Screen
              name="BookingPendingAction"
              component={BookingPendingActionScreen}
            />
            <Stack.Screen name="PolicyList" component={PolicyListScreen} />
            <Stack.Screen name="PolicyDetail" component={PolicyDetailScreen} />
          </>
        ) : (
          renderAuthScreen()
        )}
      </Stack.Navigator>
    </>
  );
}
