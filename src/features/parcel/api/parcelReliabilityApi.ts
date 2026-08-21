import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import { normalizeIdempotencyKey } from '@shared/api/idempotency';
import { encodeUuidPathSegment } from '@shared/utils/pathSegment';
import type {
  AddParcelClaimEvidenceInput,
  AppealParcelClaimInput,
  ParcelClaim,
  ParcelDeliveryTokenInput,
  ParcelIncident,
  ParcelTrace,
  PagedParcelResponse,
  RejectParcelDeliveryInput,
  ReportParcelIncidentInput,
  ReportParcelIncidentResult,
  SentParcel,
  SentParcelQuery,
} from '../types';
import {
  confirmParcelDeliveryResultSchema,
  rejectParcelDeliveryResultSchema,
  undoRejectParcelDeliveryResultSchema,
  parseParcelClaims,
  parseParcelTrace,
  parseSentParcelPage,
  parcelClaimSchema,
  parcelIncidentSchema,
  reportParcelIncidentResultSchema,
} from './parcelSchemas';

const idempotencyConfig = (idempotencyKey: string) => ({
  headers: {
    'Idempotency-Key': normalizeIdempotencyKey(idempotencyKey),
  },
});

const anonymousIdempotencyConfig = (idempotencyKey: string) => ({
  ...idempotencyConfig(idempotencyKey),
  skipAuth: true,
  skipAuthRefresh: true,
});

export const parcelReliabilityKeys = {
  root: ['parcels', 'reliability'] as const,
  user: (userId: string) => [...parcelReliabilityKeys.root, userId] as const,
  sent: (userId: string, query: Omit<SentParcelQuery, 'page'>) => [
    ...parcelReliabilityKeys.user(userId),
    'sent',
    query.status ?? 'all',
    query.from ?? 'any-from',
    query.to ?? 'any-to',
    query.pageSize ?? 20,
  ] as const,
  trace: (userId: string, parcelId: string) => [
    ...parcelReliabilityKeys.user(userId),
    parcelId,
    'trace',
  ] as const,
  incidents: (userId: string, parcelId: string) => [
    ...parcelReliabilityKeys.user(userId),
    parcelId,
    'incidents',
  ] as const,
  claims: (userId: string, parcelId: string) => [
    ...parcelReliabilityKeys.user(userId),
    parcelId,
    'claims',
  ] as const,
};

export async function getSentParcels(
  query: SentParcelQuery = {},
  signal?: AbortSignal,
): Promise<PagedParcelResponse<SentParcel>> {
  const response = await apiClient.get<ApiEnvelope<PagedParcelResponse<SentParcel>>>(
    '/parcels/sent',
    {
      params: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.from ? { from: query.from } : {}),
        ...(query.to ? { to: query.to } : {}),
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
      },
      ...(signal ? { signal } : {}),
    },
  );
  return parseSentParcelPage(unwrapApiResponse(response.data)) as PagedParcelResponse<SentParcel>;
}

export async function getParcelTrace(
  parcelId: string,
  cursor?: string | null,
  limit = 50,
  signal?: AbortSignal,
): Promise<ParcelTrace> {
  const safeParcelId = encodeUuidPathSegment(parcelId, 'parcelId');
  const response = await apiClient.get<ApiEnvelope<ParcelTrace>>(
    `/parcels/${safeParcelId}/trace`,
    {
      params: {
        ...(cursor ? { cursor } : {}),
        limit,
      },
      ...(signal ? { signal } : {}),
    },
  );
  return parseParcelTrace(unwrapApiResponse(response.data)) as ParcelTrace;
}

export async function getParcelIncidents(
  parcelId: string,
  signal?: AbortSignal,
): Promise<ParcelIncident[]> {
  const safeParcelId = encodeUuidPathSegment(parcelId, 'parcelId');
  const response = await apiClient.get<ApiEnvelope<ParcelIncident[]>>(
    `/parcels/${safeParcelId}/incidents`,
    signal ? { signal } : undefined,
  );
  return parcelIncidentSchema.array().parse(unwrapApiResponse(response.data));
}

export async function reportParcelIncident(
  input: ReportParcelIncidentInput,
  idempotencyKey: string,
): Promise<ReportParcelIncidentResult> {
  const safeParcelId = encodeUuidPathSegment(input.parcelId, 'parcelId');
  const response = await apiClient.post<ApiEnvelope<ReportParcelIncidentResult>>(
    `/parcels/${safeParcelId}/incidents`,
    {
      incidentType: input.incidentType,
      description: input.description?.trim() || null,
      evidenceUrls: input.evidenceUrls,
    },
    idempotencyConfig(idempotencyKey),
  );
  return reportParcelIncidentResultSchema.parse(unwrapApiResponse(response.data));
}

