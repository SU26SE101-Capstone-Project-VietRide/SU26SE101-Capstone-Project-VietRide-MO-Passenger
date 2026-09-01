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
      vouchers: (userId: string, params: unknown) => [
        ...user(userId), 'vouchers', params,
      ] as const,
      detail: (userId: string, parcelId: string) => [
        ...user(userId), parcelId, 'detail',
      ] as const,
    },
  };
});

import { parcelKeys } from '../api/parcelApi';
import {
  PARCEL_VOUCHER_REFRESH_INTERVAL_MS,
  parcelDetailQueryOptions,
  parcelVoucherQueryOptions,
} from './useParcelQueries';

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

describe('parcel voucher query freshness', () => {
  const params = {
    tripId: '33333333-3333-4333-8333-333333333333',
    sizeCategory: 'SMALL' as const,
    paymentMethod: 'VNPAY' as const,
    quoteToken: 'quote-token',
    quoteExpiresAt: '2026-09-01T00:00:00.000Z',
    estimatedGrossPriceVnd: 250_000,
  };

  it('revalidates frequently only while checkout can fetch', () => {
    expect(parcelVoucherQueryOptions(userId, params, true)).toMatchObject({
      enabled: true,
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnReconnect: 'always',
      refetchInterval: PARCEL_VOUCHER_REFRESH_INTERVAL_MS,
      refetchIntervalInBackground: false,
    });
    expect(parcelVoucherQueryOptions(userId, params, false)).toMatchObject({
      enabled: false,
      refetchInterval: false,
    });
  });
});
