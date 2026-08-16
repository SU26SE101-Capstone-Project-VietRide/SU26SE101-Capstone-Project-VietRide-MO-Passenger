import {
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

  it('keeps parcel chips as a subset of ParcelStatus', () => {
    expect(PASSENGER_PARCEL_HISTORY_FILTERS).toEqual([
      'PENDING_PAYMENT',
      'IN_TRANSIT',
      'DELIVERY_CONFIRMED',
      'CANCELLED',
      'EXPIRED',
    ]);
  });
});
