import {
  candidateSelectionKey,
  parseBookingPendingActionOpen,
  toResolveSelection,
} from './bookingPendingAction';

const BOOKING_ID = '11111111-1111-4111-8111-111111111111';
const ACTION_ID = '22222222-2222-4222-8222-222222222222';
const STOP_ID = '33333333-3333-4333-8333-333333333333';
const STATION_ID = '44444444-4444-4444-8444-444444444444';

describe('parseBookingPendingActionOpen', () => {
  it('opens a MEDIUM schedule-change required payload', () => {
    expect(parseBookingPendingActionOpen({
      bookingId: BOOKING_ID,
      pendingActionId: ACTION_ID,
      deadline: '2026-08-16T10:00:00+07:00',
      oldDeparture: '2026-08-20T08:00:00+07:00',
      newDeparture: '2026-08-20T12:00:00+07:00',
      severity: 'MEDIUM',
    })).toEqual({
      bookingId: BOOKING_ID,
      pendingActionId: ACTION_ID,
      reason: 'SCHEDULE_CHANGE',
      deadline: '2026-08-16T10:00:00+07:00',
      oldDeparture: '2026-08-20T08:00:00+07:00',
      newDeparture: '2026-08-20T12:00:00+07:00',
      severity: 'MEDIUM',
      refundPercent: 50,
      candidateStops: [],
    });
  });

  it('opens a MAJOR schedule realert and refunds 100 percent', () => {
    expect(parseBookingPendingActionOpen({
      bookingId: BOOKING_ID,
      pendingActionId: ACTION_ID,
      reason: 'SCHEDULE_CHANGE',
      severity: 'MAJOR',
      deadline: '2026-08-16T10:00:00+07:00',
    })?.refundPercent).toBe(100);
  });

  it('opens a route-change payload that already carries this booking\'s candidates', () => {
    const open = parseBookingPendingActionOpen({
      bookingId: BOOKING_ID,
      pendingActionId: ACTION_ID,
      reason: 'ROUTE_CHANGE',
      candidateStops: [
        {
          stopId: STOP_ID,
          stationId: null,
          stationName: 'Ben xe Mien Dong',
          sequence: 2,
          estimatedArrivalAt: '2026-08-20T09:00:00+07:00',
        },
        {
          stopId: null,
          stationId: STATION_ID,
          stationName: 'Ben xe An Suong',
          sequence: 1,
        },
      ],
    });

    expect(open?.reason).toBe('ROUTE_CHANGE');
    expect(open?.refundPercent).toBe(100);
    expect(open?.candidateStops.map((stop) => stop.stationName)).toEqual([
      'Ben xe An Suong',
      'Ben xe Mien Dong',
    ]);
    expect(toResolveSelection(open!.candidateStops[0]!)).toEqual({
      selectedStopId: null,
      selectedStationId: STATION_ID,
    });
    expect(candidateSelectionKey(open!.candidateStops[1]!)).toBe(`${STOP_ID}:`);
  });

  it('parses candidateStops when FCM flattened them as JSON', () => {
    const open = parseBookingPendingActionOpen({
      bookingId: BOOKING_ID,
      pendingActionId: ACTION_ID,
      reason: 'ROUTE_CHANGE',
      candidateStops: JSON.stringify([
        {
          stopId: STOP_ID,
          stationId: null,
          stationName: 'Ben xe Mien Dong',
          sequence: 1,
        },
      ]),
    });

    expect(open?.candidateStops).toHaveLength(1);
    expect(open?.candidateStops[0]?.stopId).toBe(STOP_ID);
  });

  it('ignores trip-level route-change data that has no pendingActionId', () => {
    expect(parseBookingPendingActionOpen({
      tripId: BOOKING_ID,
      affectedBookings: [{ bookingId: BOOKING_ID, candidateStops: [] }],
    })).toBeNull();
  });

  it('ignores auto-fallback and seat-reassignment snapshots', () => {
    expect(parseBookingPendingActionOpen({
      bookingId: BOOKING_ID,
      pendingActionId: ACTION_ID,
      originalStopId: STOP_ID,
      fallbackDestinationStationId: STATION_ID,
    })).toBeNull();
    expect(parseBookingPendingActionOpen({
      bookingId: BOOKING_ID,
      pendingActionId: ACTION_ID,
      reason: 'PENDING_SEAT_ASSIGNMENT',
      seatNumbers: ['A01'],
    })).toBeNull();
  });

  it('ignores informational schedule changes without a pending action', () => {
    expect(parseBookingPendingActionOpen({
      bookingId: BOOKING_ID,
      oldDeparture: '2026-08-20T08:00:00+07:00',
      newDeparture: '2026-08-20T09:00:00+07:00',
      severity: 'MINOR',
    })).toBeNull();
  });
});
