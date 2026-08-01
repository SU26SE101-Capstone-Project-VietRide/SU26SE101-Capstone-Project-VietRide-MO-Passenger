import type { TFunction } from 'i18next';
import { z } from 'zod';

import { formatShortDate } from '@shared/utils/format';
import { isUuid } from '@shared/utils/pathSegment';

export type NotificationKind =
  | 'trip'
  | 'shuttle'
  | 'parcel'
  | 'promo'
  | 'notification';

export const getNotificationKind = (type: string): NotificationKind => {
  if (type.startsWith('PARCEL_')) return 'parcel';
  if (type.startsWith('SHUTTLE_')) return 'shuttle';
  if (type.includes('VOUCHER') || type.includes('SUBSCRIPTION')) return 'promo';
  if (
    type.startsWith('BOOKING_')
    || type.startsWith('TRIP_')
    || type.startsWith('STOP_')
  ) {
    return 'trip';
  }

  return 'notification';
};

export const formatNotificationRelativeTime = (
  dateLike: string,
  t: TFunction,
  locale?: string,
): string => {
  const date = new Date(dateLike);
  const diffMs = Date.now() - date.getTime();

  if (Number.isNaN(date.getTime()) || diffMs < 0) return '';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return t('notification.time.now');
  if (minutes < 60) {
    return t('notification.time.minutesCompact', { count: minutes });
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return t('notification.time.hoursCompact', { count: hours });
  }

  const days = Math.floor(hours / 24);
  return days < 7
    ? t('notification.time.daysCompact', { count: days })
    : formatShortDate(date, locale);
};

export const getNotificationDataString = (
  data: unknown,
  key: string,
): string | undefined => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
};

const SHUTTLE_TRACKING_NOTIFICATION_TYPES = new Set(['SHUTTLE_ASSIGNED']);

const shuttleTrackingIntentSchema = z.object({
  shuttleTripId: z.string().uuid(),
  bookingId: z.string().uuid().optional(),
}).strict();

export type ShuttleTrackingNotificationIntent = z.infer<
  typeof shuttleTrackingIntentSchema
>;

/**
 * Creates a navigation intent from an allow-listed notification type and UUID
 * fields only. A server-provided deepLink is deliberately never executed.
 */
export const getShuttleTrackingNotificationIntent = ({
  type,
  data,
}: {
  type: string;
  data: unknown;
}): ShuttleTrackingNotificationIntent | null => {
  if (!SHUTTLE_TRACKING_NOTIFICATION_TYPES.has(type)) return null;

  const shuttleTripId = getNotificationDataString(data, 'shuttleTripId');
  if (!isUuid(shuttleTripId)) return null;

  const bookingId = getNotificationDataString(data, 'bookingId');
  const candidate = {
    shuttleTripId,
    ...(isUuid(bookingId) ? { bookingId } : {}),
  };
  const parsed = shuttleTrackingIntentSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
};
