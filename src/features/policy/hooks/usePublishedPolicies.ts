import { useInfiniteQuery } from '@tanstack/react-query';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import { toApiError } from '@shared/api/errors';
import { isUuid } from '@shared/utils/pathSegment';
import {
  listPublishedPolicies,
  publishedPolicyKeys,
  PUBLISHED_POLICY_DEFAULT_PAGE_SIZE,
} from '../api/policyApi';
import type { ListPublishedPoliciesParams, PublishedPolicyPage } from '../types/policy';

const POLICY_LIST_STALE_TIME_MS = 60 * 1000;
const POLICY_LIST_GC_TIME_MS = 5 * 60 * 1000;

export interface UsePublishedPoliciesInput {
  operatorId?: string;
  enabled?: boolean;
}

const shouldRetryPublishedPolicies = (
  failureCount: number,
  error: unknown,
): boolean => {
  if (failureCount >= 1) return false;
  const apiError = toApiError(error);
  const status = apiError.statusCode;
  return apiError.isNetworkError
    || status === undefined
    || status === 408
    || status === 429
    || Boolean(status && status >= 500);
};

const getNextPublishedPolicyPage = (
  lastPage: PublishedPolicyPage,
): number | undefined => (lastPage.hasNextPage ? lastPage.page + 1 : undefined);

export function usePublishedPolicies({
  operatorId,
  enabled = true,
}: UsePublishedPoliciesInput = {}) {
  const userId = useAuthStore((state) => state.user?.id);
  const safeOperatorId = operatorId && isUuid(operatorId) ? operatorId : undefined;
  const filters: Pick<ListPublishedPoliciesParams, 'operatorId'> = {
    ...(safeOperatorId ? { operatorId: safeOperatorId } : {}),
  };

  return useInfiniteQuery({
    queryKey: publishedPolicyKeys.list(userId ?? 'guest', filters),
    queryFn: ({ pageParam, signal }) =>
      listPublishedPolicies(
        {
          ...filters,
          page: pageParam,
          pageSize: PUBLISHED_POLICY_DEFAULT_PAGE_SIZE,
        },
        signal,
      ),
    initialPageParam: 1,
    getNextPageParam: getNextPublishedPolicyPage,
    enabled: enabled && Boolean(userId),
    staleTime: POLICY_LIST_STALE_TIME_MS,
    gcTime: POLICY_LIST_GC_TIME_MS,
    retry: shouldRetryPublishedPolicies,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
