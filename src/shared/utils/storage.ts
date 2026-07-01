/**
 * Keychain Storage Utility — Secure token management
 *
 * Wraps react-native-keychain for storing/retrieving JWT tokens.
 * All sensitive credentials go through this module — never AsyncStorage.
 */

import * as Keychain from 'react-native-keychain';
import { TOKEN_SERVICE_KEY } from '@shared/constants';

export interface SecureTokenBundle {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
  issuedAt?: number;
}

/**
 * Store access token (and optional refresh token) securely in the device keychain.
 */
export async function setToken(
  accessToken: string,
  refreshToken?: string,
  expiresInSeconds?: number,
): Promise<boolean> {
  try {
    const issuedAt = Date.now();
    const expiresAt = expiresInSeconds && expiresInSeconds > 0
      ? issuedAt + expiresInSeconds * 1000
      : undefined;

    await Keychain.setGenericPassword(
      'accessToken',
      JSON.stringify({ accessToken, refreshToken, expiresAt, issuedAt }),
      { service: TOKEN_SERVICE_KEY },
    );
    return true;
  } catch (error) {
    if (__DEV__) {
      console.error('[Keychain] Failed to store token:', error);
    }
    return false;
  }
}

/**
 * Retrieve both tokens from the device keychain.
 */
export async function getTokenBundle(): Promise<SecureTokenBundle | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: TOKEN_SERVICE_KEY,
    });

    if (!credentials) {
      return null;
    }

    const parsed = JSON.parse(credentials.password) as {
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: number;
      issuedAt?: number;
    };

    if (!parsed.accessToken || !parsed.refreshToken) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: typeof parsed.expiresAt === 'number' ? parsed.expiresAt : undefined,
      issuedAt: typeof parsed.issuedAt === 'number' ? parsed.issuedAt : undefined,
    };
  } catch (error) {
    if (__DEV__) {
      console.error('[Keychain] Failed to retrieve token bundle:', error);
    }
    return null;
  }
}

/**
 * Retrieve the stored access token from the device keychain.
 * Returns null if no token is stored or if retrieval fails.
 */
export async function getToken(): Promise<string | null> {
  const bundle = await getTokenBundle();
  return bundle?.accessToken ?? null;
}

/**
 * Retrieve the stored refresh token from the device keychain.
 */
export async function getRefreshToken(): Promise<string | null> {
  const bundle = await getTokenBundle();
  return bundle?.refreshToken ?? null;
}

/**
 * Clear all stored tokens from the device keychain (logout).
 */
export async function clearToken(): Promise<boolean> {
  try {
    await Keychain.resetGenericPassword({ service: TOKEN_SERVICE_KEY });
    return true;
  } catch (error) {
    if (__DEV__) {
      console.error('[Keychain] Failed to clear token:', error);
    }
    return false;
  }
}

/**
 * Check if a token exists in the keychain without reading it.
 */
export async function hasToken(): Promise<boolean> {
  const token = await getToken();
  return token !== null;
}
