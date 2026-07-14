/**
 * Secure credential storage with an in-memory hot path.
 *
 * SecureStore is hydrated once per process. Writes/deletes are serialized and
 * guarded by a session epoch so an old refresh cannot restore credentials
 * after logout or an account switch.
 */

import * as SecureStore from 'expo-secure-store';
import { TOKEN_SERVICE_KEY } from '@shared/constants/auth';

const MAX_TOKEN_LENGTH = 16_384;
const TOKEN_STORAGE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export interface SecureTokenBundle {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
  issuedAt?: number;
  refreshAllowed?: boolean;
}

let cachedTokenBundle: SecureTokenBundle | null | undefined;
let hydrationPromise: Promise<SecureTokenBundle | null> | null = null;
let storageQueue: Promise<void> = Promise.resolve();
let tokenSessionEpoch = 0;

const isValidTokenValue = (value: unknown): value is string =>
  typeof value === 'string'
  && value.length > 0
  && value.length <= MAX_TOKEN_LENGTH
  && /\S/.test(value);

const optionalFiniteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined;

const parseTokenBundle = (raw: string): SecureTokenBundle | null => {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      !isValidTokenValue(parsed.accessToken)
      || !isValidTokenValue(parsed.refreshToken)
    ) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: optionalFiniteNumber(parsed.expiresAt),
      issuedAt: optionalFiniteNumber(parsed.issuedAt),
      refreshAllowed:
        typeof parsed.refreshAllowed === 'boolean'
          ? parsed.refreshAllowed
          : undefined,
    };
  } catch {
    return null;
  }
};

const runSerialized = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = storageQueue.then(operation, operation);
  storageQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

export const getTokenSessionEpoch = (): number => tokenSessionEpoch;

export const isTokenSessionEpochCurrent = (epoch: number): boolean =>
  epoch === tokenSessionEpoch;

/** Start a new logical login and invalidate any in-memory credential snapshot. */
export const beginTokenSession = (): number => {
  tokenSessionEpoch += 1;
  cachedTokenBundle = null;
  hydrationPromise = null;
  return tokenSessionEpoch;
};

export async function setToken(
  accessToken: string,
  refreshToken: string,
  expiresInSeconds?: number,
  refreshAllowed = true,
  expectedSessionEpoch = tokenSessionEpoch,
): Promise<boolean> {
  if (!isValidTokenValue(accessToken) || !isValidTokenValue(refreshToken)) {
    return false;
  }

  const issuedAt = Date.now();
  const expiresAt = expiresInSeconds
    && Number.isFinite(expiresInSeconds)
    && expiresInSeconds > 0
    ? issuedAt + expiresInSeconds * 1000
    : undefined;
  const bundle: SecureTokenBundle = {
    accessToken,
    refreshToken,
    expiresAt,
    issuedAt,
    refreshAllowed,
  };

  return runSerialized(async () => {
    if (!isTokenSessionEpochCurrent(expectedSessionEpoch)) {
      return false;
    }

    try {
      await SecureStore.setItemAsync(
        TOKEN_SERVICE_KEY,
        JSON.stringify(bundle),
        TOKEN_STORAGE_OPTIONS,
      );

      if (!isTokenSessionEpochCurrent(expectedSessionEpoch)) {
        return false;
      }

      cachedTokenBundle = bundle;
      return true;
    } catch {
      if (__DEV__) {
        console.error('[SecureStore] Failed to store the credential bundle.');
      }
      return false;
    }
  });
}

export async function getTokenBundle(): Promise<SecureTokenBundle | null> {
  if (cachedTokenBundle !== undefined) {
    return cachedTokenBundle;
  }

  if (hydrationPromise) {
    return hydrationPromise;
  }

  const hydrationEpoch = tokenSessionEpoch;
  const pendingHydration = runSerialized(async () => {
    try {
      const raw = await SecureStore.getItemAsync(TOKEN_SERVICE_KEY, TOKEN_STORAGE_OPTIONS);
      const bundle = raw ? parseTokenBundle(raw) : null;

      if (!isTokenSessionEpochCurrent(hydrationEpoch)) {
        return cachedTokenBundle ?? null;
      }

      cachedTokenBundle = bundle;
      return bundle;
    } catch {
      if (__DEV__) {
        console.error('[SecureStore] Failed to retrieve the credential bundle.');
      }
      if (isTokenSessionEpochCurrent(hydrationEpoch)) {
        cachedTokenBundle = null;
      }
      return null;
    }
  });

  hydrationPromise = pendingHydration;
  pendingHydration
    .finally(() => {
      if (hydrationPromise === pendingHydration) {
        hydrationPromise = null;
      }
    })
    .catch(() => undefined);

  return pendingHydration;
}

export async function setTokenRefreshAllowed(refreshAllowed: boolean): Promise<boolean> {
  const expectedSessionEpoch = tokenSessionEpoch;
  const bundle = await getTokenBundle();
  if (!bundle || !isTokenSessionEpochCurrent(expectedSessionEpoch)) {
    return false;
  }

  const nextBundle = { ...bundle, refreshAllowed };
  return runSerialized(async () => {
    if (!isTokenSessionEpochCurrent(expectedSessionEpoch)) {
      return false;
    }

    try {
      await SecureStore.setItemAsync(
        TOKEN_SERVICE_KEY,
        JSON.stringify(nextBundle),
        TOKEN_STORAGE_OPTIONS,
      );

      if (!isTokenSessionEpochCurrent(expectedSessionEpoch)) {
        return false;
      }

      cachedTokenBundle = nextBundle;
      return true;
    } catch {
      if (__DEV__) {
        console.error('[SecureStore] Failed to update credential metadata.');
      }
      return false;
    }
  });
}

export async function getToken(): Promise<string | null> {
  const bundle = await getTokenBundle();
  return bundle?.accessToken ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const bundle = await getTokenBundle();
  return bundle?.refreshToken ?? null;
}

/** Clear memory first, then serialize the durable delete behind prior writes. */
export async function clearToken(): Promise<boolean> {
  tokenSessionEpoch += 1;
  cachedTokenBundle = null;
  hydrationPromise = null;

  return runSerialized(async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_SERVICE_KEY, TOKEN_STORAGE_OPTIONS);
      return true;
    } catch {
      if (__DEV__) {
        console.error('[SecureStore] Failed to clear the credential bundle.');
      }
      return false;
    }
  });
}

export async function hasToken(): Promise<boolean> {
  return (await getTokenBundle()) !== null;
}
