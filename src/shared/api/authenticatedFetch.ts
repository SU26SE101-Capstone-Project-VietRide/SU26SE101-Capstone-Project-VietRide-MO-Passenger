import type { FetchRequestInit } from 'expo/fetch';

import { appConfig } from '@shared/constants/config';
import { joinUrl } from '@shared/utils/url';
import {
  refreshAccessTokenAfterUnauthorized,
  resolveStoredAccessToken,
} from './authSession';

const fetchWithAccessToken = async (
  path: string,
  init: FetchRequestInit,
  accessToken: string | null,
) => {
  // Keep the native module lazy so non-native environments can render the app shell.
  const { fetch: expoFetch } = await import('expo/fetch');
  const headers = new Headers(init.headers);
  headers.set('Accept', 'text/event-stream, application/json');
  headers.set('Content-Type', 'application/json');

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return expoFetch(joinUrl(appConfig.apiBaseUrl, path), {
    ...init,
    headers,
  });
};

/**
 * Authenticated streaming fetch for endpoints that Axios cannot progressively consume.
 * A 401 is retried once only after token refresh; generative/API errors are never retried.
 */
export const authenticatedFetch = async (
  path: string,
  init: FetchRequestInit = {},
) => {
  const accessToken = await resolveStoredAccessToken();
  const response = await fetchWithAccessToken(path, init, accessToken);

  if (response.status !== 401) {
    return response;
  }

  const refreshedAccessToken = await refreshAccessTokenAfterUnauthorized();
  if (refreshedAccessToken) {
    await response.body?.cancel().catch(() => undefined);
    return fetchWithAccessToken(path, init, refreshedAccessToken);
  }

  return response;
};
