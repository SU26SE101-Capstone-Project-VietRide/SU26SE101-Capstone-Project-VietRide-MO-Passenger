/**
 * React Query Client — Global query/mutation configuration
 *
 * Configured for offline-first behavior with sensible defaults
 * for stale time, garbage collection, and retry logic.
 */

import NetInfo from '@react-native-community/netinfo';
import { onlineManager, QueryClient } from '@tanstack/react-query';

import { useAppStore } from '@shared/store';

const toOnlineStatus = (state: {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}): boolean => state.isConnected === true && state.isInternetReachable !== false;

// Start pessimistically so query consumers mounted during a cold offline start
// do not fire before NetInfo produces its first snapshot.
onlineManager.setOnline(false);
useAppStore.getState().setOnline(false);
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    const online = toOnlineStatus(state);
    setOnline(online);
    useAppStore.getState().setOnline(online);
  }),
);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /** Queries are fresh for 5 minutes before becoming stale */
      staleTime: 5 * 60 * 1000,

      /** Cached data is kept for 10 minutes after becoming unused */
      gcTime: 10 * 60 * 1000,

      /** Retry failed queries twice with exponential backoff */
      retry: 2,

      /** Do not refetch on window focus (irrelevant for mobile, saves battery) */
      refetchOnWindowFocus: false,

      /** Pause network work while offline; cached query data remains readable. */
      networkMode: 'online',
    },
    mutations: {
      /** Mutations are not replay-safe unless a caller explicitly proves idempotency. */
      retry: 0,
      networkMode: 'online',
    },
  },
});
