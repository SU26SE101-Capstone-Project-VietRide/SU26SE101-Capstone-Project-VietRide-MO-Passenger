import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';
import { getApp } from '@react-native-firebase/app';
import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';

import {
  isNativePushConfigured,
  isNotificationPressEvent,
} from './nativeNotifications';

const PENDING_NOTIFICATION_OPEN_KEY = 'vietride.notifications.pending-open.v1';

export const queuePendingNotificationOpen = (): Promise<void> => (
  AsyncStorage.setItem(PENDING_NOTIFICATION_OPEN_KEY, '1')
);

export const consumePendingNotificationOpen = async (): Promise<boolean> => {
  const pending = await AsyncStorage.getItem(PENDING_NOTIFICATION_OPEN_KEY);
  if (pending !== '1') return false;
  await AsyncStorage.removeItem(PENDING_NOTIFICATION_OPEN_KEY);
  return true;
};

export const registerNotificationBackgroundHandlers = (): void => {
  notifee.onBackgroundEvent(async (event) => {
    if (isNotificationPressEvent(event)) {
      await queuePendingNotificationOpen();
    }
  });

  if (!isNativePushConfigured()) return;

  try {
    setBackgroundMessageHandler(getMessaging(getApp()), async () => {
      // BE sends a visible notification payload. Android/iOS already renders
      // it in the background, so displaying another local notification here
      // would create duplicates.
    });
  } catch {
    if (__DEV__) {
      console.warn('[Notifications] Native Firebase background handler is unavailable.');
    }
  }
};

