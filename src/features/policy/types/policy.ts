export const POLICY_LIST_SORT_FIELDS = [
  'updatedAt',
  'createdAt',
  'title',
  'version',
] as const;

export const POLICY_LIST_SORT_DIRECTIONS = ['asc', 'desc'] as const;

export type PolicyListSortBy = (typeof POLICY_LIST_SORT_FIELDS)[number];
export type PolicyListSortDir = (typeof POLICY_LIST_SORT_DIRECTIONS)[number];

/** Consumer-facing published Policy. Admin/operator fields are never present. */
export interface PublishedPolicy {
  id: string;
  operatorId: string | null;
  title: string;
  description: string;
  content: string;
  category: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublishedPolicyPage {
  items: PublishedPolicy[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ListPublishedPoliciesParams {
  operatorId?: string;
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: PolicyListSortBy;
  sortDir?: PolicyListSortDir;
}

export type PolicySource = 'platform' | 'operator';
