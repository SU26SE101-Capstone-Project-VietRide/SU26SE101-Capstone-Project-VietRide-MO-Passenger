import {
  getNotificationNavigationIntent,
  NONE_NOTIFICATION_ACTION,
  parseFcmNotificationAction,
  parseNotificationAction,
  resolveShuttleTrackingBookingId,
} from './notificationAction';

const BOOKING_ID = '92be9c75-9e7c-474f-b59f-d0255f8ff5a2';
const BOOKING_ID_B = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
const TRIP_ID = '2e030190-9a9a-45dd-b6f6-2d67082daf33';
const PARCEL_ID = 'e9ba16c8-cfbb-463b-b813-921e3e2f45c1';
const SHUTTLE_TRIP_ID = '2600f78d-f0ff-4f77-aa74-3feaa0f1133a';

describe('notification actions', () => {
  it.each([
    {
      type: 'OPEN_BOOKING_DETAIL',
      params: { bookingId: BOOKING_ID },
    },
    {
      type: 'OPEN_CREW_TRIP_BOOKING',
      params: { tripId: TRIP_ID, bookingId: BOOKING_ID },
    },
    {
      type: 'OPEN_TRIP_DETAIL',
      params: { tripId: TRIP_ID },
    },
    {
      type: 'OPEN_TRIP_TRACKING',
      params: { tripId: TRIP_ID },
    },
    {
      type: 'OPEN_PARCEL_DETAIL',
      params: { parcelId: PARCEL_ID },
    },
    { type: 'OPEN_WALLET', params: {} },
    { type: 'OPEN_SUBSCRIPTION', params: {} },
    {
      type: 'OPEN_SHUTTLE_TRACKING',
      params: { shuttleTripId: SHUTTLE_TRIP_ID },
    },
    {
      type: 'OPEN_SHUTTLE_TRACKING',
      params: { shuttleTripId: SHUTTLE_TRIP_ID, bookingId: BOOKING_ID },
    },
    { type: 'NONE', params: {} },
  ] as const)('keeps REST and FCM parsing in parity for $type', (action) => {
    expect(parseNotificationAction(action)).toEqual(action);
    expect(parseFcmNotificationAction({
      actionType: action.type,
      actionParams: JSON.stringify(action.params),
    })).toEqual(action);
  });

  it.each([
    undefined,
    null,
    { type: 'OPEN_BOOKING_DETAIL', params: { bookingId: 'invalid' } },
    { type: 'OPEN_WALLET', params: { deepLink: 'vietride://untrusted' } },
    { type: 'FUTURE_ACTION', params: {} },
    { type: 'NONE', params: {}, deepLink: 'vietride://untrusted' },
  ])('degrades malformed or unknown REST input to NONE', (value) => {
    expect(parseNotificationAction(value)).toEqual(NONE_NOTIFICATION_ACTION);
  });

  it.each([
    undefined,
    {},
    { actionType: 'OPEN_WALLET' },
    { actionType: 'OPEN_WALLET', actionParams: '{' },
    { actionType: 'UNKNOWN', actionParams: '{}' },
    {
      actionType: 'OPEN_TRIP_TRACKING',
      actionParams: JSON.stringify({ tripId: 'invalid' }),
    },
    {
      actionType: 'OPEN_WALLET',
      actionParams: JSON.stringify({ deepLink: 'vietride://untrusted' }),
    },
  ])('degrades malformed or unknown FCM input to NONE', (data) => {
    expect(parseFcmNotificationAction(data)).toEqual(NONE_NOTIFICATION_ACTION);
  });

  it('maps only Passenger-supported actions to allow-listed navigation intents', () => {
    expect(getNotificationNavigationIntent(parseNotificationAction({
      type: 'OPEN_BOOKING_DETAIL',
      params: { bookingId: BOOKING_ID },
    }))).toEqual({ type: 'booking-history' });
    expect(getNotificationNavigationIntent(parseNotificationAction({
      type: 'OPEN_TRIP_TRACKING',
      params: { tripId: TRIP_ID },
    }))).toEqual({ type: 'trip-tracking', tripId: TRIP_ID });
    expect(getNotificationNavigationIntent(parseNotificationAction({
      type: 'OPEN_PARCEL_DETAIL',
      params: { parcelId: PARCEL_ID },
    }))).toEqual({ type: 'parcel-detail', parcelId: PARCEL_ID });
    expect(getNotificationNavigationIntent(parseNotificationAction({
      type: 'OPEN_WALLET',
      params: {},
    }))).toEqual({ type: 'wallet' });
    expect(getNotificationNavigationIntent(parseNotificationAction({
      type: 'OPEN_SHUTTLE_TRACKING',
      params: { shuttleTripId: SHUTTLE_TRIP_ID },
    }))).toEqual({
      type: 'shuttle-tracking',
      shuttleTripId: SHUTTLE_TRIP_ID,
    });
    expect(getNotificationNavigationIntent(parseNotificationAction({
      type: 'OPEN_SHUTTLE_TRACKING',
      params: { shuttleTripId: SHUTTLE_TRIP_ID, bookingId: BOOKING_ID },
    }))).toEqual({
      type: 'shuttle-tracking',
      shuttleTripId: SHUTTLE_TRIP_ID,
      bookingId: BOOKING_ID,
    });

    expect(getNotificationNavigationIntent(parseNotificationAction({
      type: 'OPEN_TRIP_DETAIL',
      params: { tripId: TRIP_ID },
    }))).toBeNull();
    expect(getNotificationNavigationIntent(NONE_NOTIFICATION_ACTION)).toBeNull();
  });

  it('opens the pending-action screen from schedule-change notification data', () => {
    const ACTION_ID = '33333333-3333-4333-8333-333333333333';
    expect(getNotificationNavigationIntent(
      parseNotificationAction({
        type: 'OPEN_TRIP_DETAIL',
        params: { tripId: TRIP_ID },
      }),
      {
        bookingId: BOOKING_ID,
        pendingActionId: ACTION_ID,
        severity: 'MAJOR',
        deadline: '2026-08-16T10:00:00+07:00',
        oldDeparture: '2026-08-20T08:00:00+07:00',
        newDeparture: '2026-08-21T08:00:00+07:00',
      },
    )).toEqual({
      type: 'booking-pending-action',
      pendingAction: {
        bookingId: BOOKING_ID,
        pendingActionId: ACTION_ID,
        reason: 'SCHEDULE_CHANGE',
        severity: 'MAJOR',
        refundPercent: 100,
        deadline: '2026-08-16T10:00:00+07:00',
        oldDeparture: '2026-08-20T08:00:00+07:00',
        newDeparture: '2026-08-21T08:00:00+07:00',
        candidateStops: [],
      },
    });
  });

  it('enriches shuttle bookingId from FCM data when action.params omit it', () => {
    // Mirrors BE fcm-push.worker: actionParams only shuttleTripId, bookingId flattened.
    expect(parseFcmNotificationAction({
      actionType: 'OPEN_SHUTTLE_TRACKING',
      actionParams: JSON.stringify({ shuttleTripId: SHUTTLE_TRIP_ID }),
      bookingId: BOOKING_ID,
      shuttleTripId: SHUTTLE_TRIP_ID,
    })).toEqual({
      type: 'OPEN_SHUTTLE_TRACKING',
      params: {
        shuttleTripId: SHUTTLE_TRIP_ID,
        bookingId: BOOKING_ID,
      },
    });
  });

  it('resolves shuttle bookingId from notification data for inbox navigation', () => {
    const action = parseNotificationAction({
      type: 'OPEN_SHUTTLE_TRACKING',
      params: { shuttleTripId: SHUTTLE_TRIP_ID },
    });

    expect(resolveShuttleTrackingBookingId(action, { bookingId: BOOKING_ID }))
      .toBe(BOOKING_ID);
    expect(getNotificationNavigationIntent(action, {
      bookingId: BOOKING_ID,
      shuttleTripId: SHUTTLE_TRIP_ID,
    })).toEqual({
      type: 'shuttle-tracking',
      shuttleTripId: SHUTTLE_TRIP_ID,
      bookingId: BOOKING_ID,
    });
  });

  it('keeps distinct bookingIds for two bookings on the same shuttleTripId', () => {
    const action = parseNotificationAction({
      type: 'OPEN_SHUTTLE_TRACKING',
      params: { shuttleTripId: SHUTTLE_TRIP_ID },
    });

    const firstIntent = getNotificationNavigationIntent(action, {
      bookingId: BOOKING_ID,
      shuttleTripId: SHUTTLE_TRIP_ID,
    });
    expect(firstIntent?.type).toBe('shuttle-tracking');
    expect(firstIntent?.type === 'shuttle-tracking' ? firstIntent.bookingId : undefined)
      .toBe(BOOKING_ID);

    const secondIntent = getNotificationNavigationIntent(action, {
      bookingId: BOOKING_ID_B,
      shuttleTripId: SHUTTLE_TRIP_ID,
    });
    expect(secondIntent?.type).toBe('shuttle-tracking');
    expect(secondIntent?.type === 'shuttle-tracking' ? secondIntent.bookingId : undefined)
      .toBe(BOOKING_ID_B);

    expect(parseFcmNotificationAction({
      actionType: 'OPEN_SHUTTLE_TRACKING',
      actionParams: JSON.stringify({ shuttleTripId: SHUTTLE_TRIP_ID }),
      bookingId: BOOKING_ID_B,
    }).params).toEqual({
      shuttleTripId: SHUTTLE_TRIP_ID,
      bookingId: BOOKING_ID_B,
    });
  });

  it('prefers action.params.bookingId over data.bookingId', () => {
    const action = parseNotificationAction({
      type: 'OPEN_SHUTTLE_TRACKING',
      params: { shuttleTripId: SHUTTLE_TRIP_ID, bookingId: BOOKING_ID },
    });

    expect(resolveShuttleTrackingBookingId(action, { bookingId: BOOKING_ID_B }))
      .toBe(BOOKING_ID);
  });
});