export async function getParcelClaims(
  parcelId: string,
  signal?: AbortSignal,
): Promise<ParcelClaim[]> {
  const safeParcelId = encodeUuidPathSegment(parcelId, 'parcelId');
  const response = await apiClient.get<ApiEnvelope<ParcelClaim[]>>(
    `/parcels/${safeParcelId}/claims`,
    signal ? { signal } : undefined,
  );
  return parseParcelClaims(unwrapApiResponse(response.data)) as ParcelClaim[];
}

export async function submitParcelClaim(
  parcelId: string,
  idempotencyKey: string,
): Promise<ParcelClaim> {
  const safeParcelId = encodeUuidPathSegment(parcelId, 'parcelId');
  const response = await apiClient.post<ApiEnvelope<ParcelClaim>>(
    `/parcels/${safeParcelId}/claims`,
    null,
    idempotencyConfig(idempotencyKey),
  );
  return parcelClaimSchema.parse(unwrapApiResponse(response.data)) as ParcelClaim;
}

export async function addParcelClaimEvidence(
  input: AddParcelClaimEvidenceInput,
  idempotencyKey: string,
): Promise<ParcelClaim> {
  const safeParcelId = encodeUuidPathSegment(input.parcelId, 'parcelId');
  const safeClaimId = encodeUuidPathSegment(input.claimId, 'claimId');
  const evidenceType = input.evidenceType.trim();
  const reference = input.reference.trim();
  if (!evidenceType || !reference) {
    throw new Error('Parcel claim evidence type and reference are required.');
  }
  const response = await apiClient.post<ApiEnvelope<ParcelClaim>>(
    `/parcels/${safeParcelId}/claims/${safeClaimId}/evidence`,
    {
      evidenceType,
      reference,
      note: input.note?.trim() || null,
    },
    idempotencyConfig(idempotencyKey),
  );
  return parcelClaimSchema.parse(unwrapApiResponse(response.data)) as ParcelClaim;
}

export async function appealParcelClaim(
  input: AppealParcelClaimInput,
  idempotencyKey: string,
): Promise<ParcelClaim> {
  const safeParcelId = encodeUuidPathSegment(input.parcelId, 'parcelId');
  const safeClaimId = encodeUuidPathSegment(input.claimId, 'claimId');
  const reason = input.reason.trim();
  if (!reason) {
    throw new Error('Parcel claim appeal reason is required.');
  }
  const response = await apiClient.post<ApiEnvelope<ParcelClaim>>(
    `/parcels/${safeParcelId}/claims/${safeClaimId}/appeal`,
    { reason },
    idempotencyConfig(idempotencyKey),
  );
  return parcelClaimSchema.parse(unwrapApiResponse(response.data)) as ParcelClaim;
}

export interface ConfirmParcelDeliveryResult {
  parcelId: string;
  status: string;
  confirmedAt: string;
}

export interface RejectParcelDeliveryResult {
  parcelId: string;
  status: string;
  rejectedAt: string;
  canUndoUntil: string;
}

export interface UndoRejectParcelDeliveryResult {
  parcelId: string;
  status: string;
  undoneAt: string;
}

const requireDeliveryToken = (token: string): string => {
  const normalized = token.trim();
  if (!normalized) throw new Error('Parcel delivery token is required.');
  return normalized;
};

export async function confirmParcelDelivery(
  input: ParcelDeliveryTokenInput,
  idempotencyKey: string,
): Promise<ConfirmParcelDeliveryResult> {
  const response = await apiClient.post<ApiEnvelope<ConfirmParcelDeliveryResult>>(
    '/parcels/delivery/confirm',
    { token: requireDeliveryToken(input.token) },
    anonymousIdempotencyConfig(idempotencyKey),
  );
  return confirmParcelDeliveryResultSchema.parse(unwrapApiResponse(response.data));
}

export async function rejectParcelDelivery(
  input: RejectParcelDeliveryInput,
  idempotencyKey: string,
): Promise<RejectParcelDeliveryResult> {
  const reason = input.reason.trim();
  if (!reason) throw new Error('Parcel delivery rejection reason is required.');
  const response = await apiClient.post<ApiEnvelope<RejectParcelDeliveryResult>>(
    '/parcels/delivery/reject',
    { token: requireDeliveryToken(input.token), rejectionReason: reason },
    anonymousIdempotencyConfig(idempotencyKey),
  );
  return rejectParcelDeliveryResultSchema.parse(unwrapApiResponse(response.data));
}

export async function undoRejectParcelDelivery(
  input: ParcelDeliveryTokenInput,
  idempotencyKey: string,
): Promise<UndoRejectParcelDeliveryResult> {
  const response = await apiClient.post<ApiEnvelope<UndoRejectParcelDeliveryResult>>(
    '/parcels/delivery/undo-reject',
    { token: requireDeliveryToken(input.token) },
    anonymousIdempotencyConfig(idempotencyKey),
  );
  return undoRejectParcelDeliveryResultSchema.parse(unwrapApiResponse(response.data));
}
