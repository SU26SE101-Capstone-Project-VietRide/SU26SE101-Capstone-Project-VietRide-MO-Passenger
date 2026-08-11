/**
 * Root Navigator — Switches between Auth and Main flows
 *
 * Uses the auth store to determine which navigator to render.
 * When the user is authenticated or browsing as guest, Main (tabs) is shown;
 * otherwise Auth (login/register) is shown.
 */

import React, { useEffect, useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { BookingNavigator } from '@features/booking';
import { ParcelNavigator } from '@features/parcel';
import { ChatbotScreen } from '@features/chatbot';
import { TrackingScreen } from '@features/tracking';
import { NotificationDetailScreen } from '@features/home/screens/NotificationDetailScreen';
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
import { navigationRef } from './navigationRef';

const Stack = createNativeStackNavigator<RootStackParamList>();

const renderAuthScreen = (
  mode: 'guest' | 'signed-out',
  reduceMotion: boolean,
): React.JSX.Element => (
  <Stack.Screen
    name="Auth"
    navigationKey={mode === 'guest' ? 'guest-auth' : 'signed-out-auth'}
    component={AuthNavigator}
    options={mode === 'guest'
      ? {
          presentation: 'fullScreenModal',
          animation: reduceMotion ? 'none' : 'slide_from_bottom',
        }
      : undefined}
  />
);

const renderCompleteProfileScreen = (
  asGuestHandoff: boolean,
  reduceMotion: boolean,
): React.JSX.Element => (
  <Stack.Screen
    name="CompleteProfile"
    component={CompleteProfileScreen}
    options={asGuestHandoff
      ? {
          presentation: 'fullScreenModal',
          animation: reduceMotion ? 'none' : 'slide_from_bottom',
          gestureEnabled: false,
        }
      : undefined}
  />
);

export function RootNavigator(): React.JSX.Element {
  useAuthInitializer();
  useAuthSync();
  useTokenRefreshScheduler();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isGuest = useAuthStore((state) => state.isGuest);
  const isGuestHandoffActive = useAuthStore(
    (state) => state.isGuestHandoffActive,
  );
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
  const canEnterApp = isGuest || (isAuthenticated && Boolean(user?.phone));
  const shouldKeepGuestRouteMounted = needsPhoneCompletion && isGuestHandoffActive;

  useEffect(() => {
    if (!shouldKeepGuestRouteMounted) return undefined;

    const frame = requestAnimationFrame(() => {
      if (
        navigationRef.isReady()
        && navigationRef.getRootState().routeNames.includes('CompleteProfile')
        && navigationRef.getCurrentRoute()?.name !== 'CompleteProfile'
      ) {
        navigationRef.navigate('CompleteProfile');
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [shouldKeepGuestRouteMounted]);

  if (isAuthLoading || (isAuthenticated && !user)) {
    return <AppLaunchScreen message={t('app.restoringSession')} />;
  }

  return (
    <>
      <PaymentLifecycleCoordinator />
      <Stack.Navigator
        screenOptions={screenOptions}
      >
        {needsPhoneCompletion && !shouldKeepGuestRouteMounted ? (
          renderCompleteProfileScreen(false, reduceMotion)
        ) : canEnterApp || shouldKeepGuestRouteMounted ? (
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
            {isGuest ? renderAuthScreen('guest', reduceMotion) : null}
            {shouldKeepGuestRouteMounted
              ? renderCompleteProfileScreen(true, reduceMotion)
              : null}
          </>
        ) : (
          renderAuthScreen('signed-out', reduceMotion)
        )}
      </Stack.Navigator>
    </>
  );
}
