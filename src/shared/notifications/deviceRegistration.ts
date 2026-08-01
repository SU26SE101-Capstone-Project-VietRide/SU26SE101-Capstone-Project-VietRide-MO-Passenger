import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { z } from 'zod';

import { apiClient } from '@shared/api/axiosInstance';
import { resolveStoredAccessToken } from '@shared/api/authSession';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import { IdempotencyKeyTracker } from '@shared/api/idempotency';
import { isUuid } from '@shared/utils/pathSegment';
import { deleteCurrentFcmToken } from './nativeNotifications';

type DevicePlatform = 'ANDROID' | 'IOS';

interface StoredDeviceRegistration {
  userId: string;
  fcmToken: string;
  platform: DevicePlatform;
}

const DEVICE_REGISTRATION_STORAGE_KEY = 'vietride.push.device-registration.v1';
const MAX_FCM_TOKEN_LENGTH = 500;
const STORAGE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const deviceRegistrationResponseSchema = z.object({
  userDeviceId: z.string().uuid(),
  fcmToken: z.string().trim().min(1).max(MAX_FCM_TOKEN_LENGTH),
  platform: z.enum(['ANDROID', 'IOS', 'WEB']),
  isActive: z.boolean(),
});

let registrationQueue: Promise<void> = Promise.resolve();
const registerIdempotency = new IdempotencyKeyTracker('push-device-register');
const unregisterIdempotency = new IdempotencyKeyTracker('push-device-unregister');

const runSerialized = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = registrationQueue.then(operation, operation);
  registrationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

const currentPlatform = (): DevicePlatform => (
  Platform.OS === 'ios' ? 'IOS' : 'ANDROID'
);

const parseStoredRegistration = (value: string | null): StoredDeviceRegistration | null => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<StoredDeviceRegistration>;
    if (
      !isUuid(parsed.userId)
      || typeof parsed.fcmToken !== 'string'
      || parsed.fcmToken.length === 0
      || parsed.fcmToken.length > MAX_FCM_TOKEN_LENGTH
      || (parsed.platform !== 'ANDROID' && parsed.platform !== 'IOS')
    ) {
      return null;
    }
    return {
      userId: parsed.userId,
      fcmToken: parsed.fcmToken,
      platform: parsed.platform,
    };
  } catch {
    return null;
  }
};

const readStoredRegistration = async (): Promise<StoredDeviceRegistration | null> => {
  const value = await SecureStore.getItemAsync(
    DEVICE_REGISTRATION_STORAGE_KEY,
    STORAGE_OPTIONS,
  );
  return parseStoredRegistration(value);
};

const persistRegistration = (
  registration: StoredDeviceRegistration,
): Promise<void> => SecureStore.setItemAsync(
  DEVICE_REGISTRATION_STORAGE_KEY,
  JSON.stringify(registration),
  STORAGE_OPTIONS,
);

const clearStoredRegistration = (): Promise<void> => SecureStore.deleteItemAsync(
  DEVICE_REGISTRATION_STORAGE_KEY,
  STORAGE_OPTIONS,
);

const registerDeviceToken = async (
  userId: string,
  fcmToken: string,
  platform: DevicePlatform,
): Promise<void> => {
  const accessToken = await resolveStoredAccessToken();
  if (!accessToken) {
    throw new Error('An authenticated session is required for device registration.');
  }

  const idempotencyKey = registerIdempotency.getOrCreate({
    userId,
    fcmToken,
    platform,
  });
  const response = await apiClient.post<ApiEnvelope<unknown>>(
    '/auth/device-token',
    { fcmToken, platform },
    {
      skipAuth: true,
      skipAuthRefresh: true,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Idempotency-Key': idempotencyKey,
      },
    },
  );
  const payload = deviceRegistrationResponseSchema.parse(
    unwrapApiResponse(response.data),
  );
  if (!payload.isActive || payload.fcmToken !== fcmToken) {
    throw new Error('Device token registration was not activated by the server.');
  }
  registerIdempotency.reset();
};

const unregisterDeviceToken = async (
  userId: string,
  fcmToken: string,
  accessToken?: string,
): Promise<void> => {
  const resolvedAccessToken = accessToken ?? await resolveStoredAccessToken();
  if (!resolvedAccessToken) return;

  const idempotencyKey = unregisterIdempotency.getOrCreate({ userId, fcmToken });
  await apiClient.delete('/auth/device-token', {
    data: { fcmToken },
    skipAuth: true,
    skipAuthRefresh: true,
    headers: {
      Authorization: `Bearer ${resolvedAccessToken}`,
      'Idempotency-Key': idempotencyKey,
    },
  });
  unregisterIdempotency.reset();
};

export const synchronizeDeviceRegistration = (
  userId: string,
  fcmToken: string,
): Promise<void> => runSerialized(async () => {
  if (!isUuid(userId)) throw new Error('Invalid userId for device registration.');
  const normalizedToken = fcmToken.trim();
  if (
    normalizedToken.length === 0
    || normalizedToken.length > MAX_FCM_TOKEN_LENGTH
  ) {
    throw new Error('Invalid FCM device token.');
  }

  const platform = currentPlatform();
  const previous = await readStoredRegistration();
  if (
    previous?.userId === userId
    && previous.fcmToken === normalizedToken
    && previous.platform === platform
  ) {
    return;
  }

  await registerDeviceToken(userId, normalizedToken, platform);
  await persistRegistration({ userId, fcmToken: normalizedToken, platform });

  if (
    previous?.userId === userId
    && previous.fcmToken !== normalizedToken
  ) {
    try {
      await unregisterDeviceToken(userId, previous.fcmToken);
    } catch {
      // The stale FCM token will also be deactivated by the BE after Firebase
      // reports it as invalid. Never roll back the newly active token.
    }
  }
});

export const revokeDeviceRegistration = (
  accessToken?: string,
): Promise<void> => runSerialized(async () => {
  const registration = await readStoredRegistration();
  let serverError: unknown;

  if (registration) {
    try {
      await unregisterDeviceToken(
        registration.userId,
        registration.fcmToken,
        accessToken,
      );
    } catch (error) {
      serverError = error;
    }
  }

  let localTokenDeleted = false;
  try {
    localTokenDeleted = await deleteCurrentFcmToken();
  } finally {
    // Keep the registration as a cleanup tombstone when Firebase deletion
    // fails. The coordinator can retry on the next foreground transition.
    if (localTokenDeleted) {
      await clearStoredRegistration();
    }
  }

  if (serverError) throw serverError;
});
