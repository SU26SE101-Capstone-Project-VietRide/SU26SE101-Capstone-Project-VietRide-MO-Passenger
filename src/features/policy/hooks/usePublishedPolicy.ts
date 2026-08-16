import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import { toApiError } from '@shared/api/errors';
import { isUuid } from '@shared/utils/pathSegment';
import { getPublishedPolicy, publishedPolicyKeys } from '../api/policyApi';

const POLICY_DETAIL_STALE_TIME_MS = 60 * 1000;
const POLICY_DETAIL_GC_TIME_MS = 5 * 60 * 1000;

const shouldRetryPublishedPolicy = (
  failureCount: number,
  error: unknown,
): boolean => {
  if (failureCount >= 1) return false;
  const apiError = toApiError(error);
  if (apiError.code === 'POLICY_NOT_FOUND' || apiError.statusCode === 404) {
    return false;
  }
  const status = apiError.statusCode;
  return apiError.isNetworkError
    || status === undefined
    || status === 408
    || status === 429
    || Boolean(status && status >= 500);
};

export function usePublishedPolicy(policyId: string | undefined, enabled = true) {
  const userId = useAuthStore((state) => state.user?.id);
  const safePolicyId = policyId && isUuid(policyId) ? policyId : undefined;

  return useQuery({
    queryKey: publishedPolicyKeys.detail(userId ?? 'guest', safePolicyId ?? 'invalid'),
    queryFn: ({ signal }) => getPublishedPolicy(safePolicyId as string, signal),
    enabled: enabled && Boolean(userId) && Boolean(safePolicyId),
    staleTime: POLICY_DETAIL_STALE_TIME_MS,
    gcTime: POLICY_DETAIL_GC_TIME_MS,
    retry: shouldRetryPublishedPolicy,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
