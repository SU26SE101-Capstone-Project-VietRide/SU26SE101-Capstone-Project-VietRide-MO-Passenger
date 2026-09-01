import {
  bookingKeys,
  getPromotions,
} from '@features/booking/api/bookingApi';
import type { PromotionItem } from '@features/booking/types';
import {
  HOME_PROMOTIONS_REFRESH_INTERVAL_MS,
  homePromotionsQueryOptions,
} from './useHomePromotions';

jest.mock('@features/booking/api/bookingApi', () => {
  return {
    bookingKeys: {
      promotions: (service: string) => ['bookings', 'promotions', service],
    },
    getPromotions: jest.fn(),
  };
});

describe('homePromotionsQueryOptions', () => {
  it('reuses the booking promotions API and service-scoped booking key', async () => {
    const promotions: PromotionItem[] = [{
      voucherId: 'voucher-1',
      code: 'RIDE20',
      name: 'Ride offer',
      type: 'PERCENT_OFF',
      value: 20,
      applicableServices: ['BOOKING'],
      validUntil: '2026-08-01T00:00:00Z',
    }];
    jest.mocked(getPromotions).mockResolvedValue(promotions);
    const options = homePromotionsQueryOptions('BOOKING');
    const signal = new AbortController().signal;

    expect(options.queryKey).toEqual(bookingKeys.promotions('BOOKING'));
    expect(typeof options.queryFn).toBe('function');

    const queryFn = options.queryFn as (
      context: { signal: AbortSignal },
    ) => Promise<PromotionItem[]>;
    await expect(queryFn({ signal })).resolves.toEqual(promotions);
    expect(getPromotions).toHaveBeenCalledWith('BOOKING', signal);
  });

  it('keeps parcel promotions in a separate cache entry', () => {
    expect(homePromotionsQueryOptions('PARCEL').queryKey).toEqual(
      bookingKeys.promotions('PARCEL'),
    );
    expect(homePromotionsQueryOptions('PARCEL').queryKey).not.toEqual(
      homePromotionsQueryOptions('BOOKING').queryKey,
    );
  });

  it('refreshes visible promotions without polling a hidden Home screen', () => {
    expect(homePromotionsQueryOptions('BOOKING', true)).toMatchObject({
      enabled: true,
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnReconnect: 'always',
      refetchInterval: HOME_PROMOTIONS_REFRESH_INTERVAL_MS,
      refetchIntervalInBackground: false,
    });
    expect(homePromotionsQueryOptions('BOOKING', false)).toMatchObject({
      enabled: false,
      refetchInterval: false,
    });
  });
});
