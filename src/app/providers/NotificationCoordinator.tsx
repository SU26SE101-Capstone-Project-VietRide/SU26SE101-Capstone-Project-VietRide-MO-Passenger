import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import type { RemoteMessage } from '@react-native-firebase/messaging';

import {
  discardPendingNotificationOpen,
  flushPendingNotificationOpen,
  openNotificationFromSystemTray,
} from '@app/navigation/navigationRef';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { notificationKeys } from '@features/home/api/notificationApi';
import { localizeNotificationCopy } from '@features/home/utils/notificationCopy';
import { useIsAppActive, useNetworkStatus } from '@shared/hooks';
import {
  cancelDailyReminder,
  clearPendingNotificationOpen,
  consumePendingNotificationOpen,
  displayForegroundRemoteNotification,
  ensureNotificationChannels,
  getCurrentFcmToken,
  getInitialLocalNotification,
  getInitialRemoteNotification,
  getNotificationPermissionState,
  isNativePushConfigured,
  isNotificationPressEvent,
  requestNotificationPermission,
  revokeDeviceRegistration,
  scheduleDailyReminder,
  subscribeToFcmTokenRefresh,
  subscribeToForegroundRemoteMessages,
  subscribeToLocalNotificationEvents,
  subscribeToOpenedRemoteMessages,
  synchronizeDeviceRegistration,
} from '@shared/notifications';
import { parseFcmNotificationAction } from '@shared/notifications/notificationAction';
import { useAppStore } from '@shared/store';

const logNotificationWarning = (message: string): void => {
  if (__DEV__) console.warn(`[Notifications] ${message}`);
};

const REGISTRATION_RETRY_DELAYS_MS = [1_000, 3_000, 10_000] as const;

