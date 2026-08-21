import { useRef } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import { toApiError } from '@shared/api/errors';
import {
  addParcelClaimEvidence,
  appealParcelClaim,
  getParcelClaims,
  getParcelTrace,
  getSentParcels,
  parcelReliabilityKeys,
  reportParcelIncident,
  submitParcelClaim,
} from '../api/parcelReliabilityApi';
import { parcelKeys } from '../api/parcelApi';
import type {
  AddParcelClaimEvidenceInput,
  AppealParcelClaimInput,
  ParcelClaim,
  ReportParcelIncidentInput,
  ReportParcelIncidentResult,
  SentParcelQuery,
} from '../types';
import {
  ParcelSubmissionCoordinator,
  type IdempotentParcelSubmitter,
} from '../utils/parcelSubmissionCoordinator';

const TRACE_LIMIT = 50;
const STALE_TIME_MS = 30 * 1000;

const semanticallyEqual = <T,>(left: T, right: T): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

function useRetainedParcelMutation<TInput, TResult>(
  scope: string,
  submitter: IdempotentParcelSubmitter<TInput, TResult>,
) {
  const userId = useAuthStore((state) => state.user?.id);
  const coordinatorScope = `${scope}:${userId ?? 'guest'}`;
  const coordinatorRef = useRef<{
    scope: string;
    coordinator: ParcelSubmissionCoordinator<TInput, TResult>;
  } | null>(null);
  if (coordinatorRef.current?.scope !== coordinatorScope) {
    coordinatorRef.current = {
      scope: coordinatorScope,
      coordinator: new ParcelSubmissionCoordinator(
        coordinatorScope,
        submitter,
        semanticallyEqual,
      ),
    };
  }

  const mutation = useMutation({
    mutationFn: (input: TInput) => coordinatorRef.current!.coordinator.submit(input),
    retry: 0,
  });

  return {
    ...mutation,
    hasRetainedAmbiguousSubmission: () =>
      coordinatorRef.current?.coordinator.hasRetainedAmbiguousSubmission() ?? false,
    retryRetainedAsync: () => coordinatorRef.current!.coordinator.retryRetainedAsync(),
  };
}

const shouldRetryRead = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= 1) return false;
  const apiError = toApiError(error);
  return apiError.isNetworkError
    || apiError.statusCode === 408
    || apiError.statusCode === 429
    || Boolean(apiError.statusCode && apiError.statusCode >= 500);
};

export function useSentParcels(
  query: Omit<SentParcelQuery, 'page'> = {},
  enabled = true,
) {
  const userId = useAuthStore((state) => state.user?.id);
  return useInfiniteQuery({
    queryKey: parcelReliabilityKeys.sent(userId ?? 'guest', query),
    queryFn: ({ pageParam, signal }) => getSentParcels(
      { ...query, page: pageParam },
      signal,
    ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasNextPage
      ? lastPage.page + 1
      : undefined,
    enabled: enabled && Boolean(userId),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: shouldRetryRead,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useParcelTrace(parcelId: string, enabled = true) {
  const userId = useAuthStore((state) => state.user?.id);
  return useInfiniteQuery({
    queryKey: parcelReliabilityKeys.trace(userId ?? 'guest', parcelId),
    queryFn: ({ pageParam, signal }) => getParcelTrace(
      parcelId,
      pageParam,
      TRACE_LIMIT,
      signal,
    ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.timeline.nextCursor ?? undefined,
    enabled: enabled && Boolean(userId && parcelId),
    staleTime: STALE_TIME_MS,
    gcTime: 5 * 60 * 1000,
    retry: shouldRetryRead,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useParcelClaims(parcelId: string, enabled = true) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: parcelReliabilityKeys.claims(userId ?? 'guest', parcelId),
    queryFn: ({ signal }) => getParcelClaims(parcelId, signal),
    enabled: enabled && Boolean(userId && parcelId),
    staleTime: STALE_TIME_MS,
    gcTime: 5 * 60 * 1000,
    retry: shouldRetryRead,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

function useInvalidateReliability(parcelId: string) {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  return async (): Promise<void> => {
    if (!userId) return;
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: parcelReliabilityKeys.trace(userId, parcelId),
      }),
      queryClient.invalidateQueries({
        queryKey: parcelReliabilityKeys.claims(userId, parcelId),
      }),
      queryClient.invalidateQueries({
        queryKey: parcelKeys.detail(userId, parcelId),
      }),
      queryClient.invalidateQueries({
        queryKey: parcelReliabilityKeys.user(userId),
      }),
    ]);
  };
}

export function useReportParcelIncident(parcelId: string) {
  const invalidate = useInvalidateReliability(parcelId);
  const mutation = useRetainedParcelMutation<
    ReportParcelIncidentInput,
    ReportParcelIncidentResult
  >(`parcel-report-incident-mobile:${parcelId}`, reportParcelIncident);
  return {
    ...mutation,
    mutateAsync: async (input: ReportParcelIncidentInput) => {
      const result = await mutation.mutateAsync(input);
      await invalidate();
      return result;
    },
  };
}

export function useSubmitParcelClaim(parcelId: string) {
  const invalidate = useInvalidateReliability(parcelId);
  const mutation = useRetainedParcelMutation<string, ParcelClaim>(
    `parcel-submit-claim-mobile:${parcelId}`,
    submitParcelClaim,
  );
  return {
    ...mutation,
    mutateAsync: async () => {
      const result = await mutation.mutateAsync(parcelId);
      await invalidate();
      return result;
    },
  };
}

export function useAppealParcelClaim(parcelId: string) {
  const invalidate = useInvalidateReliability(parcelId);
  const mutation = useRetainedParcelMutation<AppealParcelClaimInput, ParcelClaim>(
    `parcel-appeal-claim-mobile:${parcelId}`,
    appealParcelClaim,
  );
  return {
    ...mutation,
    mutateAsync: async (input: AppealParcelClaimInput) => {
      const result = await mutation.mutateAsync(input);
      await invalidate();
      return result;
    },
  };
}

/** API-ready only; no user-facing upload CTA until Passenger evidence upload is fixed. */
export function useAddParcelClaimEvidence(parcelId: string) {
  const invalidate = useInvalidateReliability(parcelId);
  const mutation = useRetainedParcelMutation<AddParcelClaimEvidenceInput, ParcelClaim>(
    `parcel-add-claim-evidence-mobile:${parcelId}`,
    addParcelClaimEvidence,
  );
  return {
    ...mutation,
    mutateAsync: async (input: AddParcelClaimEvidenceInput) => {
      const result = await mutation.mutateAsync(input);
      await invalidate();
      return result;
    },
  };
}
