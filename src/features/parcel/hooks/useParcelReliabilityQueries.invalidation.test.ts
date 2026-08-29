import type { QueryClient } from '@tanstack/react-query';

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
import { invalidateParcelReliabilityQueries } from './useParcelReliabilityQueries';

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
    await invalidateParcelReliabilityQueries(client, userId, parcelId, {
      includeClaims: false,
    });

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

  it('refreshes the exact claim query after claim mutations', async () => {
    const { client, invalidateQueries } = createClient();
    await invalidateParcelReliabilityQueries(client, userId, parcelId, {
      includeClaims: true,
    });

    expect(invalidateQueries).toHaveBeenCalledTimes(6);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: parcelReliabilityKeys.claims(userId, parcelId),
      exact: true,
    });
  });
});
