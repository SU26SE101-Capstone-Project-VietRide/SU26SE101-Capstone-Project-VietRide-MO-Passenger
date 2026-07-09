import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AvailableVoucherItem, GetAvailableVouchersParams } from '../types';
import { bookingKeys, getAvailableVouchers } from '../api/bookingApi';

export interface VoucherPreviewLeg {
  tripId: string;
  orderAmount: number;
}

interface UseAvailableBookingVouchersParams {
  legs: VoucherPreviewLeg[];
  paymentMethod: 'WALLET' | 'VNPAY';
  enabled?: boolean;
}

const mergeVoucherLists = (lists: AvailableVoucherItem[][]): AvailableVoucherItem[] => {
  const byCode = new Map<string, AvailableVoucherItem>();

  lists.flat().forEach((voucher) => {
    const key = voucher.code.trim().toUpperCase();
    const existing = byCode.get(key);

    if (!existing) {
      byCode.set(key, voucher);
      return;
    }

    byCode.set(key, {
      ...existing,
      discountAmount: existing.discountAmount + voucher.discountAmount,
      validUntil:
        new Date(existing.validUntil).getTime() <= new Date(voucher.validUntil).getTime()
          ? existing.validUntil
          : voucher.validUntil,
    });
  });

  return Array.from(byCode.values()).sort((a, b) => {
    if (b.discountAmount !== a.discountAmount) {
      return b.discountAmount - a.discountAmount;
    }

    return new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime();
  });
};

export function useAvailableBookingVouchers({
  legs,
  paymentMethod,
  enabled = true,
}: UseAvailableBookingVouchersParams) {
  const normalizedLegs = useMemo(
    () =>
      legs
        .filter((leg) => leg.tripId && leg.orderAmount > 0)
        .map((leg) => ({
          tripId: leg.tripId,
          orderAmount: Math.max(0, Math.round(leg.orderAmount)),
        })),
    [legs],
  );

  const queryParams: GetAvailableVouchersParams = useMemo(
    () => ({
      service: 'BOOKING',
      paymentMethod,
      tripId: normalizedLegs[0]?.tripId,
      orderAmount: normalizedLegs[0]?.orderAmount,
    }),
    [normalizedLegs, paymentMethod],
  );

  return useQuery({
    queryKey: bookingKeys.availableVouchers({
      service: 'BOOKING',
      paymentMethod,
      orderAmount: normalizedLegs.reduce((sum, leg) => sum + leg.orderAmount, 0),
      tripId: normalizedLegs.map((leg) => leg.tripId).join('|'),
    }),
    queryFn: async () => {
      if (normalizedLegs.length <= 1) {
        return getAvailableVouchers(queryParams);
      }

      const results = await Promise.all(
        normalizedLegs.map((leg) =>
          getAvailableVouchers({
            service: 'BOOKING',
            tripId: leg.tripId,
            paymentMethod,
            orderAmount: leg.orderAmount,
          }),
        ),
      );

      return mergeVoucherLists(results);
    },
    enabled: enabled && normalizedLegs.length > 0,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
