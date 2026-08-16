import { z } from 'zod';

import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import { apiInstantSchema } from '@shared/utils/apiTime';
import { encodeUuidPathSegment, isUuid } from '@shared/utils/pathSegment';
import type {
  ListPublishedPoliciesParams,
  PolicyListSortBy,
  PolicyListSortDir,
  PublishedPolicy,
  PublishedPolicyPage,
} from '../types/policy';
import {
  POLICY_LIST_SORT_DIRECTIONS,
  POLICY_LIST_SORT_FIELDS,
} from '../types/policy';

export const PUBLISHED_POLICY_DEFAULT_PAGE_SIZE = 20;
export const PUBLISHED_POLICY_MAX_PAGE_SIZE = 100;

export const publishedPolicyKeys = {
  all: ['published-policies'] as const,
  user: (userId: string) => [...publishedPolicyKeys.all, userId] as const,
  list: (
    userId: string,
    filters: Pick<ListPublishedPoliciesParams, 'operatorId' | 'category' | 'search'>,
  ) => [...publishedPolicyKeys.user(userId), 'list', filters] as const,
  detail: (userId: string, policyId: string) =>
    [...publishedPolicyKeys.user(userId), 'detail', policyId] as const,
};

const categorySchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[A-Z][A-Z0-9_]*$/, 'Invalid policy category.');

const publishedPolicySchema = z.object({
  id: z.string().uuid(),
  operatorId: z.string().uuid().nullable(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2_000),
  content: z.string().max(50_000),
  category: categorySchema,
  version: z.number().int().positive(),
  createdAt: apiInstantSchema,
  updatedAt: apiInstantSchema,
});

const publishedPolicyPageSchema = z.object({
  items: z.array(publishedPolicySchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

const isPolicySortBy = (value: unknown): value is PolicyListSortBy =>
  typeof value === 'string'
  && (POLICY_LIST_SORT_FIELDS as readonly string[]).includes(value);

const isPolicySortDir = (value: unknown): value is PolicyListSortDir =>
  typeof value === 'string'
  && (POLICY_LIST_SORT_DIRECTIONS as readonly string[]).includes(value);

const clampPageSize = (pageSize: number | undefined): number => {
  if (pageSize === undefined) return PUBLISHED_POLICY_DEFAULT_PAGE_SIZE;
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    return PUBLISHED_POLICY_DEFAULT_PAGE_SIZE;
  }
  return Math.min(pageSize, PUBLISHED_POLICY_MAX_PAGE_SIZE);
};

/** Builds the Gateway allow-list. Unknown or malformed filters are dropped. */
export const buildPublishedPolicyQuery = (
  params: ListPublishedPoliciesParams = {},
): Record<string, string | number> => {
  const query: Record<string, string | number> = {
    page: params.page && params.page > 1 ? params.page : 1,
    pageSize: clampPageSize(params.pageSize),
  };

  if (params.operatorId && isUuid(params.operatorId)) {
    query.operatorId = params.operatorId;
  }
  if (params.category && categorySchema.safeParse(params.category).success) {
    query.category = params.category;
  }
  const search = params.search?.trim();
  if (search) {
    query.search = search.slice(0, 200);
  }
  if (isPolicySortBy(params.sortBy)) {
    query.sortBy = params.sortBy;
  }
  if (isPolicySortDir(params.sortDir)) {
    query.sortDir = params.sortDir;
  }

  return query;
};

export async function listPublishedPolicies(
  params: ListPublishedPoliciesParams = {},
  signal?: AbortSignal,
): Promise<PublishedPolicyPage> {
  const response = await apiClient.get<ApiEnvelope<PublishedPolicyPage>>('/policies', {
    params: buildPublishedPolicyQuery(params),
    ...(signal ? { signal } : {}),
  });

  return publishedPolicyPageSchema.parse(unwrapApiResponse(response.data));
}

export async function getPublishedPolicy(
  policyId: string,
  signal?: AbortSignal,
): Promise<PublishedPolicy> {
  const policyIdSegment = encodeUuidPathSegment(policyId, 'policyId');
  const response = await apiClient.get<ApiEnvelope<PublishedPolicy>>(
    `/policies/${policyIdSegment}`,
    signal ? { signal } : undefined,
  );

  return publishedPolicySchema.parse(unwrapApiResponse(response.data));
}
