jest.mock('@features/auth/store/useAuthStore', () => ({
  useAuthStore: jest.fn(),
}));
jest.mock('../api/parcelApi', () => {
  const all = ['parcels'] as const;
  const user = (userId: string) => [...all, userId] as const;
  return {
    createParcel: jest.fn(),
    getAvailableParcelTrips: jest.fn(),
    getAvailableParcelVouchers: jest.fn(),
    getParcelDetail: jest.fn(),
    getReceivedParcels: jest.fn(),
    startParcelDepositPayment: jest.fn(),
    startParcelFinalPayment: jest.fn(),
    parcelKeys: {
      all,
      user,
      detail: (userId: string, parcelId: string) => [
        ...user(userId), parcelId, 'detail',
      ] as const,
    },
  };
});

import { parcelKeys } from '../api/parcelApi';
import { parcelDetailQueryOptions } from './useParcelQueries';

const userId = '11111111-1111-4111-8111-111111111111';
const parcelId = '22222222-2222-4222-8222-222222222222';

describe('parcel detail query freshness', () => {
  it('always refetches when a detail screen mounts', () => {
    expect(parcelDetailQueryOptions(userId, parcelId)).toMatchObject({
      queryKey: parcelKeys.detail(userId, parcelId),
      enabled: true,
      refetchOnMount: 'always',
    });
  });
});
