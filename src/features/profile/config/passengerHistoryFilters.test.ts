import { PARCEL_STATUSES } from '@features/parcel/types';

import {
  getParcelStatusesForHistoryFilter,
  PARCEL_HISTORY_FILTER_GROUPS,
  PASSENGER_PARCEL_HISTORY_FILTERS,
  PASSENGER_TICKET_HISTORY_FILTERS,
} from './passengerHistoryFilters';

const BE_TICKET_STATUSES = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'COMPLETED',
  'EXPIRED',
  'CANCELLED',
  'NO_SHOW',
  'PARTIAL_NO_SHOW',
  'REFUNDED',
  'DISRUPTED',
] as const;

describe('passengerHistoryFilters', () => {
  it('sends only BookingStatus values the passenger-history GET accepts', () => {
    expect(PASSENGER_TICKET_HISTORY_FILTERS).toEqual(
      expect.arrayContaining([
        'PENDING_PAYMENT',
        'CONFIRMED',
        'COMPLETED',
        'CANCELLED',
        'EXPIRED',
      ]),
    );
    for (const status of PASSENGER_TICKET_HISTORY_FILTERS) {
      expect(BE_TICKET_STATUSES).toContain(status);
    }
  });

  it('groups only settlement-v2 statuses and leaves legacy rows in All', () => {
    const liveStatuses = [
      'PENDING_PAYMENT',
      'PENDING_FINAL_PAYMENT',
      'PENDING_OPERATOR_ACTION',
      'RESERVED',
      'CHECKED_IN',
      'READY_TO_LOAD',
      'LOADED',
      'IN_TRANSIT',
      'PENDING_TRANSFER_CONFIRM',
      'TRANSFER_ESCALATED',
      'UNLOADED',
      'DELIVERED_PENDING_CONFIRM',
      'DELIVERY_CONFIRMED',
      'DELIVERY_REJECTED',
      'RETURN_INITIATED',
      'RETURNED',
      'CANCELLED',
      'REJECTED',
      'EXPIRED',
    ] as const;
    const legacyStatuses = [
      'PENDING_OPERATOR_REVIEW',
      'PENDING',
      'PENDING_ADDITIONAL_PAYMENT',
    ] as const;

    const seen = new Set<string>();
    for (const filter of PASSENGER_PARCEL_HISTORY_FILTERS) {
      const statuses = getParcelStatusesForHistoryFilter(filter);
      expect(statuses?.length).toBeGreaterThan(0);
      for (const status of statuses ?? []) {
        expect(PARCEL_STATUSES).toContain(status);
        expect(legacyStatuses).not.toContain(status);
        expect(seen.has(status)).toBe(false);
        seen.add(status);
      }
    }

    expect([...seen].sort()).toEqual([...liveStatuses].sort());
    expect(Object.keys(PARCEL_HISTORY_FILTER_GROUPS)).toEqual(
      expect.arrayContaining([...PASSENGER_PARCEL_HISTORY_FILTERS]),
    );
  });

  it('does not invent a status query for All', () => {
    expect(getParcelStatusesForHistoryFilter('ALL')).toBeUndefined();
  });
});
