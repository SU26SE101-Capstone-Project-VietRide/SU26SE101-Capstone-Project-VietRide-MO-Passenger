import { z } from 'zod';

import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import { apiInstantSchema } from '@shared/utils/apiTime';
import type { Location } from '../types/location';

/**
 * BE GET /v1/locations
 * Query (LocationsController): parentCode?, search?
 * - no parentCode → active PROVINCE|MUNICIPALITY roots
 * - parentCode=<official root code> → active children under that root
 */
export interface ListLocationsParams {
  parentCode?: string;
  search?: string;
}

const locationSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['PROVINCE', 'MUNICIPALITY', 'WARD', 'COMMUNE', 'SPECIAL_ZONE']),
  parentId: z.string().uuid().nullable(),
  parentCode: z.string().nullable(),
  parentName: z.string().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: apiInstantSchema,
  updatedAt: apiInstantSchema,
}).strict();

export const locationKeys = {
  all: ['locations'] as const,
  list: (params: ListLocationsParams = {}) =>
    [...locationKeys.all, 'list', {
      parentCode: params.parentCode?.trim() || null,
      search: params.search?.trim() || null,
    }] as const,
};

export async function getLocations(
  params: ListLocationsParams = {},
  signal?: AbortSignal,
): Promise<Location[]> {
  const query: Record<string, string> = {};
  const parentCode = params.parentCode?.trim();
  const search = params.search?.trim();
  if (parentCode) query.parentCode = parentCode;
  if (search) query.search = search;

  const response = signal
    ? await apiClient.get<ApiEnvelope<unknown>>('/locations', { params: query, signal })
    : await apiClient.get<ApiEnvelope<unknown>>('/locations', { params: query });

  const raw = unwrapApiResponse(response.data);
  const parsed = z.array(locationSchema).parse(raw);
  return parsed.filter((location) => location.isActive);
}
