/**
 * React Query Client — Global query/mutation configuration
 *
 * Configured for offline-first behavior with sensible defaults
 * for stale time, garbage collection, and retry logic.
 */

import { QueryClient } from '@tanstack/react-query';

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

      /** Use cached data when offline, then revalidate when back online */
      networkMode: 'offlineFirst',
    },
    mutations: {
      /** Retry failed mutations once */
      retry: 1,
    },
  },
});
