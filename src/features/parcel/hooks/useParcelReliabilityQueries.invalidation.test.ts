import { QueryClient } from '@tanstack/react-query';
import type { ParcelClaim } from '../types';

jest.mock('@features/auth/store/useAuthStore', () => ({
  useAuthStore: jest.fn(),
}));
jest.mock('../api/parcelReliabilityApi', () => {
  const root = ['parcels', 'reliability'] as const;
  const user = (userId: string) => [...root, userId] as const;
  const sentRoot = (userId: string) => [...user(userId), 'sent'] as const;
  return {
    addParcelClaimEvidence: jest.fn(),
    appealParcelClaim: jest.fn(),
    getParcelClaims: jest.fn(),
    getParcelTrace: jest.fn(),
    getSentParcels: jest.fn(),
    reportParcelIncident: jest.fn(),
    submitParcelClaim: jest.fn(),
    parcelReliabilityKeys: {
      root,
      user,
      sentRoot,
      trace: (userId: string, parcelId: string) => [
        ...user(userId), parcelId, 'trace',
      ] as const,
      claims: (userId: string, parcelId: string) => [
        ...user(userId), parcelId, 'claims',
      ] as const,
    },
  };
});
jest.mock('../api/parcelApi', () => ({
  parcelKeys: {
    detail: (userId: string, parcelId: string) => [
      'parcels', userId, 'detail', parcelId,
    ] as const,
  },
}));
jest.mock('@features/profile/api/passengerHistoryApi', () => {
  const user = (userId: string) => ['passenger-history', userId] as const;
  return {
    passengerHistoryKeys: {
      user,
      parcel: (userId: string) => [...user(userId), 'PARCEL'] as const,
      parcelRole: (userId: string) => [
        ...user(userId), 'PARCEL_ROLE',
      ] as const,
    },
  };
});

import { parcelReliabilityKeys } from '../api/parcelReliabilityApi';
import { parcelKeys } from '../api/parcelApi';
import { passengerHistoryKeys } from '@features/profile/api/passengerHistoryApi';
import {
  invalidateParcelReliabilityQueries,
  replaceParcelClaimInCache,
} from './useParcelReliabilityQueries';

const userId = '11111111-1111-4111-8111-111111111111';
const parcelId = '22222222-2222-4222-8222-222222222222';

describe('Parcel Reliability invalidation', () => {
  const createClient = () => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined);
    return {
      client: { invalidateQueries } as unknown as QueryClient,
      invalidateQueries,
    };
  };

  it('does not refresh claims for an incident mutation', async () => {
    const { client, invalidateQueries } = createClient();
    await invalidateParcelReliabilityQueries(client, userId, parcelId);

    expect(invalidateQueries).toHaveBeenCalledTimes(5);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: parcelReliabilityKeys.trace(userId, parcelId),
      exact: true,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: parcelKeys.detail(userId, parcelId),
      exact: true,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: parcelReliabilityKeys.sentRoot(userId),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: passengerHistoryKeys.parcel(userId),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: passengerHistoryKeys.parcelRole(userId),
    });
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: parcelReliabilityKeys.user(userId),
    });
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: passengerHistoryKeys.user(userId),
    });
  });

  it('uses the mutation response as the user-scoped claim source of truth', () => {
    const client = new QueryClient();
    const original = { claimId: '33333333-3333-4333-8333-333333333333' } as ParcelClaim;
    const updated = { ...original, status: 'UNDER_REVIEW' } as ParcelClaim;
    const other = { claimId: '44444444-4444-4444-8444-444444444444' } as ParcelClaim;

    client.setQueryData(
      parcelReliabilityKeys.claims(userId, parcelId),
      [original, other],
    );
    replaceParcelClaimInCache(client, userId, parcelId, updated);

    expect(client.getQueryData(parcelReliabilityKeys.claims(userId, parcelId)))
      .toEqual([updated, other]);
    expect(client.getQueryData(
      parcelReliabilityKeys.claims('another-user', parcelId),
    )).toBeUndefined();
    client.clear();
  });
});
