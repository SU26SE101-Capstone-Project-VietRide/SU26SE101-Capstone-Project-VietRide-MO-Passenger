/**
 * Keychain Storage Utility — Secure token management
 *
 * Wraps react-native-keychain for storing/retrieving JWT tokens.
 * All sensitive credentials go through this module — never AsyncStorage.
 */

import * as Keychain from 'react-native-keychain';
import { TOKEN_SERVICE_KEY } from '@shared/constants';

/**
 * Store access token (and optional refresh token) securely in the device keychain.
 */
export async function setToken(
  accessToken: string,
  refreshToken?: string,
): Promise<boolean> {
  try {
    await Keychain.setGenericPassword(
      'accessToken',
      JSON.stringify({ accessToken, refreshToken }),
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
 * Retrieve the stored access token from the device keychain.
 * Returns null if no token is stored or if retrieval fails.
 */
export async function getToken(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: TOKEN_SERVICE_KEY,
    });

    if (credentials) {
      const parsed = JSON.parse(credentials.password) as {
        accessToken: string;
        refreshToken?: string;
      };
      return parsed.accessToken;
    }

    return null;
  } catch (error) {
    if (__DEV__) {
      console.error('[Keychain] Failed to retrieve token:', error);
    }
    return null;
  }
}

/**
 * Retrieve the stored refresh token from the device keychain.
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: TOKEN_SERVICE_KEY,
    });

    if (credentials) {
      const parsed = JSON.parse(credentials.password) as {
        accessToken: string;
        refreshToken?: string;
      };
      return parsed.refreshToken ?? null;
    }

    return null;
  } catch (error) {
    if (__DEV__) {
      console.error('[Keychain] Failed to retrieve refresh token:', error);
    }
    return null;
  }
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
