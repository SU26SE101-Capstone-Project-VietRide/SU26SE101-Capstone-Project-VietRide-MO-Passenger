import { z } from 'zod';

const uuidParamsSchema = (key: 'bookingId' | 'tripId' | 'parcelId' | 'shuttleTripId') => (
  z.object({ [key]: z.string().uuid() }).strict()
);

const emptyParamsSchema = z.object({}).strict();

/** Shuttle tracking may include bookingId when BE embeds it in action.params. */
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
    return parseNotificationAction({
      type: data.actionType,
      params: JSON.parse(data.actionParams) as unknown,
    });
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
    case 'OPEN_SHUTTLE_TRACKING':
      return {
        type: 'shuttle-tracking',
        shuttleTripId: action.params.shuttleTripId,
        ...(action.params.bookingId ? { bookingId: action.params.bookingId } : {}),
      };
    case 'OPEN_CREW_TRIP_BOOKING':
    case 'OPEN_TRIP_DETAIL':
    case 'OPEN_SUBSCRIPTION':
    case 'NONE':
      return null;
  }
};
