import type {
  BookingTicketResult,
  BusTrip,
  DropOffPoint,
  PickUpPoint,
  RoundTripResult,
} from '../types';
import type { PassengerTicketHistoryItem } from '@features/profile/types';
import { BOOKING_HISTORY_TICKET_FIXTURE } from '../data/bookingHistoryFixture';
import {
  buildCheckoutTicketViewModel,
  buildHistoryTicketViewModel,
  buildPassengerHistoryTicketViewModel,
  hydrateCheckoutBookingResultFromHistory,
} from './ticketViewModel';
import { canShowBoardingQr } from './ticketPresentation';

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
  pickupPoints: [],
  dropoffPoints: [],
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

    expect(model?.isPendingPayment).toBe(true);
    expect(model?.totalAmount).toBe(550_000);
    expect(model?.legs).toHaveLength(2);
    expect(model?.legs[0]).toMatchObject({
      reference: 'VR-OUT',
      boardingName: 'Ha Noi',
      alightingName: 'Da Nang',
      seatNumbers: 'A01',
      totalAmount: 250_000,
      bookingId: pendingRoundTrip.outbound.bookingId,
      tripId: outboundTrip.id,
      trackingEnabled: false,
      shuttlePickupAddress: '12 Tran Duy Hung, Ha Noi',
    });
    expect(model?.legs[1]).toMatchObject({
      reference: 'VR-RETURN',
      boardingName: 'Da Nang',
      alightingName: 'Ha Noi',
      seatNumbers: 'B02',
      totalAmount: 300_000,
      bookingId: pendingRoundTrip.return.bookingId,
      tripId: returnTrip.id,
      trackingEnabled: false,
    });
    // Labels are i18n-backed; assert they differ across legs without pinning locale.
    expect(model?.legs[0].label).toBeTruthy();
    expect(model?.legs[1].label).toBeTruthy();
    expect(model?.legs[0].label).not.toBe(model?.legs[1].label);
  });

  it('shows create-booking vehicle plate and type on the ticket immediately', () => {
    const model = buildCheckoutTicketViewModel({
      bookingResult: {
        bookingId: '77777777-7777-4777-8777-777777777777',
        bookingCode: 'VR-ONE',
        status: 'CONFIRMED',
        totalAmount: 250_000,
        discountAmount: 0,
        paymentId: null,
        paymentRedirectUrl: null,
        tickets: [makeTicket('A01')],
        vehicle: {
          licensePlate: '51B-123.45',
          vehicleType: {
            code: 'LIMOUSINE',
            displayName: 'Limousine',
          },
        },
      },
      paymentMethod: 'wallet',
      selectedTrip: outboundTrip,
      selectedPickUp: makePoint('Ha Noi', '08:00'),
      selectedDropOff: makePoint('Da Nang', '12:00'),
      outboundState: null,
      returnState: null,
    });

    expect(model?.legs[0]).toMatchObject({
      busType: 'Limousine',
      licensePlate: '51B-123.45',
    });
  });

  it('does not invent Shuttle data for a leg without a local checkout request', () => {
    const model = buildRoundTrip(pendingRoundTrip);

    expect(model?.legs[0].shuttlePickupAddress).toBe('12 Tran Duy Hung, Ha Noi');
    expect(model?.legs[1]).not.toHaveProperty('shuttlePickupAddress');
  });

  it('promotes paid checkout tickets and confirmed copy after VNPay settles', () => {
    const translate = (key: string) => key;
    const model = buildCheckoutTicketViewModel({
      bookingResult: {
        bookingId: '77777777-7777-4777-8777-777777777777',
        bookingCode: 'VR-ONE',
        status: 'CONFIRMED',
        totalAmount: 250_000,
        discountAmount: 0,
        paymentId: null,
        paymentRedirectUrl: null,
        tickets: [{
          ...makeTicket('A01'),
          status: 'PENDING_PAYMENT',
        }],
      },
      paymentMethod: 'vnpay',
      selectedTrip: outboundTrip,
      selectedPickUp: makePoint('Ha Noi', '08:00'),
      selectedDropOff: makePoint('Da Nang', '12:00'),
      outboundState: null,
      returnState: null,
    }, translate);

    expect(model?.statusTitle).toBe('booking.ticket.confirmed');
    expect(model?.statusMessage).toBe('booking.ticket.showReferenceWhenBoarding');
    expect(model?.isPendingPayment).toBe(false);
    expect(model?.legs[0].ticketEntries?.[0]?.status).toBe('ISSUED');
    expect(canShowBoardingQr(model?.legs[0].ticketEntries?.[0]?.status, model?.isPendingPayment))
      .toBe(true);
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

const historyItem: PassengerTicketHistoryItem = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  code: 'BK-HIST-01',
  tripId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  createdAt: '2026-08-01T03:00:00.000Z',
  totalAmount: 250_000,
  originName: 'Ha Noi',
  destinationName: 'Da Nang',
  departureDateTime: '2026-08-10T01:00:00.000Z',
  estimatedArrivalTime: '2026-08-10T09:00:00.000Z',
  paymentRedirectUrl: null,
  trackingTarget: { kind: 'STATION', stationId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' },
  type: 'TICKET',
  status: 'CONFIRMED',
  ticket: {
    bookingGroupId: null,
    tripDirection: 'OUTBOUND',
    routeName: 'Ha Noi - Da Nang Express',
    pickupPoint: {
      type: 'STOP',
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      displayName: 'Central pickup',
      address: '12 Central Street',
      plannedAt: '2026-08-10T02:00:00.000Z',
    },
    dropoffPoint: {
      type: 'STATION',
      id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      displayName: 'Riverside station',
      address: null,
      plannedAt: '2026-08-10T08:00:00.000Z',
    },
    tickets: [{
      ticketId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      ticketCode: 'VR-TICKET-1',
      seatNumber: 'A01',
      status: 'ISSUED',
      paidAmount: 250_000,
    }],
    vehicle: {
      licensePlate: '51B-123.45',
      vehicleType: {
        code: 'LIMOUSINE',
        displayName: 'Limousine',
      },
    },
    shuttleRequests: [],
  },
  parcel: null,
};

describe('passenger history ticket view model', () => {
  it('uses booked point snapshots and keeps route metadata secondary', () => {
    const model = buildPassengerHistoryTicketViewModel(historyItem);

    expect(model.bookingStatus).toBe('CONFIRMED');
    expect(model.createdAtLabel).toBeTruthy();
    expect(model.isPendingPayment).toBe(false);
    expect(model.legs[0]).toMatchObject({
      reference: 'BK-HIST-01',
      ticketReferences: 'VR-TICKET-1',
      boardingName: 'Central pickup',
      boardingAddress: '12 Central Street',
      alightingName: 'Riverside station',
      routeName: 'Ha Noi - Da Nang Express',
      busType: 'Limousine',
      licensePlate: '51B-123.45',
      boardingUsesRouteEndpoint: false,
      alightingUsesRouteEndpoint: false,
      trackingEnabled: true,
      ticketEntries: [{
        ticketCode: 'VR-TICKET-1',
        seatNumber: 'A01',
        status: 'ISSUED',
        paidAmount: 250_000,
      }],
    });
    expect(model.legs[0].reference).not.toBe(
      model.legs[0].ticketEntries?.[0]?.ticketCode,
    );
    expect(model.legs[0].boardingAddress).toBe('12 Central Street');
    expect(model.legs[0].alightingAddress).toBeUndefined();
  });

  it('uses route endpoints when legacy booked points are absent', () => {
    const model = buildPassengerHistoryTicketViewModel({
      ...historyItem,
      ticket: {
        ...historyItem.ticket,
        pickupPoint: null,
        dropoffPoint: null,
      },
    }, key => key);

    expect(model.legs[0]).toMatchObject({
      boardingName: historyItem.originName,
      alightingName: historyItem.destinationName,
      boardingUsesRouteEndpoint: true,
      alightingUsesRouteEndpoint: true,
    });
  });

  it('maps cancelled history status to a non-success pending-free presentation', () => {
    const model = buildPassengerHistoryTicketViewModel({
      ...historyItem,
      status: 'CANCELLED',
      ticket: {
        ...historyItem.ticket,
        tickets: [{
          ...historyItem.ticket.tickets[0],
          status: 'CANCELLED',
        }],
      },
    });

    expect(model.isPendingPayment).toBe(false);
    expect(model.bookingStatus).toBe('CANCELLED');
    expect(model.legs[0].trackingEnabled).toBe(false);
  });

  it('replaces the stale checkout seat with the current operational seat', () => {
    const operationalHistoryItem: PassengerTicketHistoryItem = {
      ...historyItem,
      ticket: {
        ...historyItem.ticket,
        tickets: [{
          ...historyItem.ticket.tickets[0],
          seatNumber: 'A10',
        }],
      },
    };
    const staleResult = {
      bookingId: historyItem.id,
      bookingCode: historyItem.code,
      status: 'CONFIRMED' as const,
      totalAmount: 250_000,
      discountAmount: 0,
      paymentId: '99999999-9999-4999-8999-999999999999',
      paymentRedirectUrl: 'https://sandbox.vnpayment.vn/pay',
      tickets: [{
        ticketId: historyItem.ticket.tickets[0].ticketId,
        ticketCode: historyItem.ticket.tickets[0].ticketCode,
        seatNumber: 'A01',
        status: 'PENDING_PAYMENT',
        fareAmount: 250_000,
        discountAmount: 0,
        paidAmount: 0,
      }],
    };

    const hydrated = hydrateCheckoutBookingResultFromHistory(
      staleResult,
      [operationalHistoryItem],
    );

    expect(hydrated).toMatchObject({
      paymentRedirectUrl: null,
      tickets: [{
        seatNumber: 'A10',
        status: 'ISSUED',
        paidAmount: 250_000,
      }],
      vehicle: historyItem.ticket.vehicle,
    });
  });

  it('clears the stale checkout seat while operational assignment is pending', () => {
    const unresolvedHistoryItem: PassengerTicketHistoryItem = {
      ...historyItem,
      ticket: {
        ...historyItem.ticket,
        tickets: [{
          ...historyItem.ticket.tickets[0],
          seatNumber: null,
        }],
      },
    };
    const staleResult = {
      bookingId: historyItem.id,
      bookingCode: historyItem.code,
      status: 'CONFIRMED' as const,
      totalAmount: 250_000,
      discountAmount: 0,
      paymentId: null,
      paymentRedirectUrl: null,
      tickets: [{
        ticketId: historyItem.ticket.tickets[0].ticketId,
        ticketCode: historyItem.ticket.tickets[0].ticketCode,
        seatNumber: 'A01',
        status: 'ISSUED',
        fareAmount: 250_000,
        discountAmount: 0,
        paidAmount: 250_000,
      }],
    };

    const hydrated = hydrateCheckoutBookingResultFromHistory(
      staleResult,
      [unresolvedHistoryItem],
    );
    const model = buildCheckoutTicketViewModel({
      bookingResult: hydrated,
      paymentMethod: 'wallet',
      selectedTrip: outboundTrip,
      selectedPickUp: makePoint('Ha Noi', '08:00'),
      selectedDropOff: makePoint('Da Nang', '12:00'),
      outboundState: null,
      returnState: null,
    }, key => (
      key === 'history.seatPendingAssignment'
        ? 'Pending seat assignment'
        : key
    ));

    expect(hydrated).toMatchObject({
      tickets: [{ seatNumber: null }],
    });
    expect(model?.legs[0].seatNumbers).toBe('Pending seat assignment');
    expect(model?.legs[0].ticketEntries?.[0]?.seatNumber)
      .toBe('Pending seat assignment');
    expect(model?.legs[0].seatNumbers).not.toContain('A01');
  });

  it('renders an unresolved operational seat without falling back to the issued seat', () => {
    const model = buildPassengerHistoryTicketViewModel({
      ...historyItem,
      ticket: {
        ...historyItem.ticket,
        tickets: [{
          ...historyItem.ticket.tickets[0],
          seatNumber: null,
        }],
      },
    }, (key) => (
      key === 'history.seatPendingAssignment'
        ? 'Pending seat assignment'
        : key
    ));

    expect(model.legs[0].seatNumbers).toBe('Pending seat assignment');
    expect(model.legs[0].ticketEntries?.[0]?.seatNumber)
      .toBe('Pending seat assignment');
    expect(model.legs[0].seatNumbers).not.toContain('A01');
  });

  it('preserves ordered active and cancelled shuttle requests for history detail', () => {
    const shuttleRequests = [
      {
        direction: 'INBOUND_TO_STATION' as const,
        address: '12 Nguyen Trai, Ha Noi',
        latitude: 21.0285,
        longitude: 105.8542,
        roadDistanceMeters: 3_200,
        isActive: true,
        requestedAt: '2026-08-01T03:01:00.000Z',
        cancelledAt: null,
      },
      {
        direction: 'OUTBOUND_FROM_STATION' as const,
        address: '45 Bach Dang, Da Nang',
        latitude: 16.0544,
        longitude: 108.2022,
        roadDistanceMeters: 2_100,
        isActive: false,
        requestedAt: '2026-08-01T03:02:00.000Z',
        cancelledAt: '2026-08-01T03:05:00.000Z',
      },
    ];
    const model = buildPassengerHistoryTicketViewModel({
      ...historyItem,
      ticket: {
        ...historyItem.ticket,
        shuttleRequests,
      },
    });

    expect(model.legs[0].shuttleRequests).toEqual(shuttleRequests);
  });
});

describe('boarding QR eligibility', () => {
  it('allows ISSUED/ACTIVE codes and blocks inactive lifecycle states', () => {
    expect(canShowBoardingQr('ISSUED')).toBe(true);
    expect(canShowBoardingQr('ACTIVE')).toBe(true);
    expect(canShowBoardingQr(undefined)).toBe(true);
    expect(canShowBoardingQr('USED')).toBe(false);
    expect(canShowBoardingQr('EXPIRED')).toBe(false);
    expect(canShowBoardingQr('ISSUED', true)).toBe(false);
  });
});
