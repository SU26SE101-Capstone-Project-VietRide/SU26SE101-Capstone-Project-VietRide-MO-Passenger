import type {
  BookingTicketResult,
  BusTrip,
  DropOffPoint,
  PickUpPoint,
  RoundTripResult,
} from '../types';
import { BOOKING_HISTORY_TICKET_FIXTURE } from '../data/bookingHistoryFixture';
import {
  buildCheckoutTicketViewModel,
  buildHistoryTicketViewModel,
} from './ticketViewModel';

const makeTrip = (id: string, from: string, to: string): BusTrip => ({
  id,
  operatorId: '22222222-2222-4222-8222-222222222222',
  routeId: '33333333-3333-4333-8333-333333333333',
  originStationId: '44444444-4444-4444-8444-444444444444',
  destinationStationId: '55555555-5555-4555-8555-555555555555',
  operatorBadge: 'VietRide',
  departureStation: from,
  arrivalStation: to,
  departureTime: '08:00',
  arrivalTime: '12:00',
  baseFare: 250_000,
  effectiveFare: 250_000,
  seatsLeft: 10,
  allowPickup: false,
  allowDropoff: false,
  busType: 'limousine',
  busLabel: null,
  durationHours: 4,
  totalSeats: 40,
  departureCity: from,
  arrivalCity: to,
  status: 'IN_PROGRESS',
});

const makePoint = (name: string, time: string): PickUpPoint & DropOffPoint => ({
  id: name,
  name,
  address: `${name} address`,
  time,
  status: 'current',
});

const makeTicket = (seatNumber: string): BookingTicketResult => ({
  ticketId: `ticket-${seatNumber}`,
  ticketCode: `code-${seatNumber}`,
  seatNumber,
  status: 'ACTIVE',
  fareAmount: 250_000,
  discountAmount: 0,
  paidAmount: 250_000,
});

const pendingRoundTrip: RoundTripResult = {
  bookingGroupId: '66666666-6666-4666-8666-666666666666',
  outbound: {
    bookingId: '77777777-7777-4777-8777-777777777777',
    bookingCode: 'VR-OUT',
    totalAmount: 250_000,
    discountAmount: 0,
    tickets: [makeTicket('A01')],
  },
  return: {
    bookingId: '88888888-8888-4888-8888-888888888888',
    bookingCode: 'VR-RETURN',
    totalAmount: 300_000,
    discountAmount: 0,
    tickets: [makeTicket('B02')],
  },
  grandTotal: 550_000,
  paymentId: '99999999-9999-4999-8999-999999999999',
  status: 'PENDING_PAYMENT',
  paymentRedirectUrl: null,
};

const outboundTrip = makeTrip('11111111-1111-4111-8111-111111111111', 'Ha Noi', 'Da Nang');
const returnTrip = makeTrip('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Da Nang', 'Ha Noi');

const buildRoundTrip = (result: RoundTripResult) => buildCheckoutTicketViewModel({
  bookingResult: result,
  paymentMethod: 'vnpay',
  selectedTrip: null,
  selectedPickUp: null,
  selectedDropOff: null,
  outboundState: {
    trip: outboundTrip,
    pickUp: makePoint('Ha Noi', '08:00'),
    dropOff: makePoint('Da Nang', '12:00'),
    shuttlePickup: {
      stationId: outboundTrip.originStationId,
      address: '12 Tran Duy Hung, Ha Noi',
      latitude: 21.01,
      longitude: 105.8,
    },
  },
  returnState: {
    trip: returnTrip,
    pickUp: makePoint('Da Nang', '15:00'),
    dropOff: makePoint('Ha Noi', '19:00'),
  },
});

describe('checkout ticket view model', () => {
  it('keeps round-trip legs, seats, routes, IDs and amounts separate', () => {
    const model = buildRoundTrip(pendingRoundTrip);

    expect(model).toMatchObject({
      isPendingPayment: true,
      totalAmount: 550_000,
      legs: [
        {
          label: 'Outbound',
          reference: 'VR-OUT',
          boardingName: 'Ha Noi',
          alightingName: 'Da Nang',
          seatNumbers: 'A01',
          totalAmount: 250_000,
          bookingId: pendingRoundTrip.outbound.bookingId,
          tripId: outboundTrip.id,
          trackingEnabled: false,
          shuttlePickupAddress: '12 Tran Duy Hung, Ha Noi',
        },
        {
          label: 'Return',
          reference: 'VR-RETURN',
          boardingName: 'Da Nang',
          alightingName: 'Ha Noi',
          seatNumbers: 'B02',
          totalAmount: 300_000,
          bookingId: pendingRoundTrip.return.bookingId,
          tripId: returnTrip.id,
          trackingEnabled: false,
        },
      ],
    });
  });

  it('does not invent Shuttle data for a leg without a local checkout request', () => {
    const model = buildRoundTrip(pendingRoundTrip);

    expect(model?.legs[0].shuttlePickupAddress).toBe('12 Tran Duy Hung, Ha Noi');
    expect(model?.legs[1]).not.toHaveProperty('shuttlePickupAddress');
  });

  it('uses canonical status, not redirect URL presence, for pending and tracking state', () => {
    const confirmed = buildRoundTrip({
      ...pendingRoundTrip,
      status: 'CONFIRMED',
      paymentRedirectUrl: 'https://payments.example.test/stale-metadata',
    });

    expect(confirmed?.isPendingPayment).toBe(false);
    expect(confirmed?.legs.every((leg) => leg.trackingEnabled)).toBe(true);
  });

  it('never exposes tracking from demo ticket fixtures', () => {
    const model = buildHistoryTicketViewModel(
      'demo',
      BOOKING_HISTORY_TICKET_FIXTURE[0],
    );

    expect(model.isDemo).toBe(true);
    expect(model.legs).toHaveLength(1);
    expect(model.legs[0].trackingEnabled).toBe(false);
  });
});
