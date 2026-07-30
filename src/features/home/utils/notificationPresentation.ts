import type { TFunction } from 'i18next';

import { formatShortDate } from '@shared/utils/format';

export type NotificationKind = 'trip' | 'parcel' | 'promo' | 'notification';

export const getNotificationKind = (type: string): NotificationKind => {
  if (type.startsWith('PARCEL_')) return 'parcel';
  if (type.includes('VOUCHER') || type.includes('SUBSCRIPTION')) return 'promo';
  if (type.startsWith('BOOKING_') || type.startsWith('TRIP_') || type.startsWith('STOP_')) {
    return 'trip';
  }

  return 'notification';
};

export const formatNotificationRelativeTime = (
  dateLike: string,
  t: TFunction,
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
    : formatShortDate(date);
};
