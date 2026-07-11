/**
 * Secure Storage Utility — Token management via expo-secure-store
 *
 * Wraps expo-secure-store for storing/retrieving JWT tokens.
 * All sensitive credentials go through this module — never AsyncStorage.
 *
 * expo-secure-store uses:
 *   - Android: EncryptedSharedPreferences (API 23+) / Android Keystore
 *   - iOS: Keychain Services
 */

import * as SecureStore from 'expo-secure-store';
import { TOKEN_SERVICE_KEY } from '@shared/constants';

export interface SecureTokenBundle {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
  issuedAt?: number;
  refreshAllowed?: boolean;
}

/**
 * Store access token (and optional refresh token) securely.
 */
export async function setToken(
  accessToken: string,
  refreshToken?: string,
  expiresInSeconds?: number,
  refreshAllowed = true,
): Promise<boolean> {
  try {
    const issuedAt = Date.now();
    const expiresAt = expiresInSeconds && expiresInSeconds > 0
      ? issuedAt + expiresInSeconds * 1000
      : undefined;

    const bundle = JSON.stringify({ accessToken, refreshToken, expiresAt, issuedAt, refreshAllowed });
    await SecureStore.setItemAsync(TOKEN_SERVICE_KEY, bundle);
    return true;
  } catch (error) {
    if (__DEV__) {
      console.error('[SecureStore] Failed to store token:', error);
    }
    return false;
  }
}

/**
 * Retrieve both tokens from secure storage.
 */
export async function getTokenBundle(): Promise<SecureTokenBundle | null> {
  try {
    const raw = await SecureStore.getItemAsync(TOKEN_SERVICE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as {
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: number;
      issuedAt?: number;
      refreshAllowed?: boolean;
    };

    if (!parsed.accessToken || !parsed.refreshToken) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: typeof parsed.expiresAt === 'number' ? parsed.expiresAt : undefined,
      issuedAt: typeof parsed.issuedAt === 'number' ? parsed.issuedAt : undefined,
      refreshAllowed: typeof parsed.refreshAllowed === 'boolean' ? parsed.refreshAllowed : undefined,
    };
  } catch (error) {
    if (__DEV__) {
      console.error('[SecureStore] Failed to retrieve token bundle:', error);
    }
    return null;
  }
}

export async function setTokenRefreshAllowed(refreshAllowed: boolean): Promise<boolean> {
  try {
    const bundle = await getTokenBundle();

    if (!bundle) {
      return false;
    }

    await SecureStore.setItemAsync(
      TOKEN_SERVICE_KEY,
      JSON.stringify({ ...bundle, refreshAllowed }),
    );
    return true;
  } catch (error) {
    if (__DEV__) {
      console.error('[SecureStore] Failed to update token refresh metadata:', error);
    }
    return false;
  }
}

/**
 * Retrieve the stored access token.
 * Returns null if no token is stored or if retrieval fails.
 */
export async function getToken(): Promise<string | null> {
  const bundle = await getTokenBundle();
  return bundle?.accessToken ?? null;
}

/**
 * Retrieve the stored refresh token.
 */
export async function getRefreshToken(): Promise<string | null> {
  const bundle = await getTokenBundle();
  return bundle?.refreshToken ?? null;
}

/**
 * Clear all stored tokens (logout).
 */
export async function clearToken(): Promise<boolean> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_SERVICE_KEY);
    return true;
  } catch (error) {
    if (__DEV__) {
      console.error('[SecureStore] Failed to clear token:', error);
    }
    return false;
  }
}

/**
 * Check if a token exists without reading its full value.
 */
export async function hasToken(): Promise<boolean> {
  const token = await getToken();
  return token !== null;
}
