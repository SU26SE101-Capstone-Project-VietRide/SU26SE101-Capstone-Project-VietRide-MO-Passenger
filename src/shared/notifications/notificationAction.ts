import { z } from 'zod';

import { isUuid } from '@shared/utils/pathSegment';

const uuidParamsSchema = (key: 'bookingId' | 'tripId' | 'parcelId' | 'shuttleTripId') => (
  z.object({ [key]: z.string().uuid() }).strict()
);

const emptyParamsSchema = z.object({}).strict();

/** Shuttle tracking may include bookingId so multi-pickup passengers open the right stop. */
const openShuttleTrackingParamsSchema = z.object({
  shuttleTripId: z.string().uuid(),
  bookingId: z.string().uuid().optional(),
}).strict();

export const notificationActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('OPEN_BOOKING_DETAIL'),
    params: uuidParamsSchema('bookingId'),
  }).strict(),
  z.object({
    type: z.literal('OPEN_CREW_TRIP_BOOKING'),
    params: z.object({
      tripId: z.string().uuid(),
      bookingId: z.string().uuid(),
    }).strict(),
  }).strict(),
  z.object({
    type: z.literal('OPEN_TRIP_DETAIL'),
    params: uuidParamsSchema('tripId'),
  }).strict(),
  z.object({
    type: z.literal('OPEN_TRIP_TRACKING'),
    params: uuidParamsSchema('tripId'),
  }).strict(),
  z.object({
    type: z.literal('OPEN_PARCEL_DETAIL'),
    params: uuidParamsSchema('parcelId'),
  }).strict(),
  z.object({
    type: z.literal('OPEN_WALLET'),
    params: emptyParamsSchema,
  }).strict(),
  z.object({
    type: z.literal('OPEN_SUBSCRIPTION'),
    params: emptyParamsSchema,
  }).strict(),
  z.object({
    type: z.literal('OPEN_SHUTTLE_TRACKING'),
    params: openShuttleTrackingParamsSchema,
  }).strict(),
  z.object({
    type: z.literal('NONE'),
    params: emptyParamsSchema,
  }).strict(),
]);

export type NotificationAction = z.infer<typeof notificationActionSchema>;

export const NONE_NOTIFICATION_ACTION: NotificationAction = {
  type: 'NONE',
  params: {},
};

const readBookingIdFromUnknown = (value: unknown): string | undefined => {
  if (typeof value === 'string' && isUuid(value)) return value;
  return undefined;
};

/**
 * Prefer action.params.bookingId; fall back to notification/FCM data.bookingId
 * so existing SHUTTLE_ASSIGNED payloads still open the correct pickup before BE
 * starts embedding bookingId in OPEN_SHUTTLE_TRACKING.params.
 */
export const resolveShuttleTrackingBookingId = (
  action: NotificationAction,
  data?: unknown,
): string | undefined => {
  if (action.type !== 'OPEN_SHUTTLE_TRACKING') return undefined;
  if (action.params.bookingId) return action.params.bookingId;

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return readBookingIdFromUnknown((data as Record<string, unknown>).bookingId);
  }
  return undefined;
};

const withShuttleBookingId = (
  action: Extract<NotificationAction, { type: 'OPEN_SHUTTLE_TRACKING' }>,
  bookingId: string | undefined,
): Extract<NotificationAction, { type: 'OPEN_SHUTTLE_TRACKING' }> => {
  if (!bookingId || action.params.bookingId === bookingId) return action;
  return {
    type: 'OPEN_SHUTTLE_TRACKING',
    params: {
      shuttleTripId: action.params.shuttleTripId,
      bookingId,
    },
  };
};

/**
 * Treat notification actions as untrusted input. Invalid or future actions
 * deliberately degrade to the notification inbox instead of executing a
 * server-provided URI or guessing a route from legacy data.
 */
export const parseNotificationAction = (value: unknown): NotificationAction => {
  const parsed = notificationActionSchema.safeParse(value);
  return parsed.success ? parsed.data : NONE_NOTIFICATION_ACTION;
};

export const parseFcmNotificationAction = (
  data: Record<string, unknown> | null | undefined,
): NotificationAction => {
  if (!data || typeof data.actionType !== 'string' || typeof data.actionParams !== 'string') {
    return NONE_NOTIFICATION_ACTION;
  }

  try {
    const action = parseNotificationAction({
      type: data.actionType,
      params: JSON.parse(data.actionParams) as unknown,
    });
    if (action.type !== 'OPEN_SHUTTLE_TRACKING') return action;

    // FCM flattens notification.data (incl. bookingId) alongside actionParams.
    return withShuttleBookingId(action, resolveShuttleTrackingBookingId(action, data));
  } catch {
    return NONE_NOTIFICATION_ACTION;
  }
};

export type NotificationNavigationIntent =
  | { type: 'booking-history' }
  | { type: 'trip-tracking'; tripId: string }
  | { type: 'parcel-detail'; parcelId: string }
  | { type: 'wallet' }
  | { type: 'shuttle-tracking'; shuttleTripId: string; bookingId?: string };

/** Only Passenger routes with a validated, supported destination are exposed. */
export const getNotificationNavigationIntent = (
  action: NotificationAction,
  data?: unknown,
): NotificationNavigationIntent | null => {
  switch (action.type) {
    case 'OPEN_BOOKING_DETAIL':
      // Public BE currently has no exact passenger ticket-detail seam.
      return { type: 'booking-history' };
    case 'OPEN_TRIP_TRACKING':
      return { type: 'trip-tracking', tripId: action.params.tripId };
    case 'OPEN_PARCEL_DETAIL':
      return { type: 'parcel-detail', parcelId: action.params.parcelId };
    case 'OPEN_WALLET':
      return { type: 'wallet' };
    case 'OPEN_SHUTTLE_TRACKING': {
      const bookingId = resolveShuttleTrackingBookingId(action, data);
      return {
        type: 'shuttle-tracking',
        shuttleTripId: action.params.shuttleTripId,
        ...(bookingId ? { bookingId } : {}),
      };
    }
    case 'OPEN_CREW_TRIP_BOOKING':
    case 'OPEN_TRIP_DETAIL':
    case 'OPEN_SUBSCRIPTION':
    case 'NONE':
      return null;
  }
};
