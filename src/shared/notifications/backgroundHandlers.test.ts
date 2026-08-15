import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearPendingNotificationOpen,
  consumePendingNotificationOpen,
  queuePendingNotificationOpen,
  registerNotificationBackgroundHandlers,
} from './backgroundHandlers';
import { NONE_NOTIFICATION_ACTION } from './notificationAction';

const mockOnBackgroundEvent = jest.fn();

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    onBackgroundEvent: (...args: unknown[]) => mockOnBackgroundEvent(...args),
  },
}));

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(),
}));

jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn(),
  setBackgroundMessageHandler: jest.fn(),
}));

jest.mock('./nativeNotifications', () => ({
  isNativePushConfigured: () => false,
  isNotificationPressEvent: () => true,
}));

const PENDING_NOTIFICATION_OPEN_KEY = 'vietride.notifications.pending-open.v1';
const TRIP_ID = 'db91b84a-8e63-4a37-86d4-c2ae92762df7';

describe('notification background open persistence', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('round-trips a validated semantic action once', async () => {
    const action = {
      type: 'OPEN_TRIP_TRACKING' as const,
      params: { tripId: TRIP_ID },
    };

    await queuePendingNotificationOpen(action);

    await expect(consumePendingNotificationOpen()).resolves.toEqual({ action });
    await expect(consumePendingNotificationOpen()).resolves.toBeNull();
  });

  it('discards a persisted action during session cleanup', async () => {
    await queuePendingNotificationOpen({
      type: 'OPEN_TRIP_TRACKING',
      params: { tripId: TRIP_ID },
    });

    await clearPendingNotificationOpen();

    await expect(consumePendingNotificationOpen()).resolves.toBeNull();
  });

  it('migrates the legacy pending-open marker to a safe inbox fallback', async () => {
    await AsyncStorage.setItem(PENDING_NOTIFICATION_OPEN_KEY, '1');

    await expect(consumePendingNotificationOpen()).resolves.toEqual({
      action: NONE_NOTIFICATION_ACTION,
    });
    await expect(AsyncStorage.getItem(PENDING_NOTIFICATION_OPEN_KEY)).resolves.toBeNull();
  });

  it('consumes corrupt persisted state as a one-time inbox fallback', async () => {
    await AsyncStorage.setItem(PENDING_NOTIFICATION_OPEN_KEY, '{malformed');

    await expect(consumePendingNotificationOpen()).resolves.toEqual({
      action: NONE_NOTIFICATION_ACTION,
    });
    await expect(consumePendingNotificationOpen()).resolves.toBeNull();
  });

  it('queues the validated action from a background local-notification tap', async () => {
    registerNotificationBackgroundHandlers();
    const handler = mockOnBackgroundEvent.mock.calls[0]?.[0] as (
      event: unknown,
    ) => Promise<void>;

    await handler({
      detail: {
        notification: {
          data: {
            actionType: 'OPEN_TRIP_TRACKING',
            actionParams: JSON.stringify({ tripId: TRIP_ID }),
            deepLink: 'vietride://untrusted',
          },
        },
      },
    });

    await expect(consumePendingNotificationOpen()).resolves.toEqual({
      action: {
        type: 'OPEN_TRIP_TRACKING',
        params: { tripId: TRIP_ID },
      },
      data: {
        actionType: 'OPEN_TRIP_TRACKING',
        actionParams: JSON.stringify({ tripId: TRIP_ID }),
        deepLink: 'vietride://untrusted',
      },
    });
  });

  it('queues NONE for an unknown background action instead of executing data', async () => {
    registerNotificationBackgroundHandlers();
    const handler = mockOnBackgroundEvent.mock.calls[0]?.[0] as (
      event: unknown,
    ) => Promise<void>;

    await handler({
      detail: {
        notification: {
          data: {
            actionType: 'OPEN_UNTRUSTED_LINK',
            actionParams: JSON.stringify({ deepLink: 'vietride://untrusted' }),
          },
        },
      },
    });

    await expect(consumePendingNotificationOpen()).resolves.toEqual({
      action: NONE_NOTIFICATION_ACTION,
      data: {
        actionType: 'OPEN_UNTRUSTED_LINK',
        actionParams: JSON.stringify({ deepLink: 'vietride://untrusted' }),
      },
    });
  });
});
