import { z } from 'zod';

import { isUuid } from '@shared/utils/pathSegment';

const uuidParamsSchema = (key: 'bookingId' | 'tripId' | 'parcelId' | 'shuttleTripId') => (
  z.object({ [key]: z.string().uuid() }).strict()
);

const emptyParamsSchema = z.object({}).strict();

/**
 * Shuttle tracking params.
 * BE resolveNotificationAction currently only embeds shuttleTripId, while
 * bookingId lives on notification.data (and is flattened onto FCM data).
 * FE accepts optional bookingId in params for forward-compat + enriched opens.
 */
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
 * Prefer action.params.bookingId; fall back to notification/FCM data.bookingId.
 *
 * Why: one passenger can have two bookings on the same shuttleTripId with
 * different pickup addresses. passenger-context returns both ownPickups;
 * tracking must know which booking the notification was for.
 * BE currently only puts shuttleTripId in OPEN_SHUTTLE_TRACKING.params and
 * keeps bookingId on notification.data (also flattened into FCM data).
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

/**
 * Only Passenger routes with a validated, supported destination are exposed.
 * Optional `data` supplies bookingId for shuttle multi-pickup disambiguation
 * when action.params only has shuttleTripId (inbox REST notifications).
 */
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
