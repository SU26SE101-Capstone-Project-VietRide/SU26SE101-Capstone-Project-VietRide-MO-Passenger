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
import {
  NONE_NOTIFICATION_ACTION,
  notificationActionSchema,
  parseFcmNotificationAction,
  type NotificationAction,
} from './notificationAction';
import { z } from 'zod';

const PENDING_NOTIFICATION_OPEN_KEY = 'vietride.notifications.pending-open.v1';

export type PendingNotificationOpen = {
  action: NotificationAction;
  data?: unknown;
};

const storedPendingNotificationOpenSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  action: notificationActionSchema,
  data: z.unknown().optional(),
}).strict();

export const queuePendingNotificationOpen = (
  action: NotificationAction = NONE_NOTIFICATION_ACTION,
  data?: unknown,
): Promise<void> => (
  AsyncStorage.setItem(PENDING_NOTIFICATION_OPEN_KEY, JSON.stringify({
    version: 2,
    action,
    ...(data === undefined ? {} : { data }),
  }))
);

export const clearPendingNotificationOpen = (): Promise<void> => (
  AsyncStorage.removeItem(PENDING_NOTIFICATION_OPEN_KEY)
);

export const consumePendingNotificationOpen = async (): Promise<PendingNotificationOpen | null> => {
  const pending = await AsyncStorage.getItem(PENDING_NOTIFICATION_OPEN_KEY);
  if (pending == null) return null;
  await AsyncStorage.removeItem(PENDING_NOTIFICATION_OPEN_KEY);

  // Migrate the legacy boolean marker. It still represents a real tap, but
  // has no validated semantic destination, so it safely opens the inbox.
  if (pending === '1') return { action: NONE_NOTIFICATION_ACTION };

  try {
    const parsed = storedPendingNotificationOpenSchema.safeParse(
      JSON.parse(pending) as unknown,
    );
    if (!parsed.success) return { action: NONE_NOTIFICATION_ACTION };
    return {
      action: parsed.data.action,
      ...(parsed.data.data === undefined ? {} : { data: parsed.data.data }),
    };
  } catch {
    return { action: NONE_NOTIFICATION_ACTION };
  }
};

export const registerNotificationBackgroundHandlers = (): void => {
  notifee.onBackgroundEvent(async (event) => {
    if (isNotificationPressEvent(event)) {
      await queuePendingNotificationOpen(
        parseFcmNotificationAction(event.detail.notification?.data),
        event.detail.notification?.data,
      );
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