export function NotificationCoordinator(): null {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isAppActive = useIsAppActive();
  const isOnline = useNetworkStatus();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const hasHydrated = useAppStore((state) => state.hasHydrated);
  const pushNotificationsEnabled = useAppStore(
    (state) => state.pushNotificationsEnabled,
  );
  const dailyReminderEnabled = useAppStore(
    (state) => state.dailyReminderEnabled,
  );
  const setPushNotificationsEnabled = useAppStore(
    (state) => state.setPushNotificationsEnabled,
  );
  const setDailyReminderEnabled = useAppStore(
    (state) => state.setDailyReminderEnabled,
  );
  const setPushNotificationStatus = useAppStore(
    (state) => state.setPushNotificationStatus,
  );
  const channelLabels = useMemo(() => ({
    updates: t('settings.notifications.updatesChannel'),
    reminders: t('settings.notifications.remindersChannel'),
  }), [t]);
  const initialOpenHandledRef = useRef(false);
  const initialLocalOpenHandledRef = useRef(false);

  const isEligible = Boolean(
    hasHydrated
    && !isAuthLoading
    && isAuthenticated
    && user?.status === 'ACTIVE'
    && user.phone,
  );
  const userId = user?.id;

  useEffect(() => {
    ensureNotificationChannels(channelLabels)
      .catch(() => logNotificationWarning('Could not create Android channels.'));
  }, [channelLabels]);

  useEffect(() => {
    const unsubscribe = subscribeToLocalNotificationEvents((event) => {
      if (isEligible && isNotificationPressEvent(event)) {
        openNotificationFromSystemTray(
          parseFcmNotificationAction(event.detail.notification?.data),
          event.detail.notification?.data,
        );
      }
    });

    return unsubscribe;
  }, [isEligible]);

  useEffect(() => {
    if (!hasHydrated || isAuthLoading || !isEligible || !isAppActive) return;

    let cancelled = false;
    const shouldReadInitialLocalOpen = !initialLocalOpenHandledRef.current;
    initialLocalOpenHandledRef.current = true;

    const restoreLocalNotificationOpen = async (): Promise<void> => {
      let pending = null;
      try {
        pending = await consumePendingNotificationOpen();
      } catch {
        logNotificationWarning('Could not restore a notification tap.');
      }
      if (cancelled) return;
      if (pending) {
        openNotificationFromSystemTray(pending.action, pending.data);
        return;
      }

      if (!shouldReadInitialLocalOpen) return;
      try {
        const initial = await getInitialLocalNotification();
        if (!cancelled && initial) {
          openNotificationFromSystemTray(
            parseFcmNotificationAction(initial.notification.data),
            initial.notification.data,
          );
        }
      } catch {
        // The Firebase initial-open path below remains available.
      }
    };

    restoreLocalNotificationOpen().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [hasHydrated, isAppActive, isAuthLoading, isEligible]);

  useEffect(() => {
    if (isEligible) {
      flushPendingNotificationOpen();
      return;
    }

    if (!hasHydrated || isAuthLoading) return;

    // Consume process-launch opens while logged out so an action addressed to
    // a previous session can never execute after a different user signs in.
    if (!initialLocalOpenHandledRef.current) {
      initialLocalOpenHandledRef.current = true;
      getInitialLocalNotification().catch(() => undefined);
    }
    if (!initialOpenHandledRef.current) {
      initialOpenHandledRef.current = true;
      if (isNativePushConfigured()) {
        getInitialRemoteNotification().catch(() => undefined);
      }
    }

    // A notification intent must never survive logout and reach a later user.
    discardPendingNotificationOpen();
    clearPendingNotificationOpen()
      .catch(() => logNotificationWarning('Could not clear a notification tap.'));
    if (!isAppActive) return;

    // Also runs after later foreground transitions so a cleanup tombstone is
    // retried if Firebase token deletion failed during logout.
    revokeDeviceRegistration().catch(() => (
      logNotificationWarning('Local push token cleanup did not fully complete.')
    ));
  }, [hasHydrated, isAppActive, isAuthLoading, isEligible]);

  useEffect(() => {
    if (!hasHydrated || !isEligible) {
      cancelDailyReminder().catch(() => undefined);
      return;
    }

    if (!isAppActive) return;

    if (!dailyReminderEnabled) {
      cancelDailyReminder().catch(() => undefined);
      return;
    }

    let cancelled = false;
    const synchronizeReminder = async (): Promise<void> => {
      let permission = await getNotificationPermissionState();
      if (permission === 'not_determined') {
        permission = await requestNotificationPermission();
      }
      if (cancelled) return;

      if (permission !== 'authorized') {
        setDailyReminderEnabled(false);
        return;
      }

      await ensureNotificationChannels(channelLabels);
      await scheduleDailyReminder({
        title: t('settings.notifications.dailyTitle'),
        body: t('settings.notifications.dailyBody'),
      });
    };

    synchronizeReminder().catch(() => {
      if (!cancelled) {
        setDailyReminderEnabled(false);
        logNotificationWarning('Could not schedule the daily reminder.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    dailyReminderEnabled,
    channelLabels,
    hasHydrated,
    i18n.resolvedLanguage,
    isAppActive,
    isEligible,
    setDailyReminderEnabled,
    t,
  ]);

  useEffect(() => {
    if (!hasHydrated || !isEligible || !userId) return;

    if (!pushNotificationsEnabled) {
      revokeDeviceRegistration()
        .then(() => {
          // Preserve the denied state so Settings can send the user to the OS
          // permission page instead of repeatedly attempting registration.
          if (useAppStore.getState().pushNotificationStatus !== 'permission_denied') {
            setPushNotificationStatus('idle');
          }
        })
        .catch(() => setPushNotificationStatus('error'));
      return;
    }

    if (!isNativePushConfigured()) {
      setPushNotificationStatus('configuration_required');
      return;
    }

    if (!isAppActive || !isOnline) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const synchronizePush = async (): Promise<void> => {
      setPushNotificationStatus('syncing');
      let permission = await getNotificationPermissionState();
      if (permission === 'not_determined') {
        permission = await requestNotificationPermission();
      }
      if (cancelled) return;

      if (permission !== 'authorized') {
        setPushNotificationsEnabled(false);
        setPushNotificationStatus('permission_denied');
        return;
      }

      const fcmToken = await getCurrentFcmToken();
      if (cancelled) return;
      await synchronizeDeviceRegistration(userId, fcmToken);
      if (!cancelled) setPushNotificationStatus('active');
    };

    const runSynchronization = (attempt: number): void => {
      synchronizePush().catch(() => {
        if (cancelled) return;
        const retryDelay = REGISTRATION_RETRY_DELAYS_MS[attempt];
        if (retryDelay != null) {
          retryTimer = setTimeout(() => runSynchronization(attempt + 1), retryDelay);
          return;
        }
        setPushNotificationStatus('error');
        logNotificationWarning('Device token registration failed.');
      });
    };

    runSynchronization(0);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [
    hasHydrated,
    isAppActive,
    isEligible,
    isOnline,
    pushNotificationsEnabled,
    setPushNotificationStatus,
    setPushNotificationsEnabled,
    userId,
  ]);

  useEffect(() => {
    if (
      !isEligible
      || !userId
      || !pushNotificationsEnabled
      || !isNativePushConfigured()
    ) return;

    const refreshNotificationInbox = (): void => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.user(userId) });
    };
    const handleOpen = (message: RemoteMessage): void => {
      refreshNotificationInbox();
      openNotificationFromSystemTray(
        parseFcmNotificationAction(message.data),
        message.data,
      );
    };
    const unsubscribeForeground = subscribeToForegroundRemoteMessages((message) => {
      refreshNotificationInbox();
      const notificationType = typeof message.data?.notificationType === 'string'
        ? message.data.notificationType
        : '';
      const copy = localizeNotificationCopy({
        type: notificationType,
        title: message.notification?.title ?? '',
        body: message.notification?.body ?? '',
        data: message.data,
      }, t);
      ensureNotificationChannels(channelLabels)
        .then(() => displayForegroundRemoteNotification({
          ...message,
          notification: {
            ...message.notification,
            title: copy.title || message.notification?.title,
            body: copy.body || message.notification?.body,
          },
        }, {
          title: t('settings.notifications.fallbackTitle'),
          body: t('settings.notifications.fallbackBody'),
        }))
        .catch(() => logNotificationWarning('Could not display a foreground push.'));
    });
    const unsubscribeOpened = subscribeToOpenedRemoteMessages(handleOpen);
    let cancelled = false;
    let latestRefreshedToken: string | null = null;
    const tokenRetryTimers = new Set<ReturnType<typeof setTimeout>>();
    const synchronizeRefreshedToken = (fcmToken: string, attempt: number): void => {
      if (fcmToken !== latestRefreshedToken) return;
      synchronizeDeviceRegistration(userId, fcmToken)
        .then(() => {
          if (!cancelled) setPushNotificationStatus('active');
        })
        .catch(() => {
          if (cancelled) return;
          const retryDelay = REGISTRATION_RETRY_DELAYS_MS[attempt];
          if (retryDelay == null) {
            setPushNotificationStatus('error');
            return;
          }
          const timer = setTimeout(() => {
            tokenRetryTimers.delete(timer);
            synchronizeRefreshedToken(fcmToken, attempt + 1);
          }, retryDelay);
          tokenRetryTimers.add(timer);
        });
    };
    const unsubscribeTokenRefresh = subscribeToFcmTokenRefresh((fcmToken) => {
      if (!isOnline || !pushNotificationsEnabled) return;
      latestRefreshedToken = fcmToken;
      synchronizeRefreshedToken(fcmToken, 0);
    });

    if (!initialOpenHandledRef.current) {
      initialOpenHandledRef.current = true;
      getInitialRemoteNotification()
        .then((message) => {
          if (message) handleOpen(message);
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
      latestRefreshedToken = null;
      tokenRetryTimers.forEach(clearTimeout);
      tokenRetryTimers.clear();
      unsubscribeForeground();
      unsubscribeOpened();
      unsubscribeTokenRefresh();
    };
  }, [
    channelLabels,
    isEligible,
    isOnline,
    pushNotificationsEnabled,
    queryClient,
    setPushNotificationStatus,
    t,
    userId,
  ]);

  return null;
}
