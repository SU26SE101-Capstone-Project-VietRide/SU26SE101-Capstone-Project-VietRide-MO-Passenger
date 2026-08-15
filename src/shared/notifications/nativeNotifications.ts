import { Platform } from 'react-native';
import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  EventType,
  RepeatFrequency,
  TriggerType,
  type Event,
  type TimestampTrigger,
} from '@notifee/react-native';
import { getApp } from '@react-native-firebase/app';
import {
  deleteToken,
  getInitialNotification,
  getMessaging,
  getToken,
  isDeviceRegisteredForRemoteMessages,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  setAutoInitEnabled,
  type RemoteMessage,
} from '@react-native-firebase/messaging';

import { NOTIFICATION_LARGE_ICON } from '@shared/constants/assets';
import { appConfig } from '@shared/constants/config';

const ANDROID_NOTIFICATION_ICON = {
  smallIcon: 'ic_stat_notification',
  largeIcon: NOTIFICATION_LARGE_ICON,
  color: '#007D78',
} as const;

export const UPDATES_CHANNEL_ID = 'vietride-updates';
export const REMINDERS_CHANNEL_ID = 'vietride-reminders';
export const DAILY_REMINDER_NOTIFICATION_ID = 'vietride-daily-reminder';
export const DAILY_REMINDER_HOUR = 19;
export const DAILY_REMINDER_MINUTE = 0;

export type NotificationPermissionState =
  | 'not_determined'
  | 'authorized'
  | 'denied';

interface NotificationChannelLabels {
  updates: string;
  reminders: string;
}

interface DailyReminderContent {
  title: string;
  body: string;
}

interface RemoteNotificationFallback {
  title: string;
  body: string;
}

interface NotificationChannelSetup {
  key: string;
  promise: Promise<void>;
}

let notificationChannelSetup: NotificationChannelSetup | null = null;

const toPermissionState = (
  authorizationStatus: AuthorizationStatus,
): NotificationPermissionState => {
  if (
    authorizationStatus === AuthorizationStatus.AUTHORIZED
    || authorizationStatus === AuthorizationStatus.PROVISIONAL
  ) {
    return 'authorized';
  }

  return authorizationStatus === AuthorizationStatus.NOT_DETERMINED
    ? 'not_determined'
    : 'denied';
};

const toNotifeeData = (
  data: RemoteMessage['data'],
): Record<string, string | object | number> | undefined => {
  if (!data) return undefined;

  const safeEntries = Object.entries(data).filter(([, value]) => (
    typeof value === 'string'
    || (typeof value === 'object' && value !== null)
  ));

  return safeEntries.length > 0
    ? Object.fromEntries(safeEntries)
    : undefined;
};

const nextDailyReminderTimestamp = (
  hour = DAILY_REMINDER_HOUR,
  minute = DAILY_REMINDER_MINUTE,
): number => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
};

export const isNativePushConfigured = (): boolean => {
  if (Platform.OS === 'android') {
    return appConfig.nativePushNotificationsEnabled.android;
  }
  if (Platform.OS === 'ios') {
    return appConfig.nativePushNotificationsEnabled.ios;
  }
  return false;
};

export const ensureNotificationChannels = async (
  labels: NotificationChannelLabels,
): Promise<void> => {
  if (Platform.OS !== 'android') return;

  const key = `${labels.updates}\u0000${labels.reminders}`;
  if (notificationChannelSetup?.key !== key) {
    const setup: NotificationChannelSetup = {
      key,
      promise: Promise.all([
        notifee.createChannel({
          id: UPDATES_CHANNEL_ID,
          name: labels.updates,
          importance: AndroidImportance.HIGH,
        }),
        notifee.createChannel({
          id: REMINDERS_CHANNEL_ID,
          name: labels.reminders,
          importance: AndroidImportance.DEFAULT,
        }),
      ]).then(() => undefined),
    };
    notificationChannelSetup = setup;
    setup.promise.catch(() => {
      if (notificationChannelSetup === setup) notificationChannelSetup = null;
    });
  }

  await notificationChannelSetup.promise;
};

