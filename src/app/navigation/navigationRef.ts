import { createNavigationContainerRef } from '@react-navigation/native';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let hasPendingNotificationOpen = false;

const canOpenNotificationInbox = (): boolean => {
  if (!navigationRef.isReady()) return false;
  const { isAuthenticated, isGuest, user } = useAuthStore.getState();
  if (
    !isAuthenticated
    || isGuest
    || user?.status !== 'ACTIVE'
    || !user.phone
  ) {
    return false;
  }
  return navigationRef.getRootState().routeNames.includes('Main');
};

export const flushPendingNotificationOpen = (): void => {
  if (!hasPendingNotificationOpen || !canOpenNotificationInbox()) return;

  hasPendingNotificationOpen = false;
  navigationRef.navigate('Main', { screen: 'Notification' });
};

export const openNotificationInboxFromSystemTray = (): void => {
  hasPendingNotificationOpen = true;
  flushPendingNotificationOpen();
};
