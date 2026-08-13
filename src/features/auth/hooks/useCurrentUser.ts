import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import * as authApi from '../api/authApi';
import type { User } from '../types';
import { useAuthStore } from '../store/useAuthStore';

const CURRENT_USER_STALE_TIME_MS = 5 * 60 * 1000;
const CURRENT_USER_GC_TIME_MS = 10 * 60 * 1000;

export function useCurrentUser(enabled = true): UseQueryResult<User, Error> {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);

  return useQuery({
    queryKey: authApi.authKeys.me,
    queryFn: ({ signal }) => authApi.getCurrentUser(signal),
    enabled: enabled && isAuthenticated && !isAuthLoading,
    staleTime: CURRENT_USER_STALE_TIME_MS,
    gcTime: CURRENT_USER_GC_TIME_MS,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