export const getNotificationPermissionState = async (): Promise<NotificationPermissionState> => {
  const settings = await notifee.getNotificationSettings();
  return toPermissionState(settings.authorizationStatus);
};

export const requestNotificationPermission = async (): Promise<NotificationPermissionState> => {
  const settings = await notifee.requestPermission();
  return toPermissionState(settings.authorizationStatus);
};

export const openSystemNotificationSettings = (): Promise<void> => (
  notifee.openNotificationSettings()
);

export const scheduleDailyReminder = async ({
  title,
  body,
}: DailyReminderContent): Promise<void> => {
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: nextDailyReminderTimestamp(),
    repeatFrequency: RepeatFrequency.DAILY,
    // WorkManager is intentionally used: a daily reminder does not justify
    // Android's restricted exact-alarm permission.
    alarmManager: false,
  };

  await notifee.cancelTriggerNotification(DAILY_REMINDER_NOTIFICATION_ID);
  await notifee.createTriggerNotification(
    {
      id: DAILY_REMINDER_NOTIFICATION_ID,
      title,
      body,
      data: { notificationKind: 'daily-reminder' },
      android: {
        channelId: REMINDERS_CHANNEL_ID,
        ...ANDROID_NOTIFICATION_ICON,
        pressAction: { id: 'open-notifications' },
      },
      ios: { sound: 'default' },
    },
    trigger,
  );
};

export const cancelDailyReminder = (): Promise<void> => (
  notifee.cancelTriggerNotification(DAILY_REMINDER_NOTIFICATION_ID)
);

export const displayForegroundRemoteNotification = async (
  message: RemoteMessage,
  fallback: RemoteNotificationFallback,
): Promise<void> => {
  const title = message.notification?.title?.trim() || fallback.title;
  const body = message.notification?.body?.trim() || fallback.body;
  const id = typeof message.data?.notificationId === 'string'
    ? message.data.notificationId
    : message.messageId;

  await notifee.displayNotification({
    ...(id ? { id } : {}),
    title,
    body,
    data: toNotifeeData(message.data),
    android: {
      channelId: UPDATES_CHANNEL_ID,
      ...ANDROID_NOTIFICATION_ICON,
      pressAction: { id: 'open-notifications' },
    },
    ios: {
      sound: 'default',
      foregroundPresentationOptions: {
        alert: true,
        badge: true,
        sound: true,
      },
    },
  });
};

const getFirebaseMessaging = () => getMessaging(getApp());

export const getCurrentFcmToken = async (): Promise<string> => {
  if (!isNativePushConfigured()) {
    throw new Error('Native Firebase Messaging is not configured for this platform.');
  }

  const messaging = getFirebaseMessaging();
  await setAutoInitEnabled(messaging, true);
  if (
    Platform.OS === 'ios'
    && !isDeviceRegisteredForRemoteMessages(messaging)
  ) {
    await registerDeviceForRemoteMessages(messaging);
  }
  return getToken(messaging);
};

export const deleteCurrentFcmToken = async (): Promise<boolean> => {
  if (!isNativePushConfigured()) return false;

  const messaging = getFirebaseMessaging();
  await setAutoInitEnabled(messaging, false);
  await deleteToken(messaging);
  return true;
};

export const subscribeToForegroundRemoteMessages = (
  listener: (message: RemoteMessage) => void,
): (() => void) => onMessage(getFirebaseMessaging(), listener);

export const subscribeToOpenedRemoteMessages = (
  listener: (message: RemoteMessage) => void,
): (() => void) => onNotificationOpenedApp(getFirebaseMessaging(), listener);

export const subscribeToFcmTokenRefresh = (
  listener: (token: string) => void,
): (() => void) => onTokenRefresh(getFirebaseMessaging(), listener);

export const getInitialRemoteNotification = (): Promise<RemoteMessage | null> => (
  getInitialNotification(getFirebaseMessaging())
);

export const getInitialLocalNotification = () => notifee.getInitialNotification();

export const subscribeToLocalNotificationEvents = (
  listener: (event: Event) => void,
): (() => void) => notifee.onForegroundEvent(listener);

export const isNotificationPressEvent = (event: Event): boolean => (
  event.type === EventType.PRESS || event.type === EventType.ACTION_PRESS
);
