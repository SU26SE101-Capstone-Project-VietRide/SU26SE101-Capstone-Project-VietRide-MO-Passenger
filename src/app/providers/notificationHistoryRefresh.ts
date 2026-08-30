const BOOKING_HISTORY_REFRESH_NOTIFICATION_TYPES: ReadonlySet<string> = new Set([
  'BOOKING_CONFIRMED',
  'BOOKING_CREATED',
  'BOOKING_CANCELLED',
  'BOOKING_REFUNDED',
  'VEHICLE_SUBSTITUTED',
]);

export const shouldRefreshPassengerBookingHistory = (
  notificationType: string,
): boolean => BOOKING_HISTORY_REFRESH_NOTIFICATION_TYPES.has(notificationType);
