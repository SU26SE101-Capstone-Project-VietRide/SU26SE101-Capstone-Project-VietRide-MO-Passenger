import type { TFunction } from 'i18next';

import { getNotificationDataString } from './notificationPresentation';

/**
 * BE stores notification title/body as Vietnamese and interpolates raw enums
 * (`CHECK_IN`, `PICKED_UP`, `ACTIVE`, `DRIVER`, `CHECK_IN_TIMEOUT`).
 * Passenger displays a locale-owned sentence when the type is known, and
 * always replaces leftover allow-listed codes inside the remaining copy.
 */

const NOTIFICATION_CODE_KEYS = {
  CHECK_IN: 'notification.codes.CHECK_IN',
  CHECKED_IN: 'notification.codes.CHECKED_IN',
  CHECK_IN_TIMEOUT: 'notification.codes.CHECK_IN_TIMEOUT',
  FINAL_PAYMENT_TIMEOUT: 'notification.codes.FINAL_PAYMENT_TIMEOUT',
  AUTO_UNFULFILLED_CUTOFF: 'notification.codes.AUTO_UNFULFILLED_CUTOFF',
  PENDING_SEAT_ASSIGNMENT: 'notification.codes.PENDING_SEAT_ASSIGNMENT',
  CAPACITY_EXCEEDED: 'notification.codes.CAPACITY_EXCEEDED',
  PENDING_OPERATOR_REVIEW: 'notification.codes.PENDING_OPERATOR_REVIEW',
  PENDING_PAYMENT: 'notification.codes.PENDING_PAYMENT',
  PENDING: 'notification.codes.PENDING',
  PENDING_ADDITIONAL_PAYMENT: 'notification.codes.PENDING_ADDITIONAL_PAYMENT',
  RESERVED: 'notification.codes.RESERVED',
  PENDING_FINAL_PAYMENT: 'notification.codes.PENDING_FINAL_PAYMENT',
  READY_TO_LOAD: 'notification.codes.READY_TO_LOAD',
  LOADED: 'notification.codes.LOADED',
  IN_TRANSIT: 'notification.codes.IN_TRANSIT',
  PENDING_TRANSFER_CONFIRM: 'notification.codes.PENDING_TRANSFER_CONFIRM',
  TRANSFER_ESCALATED: 'notification.codes.TRANSFER_ESCALATED',
  UNLOADED: 'notification.codes.UNLOADED',
  DELIVERED_PENDING_CONFIRM: 'notification.codes.DELIVERED_PENDING_CONFIRM',
  DELIVERY_CONFIRMED: 'notification.codes.DELIVERY_CONFIRMED',
  DELIVERY_REJECTED: 'notification.codes.DELIVERY_REJECTED',
  RETURN_INITIATED: 'notification.codes.RETURN_INITIATED',
  RETURNED: 'notification.codes.RETURNED',
  PENDING_OPERATOR_ACTION: 'notification.codes.PENDING_OPERATOR_ACTION',
  PENDING_CONFIRM: 'notification.codes.PENDING_CONFIRM',
  CONFIRMED: 'notification.codes.CONFIRMED',
  COMPLETED: 'notification.codes.COMPLETED',
  CANCELLED: 'notification.codes.CANCELLED',
  REJECTED: 'notification.codes.REJECTED',
  EXPIRED: 'notification.codes.EXPIRED',
  REFUNDED: 'notification.codes.REFUNDED',
  DISRUPTED: 'notification.codes.DISRUPTED',
  DELAYED: 'notification.codes.DELAYED',
  NO_SHOW: 'notification.codes.NO_SHOW',
  PARTIAL_NO_SHOW: 'notification.codes.PARTIAL_NO_SHOW',
  SCHEDULED: 'notification.codes.SCHEDULED',
  BOARDING: 'notification.codes.BOARDING',
  IN_PROGRESS: 'notification.codes.IN_PROGRESS',
  PICKED_UP: 'notification.codes.PICKED_UP',
  DELIVERED: 'notification.codes.DELIVERED',
  ACTIVE: 'notification.codes.ACTIVE',
  INACTIVE: 'notification.codes.INACTIVE',
  DRIVER: 'notification.codes.DRIVER',
  ASSISTANT: 'notification.codes.ASSISTANT',
  VEHICLE: 'notification.codes.VEHICLE',
  INBOUND_TO_STATION: 'notification.codes.INBOUND_TO_STATION',
  OUTBOUND_FROM_STATION: 'notification.codes.OUTBOUND_FROM_STATION',
  WARNING_60: 'notification.codes.WARNING_60',
  WARNING_120: 'notification.codes.WARNING_120',
} as const;

type NotificationCode = keyof typeof NOTIFICATION_CODE_KEYS;

const NOTIFICATION_CODES = Object.keys(NOTIFICATION_CODE_KEYS) as NotificationCode[];

const NOTIFICATION_CODE_PATTERN = new RegExp(
  `\\b(?:${[...NOTIFICATION_CODES].sort((left, right) => right.length - left.length).join('|')})\\b`,
  'g',
);

const TYPED_NOTIFICATION_COPY = new Set([
  'BOOKING_CONFIRMED',
  'BOOKING_CREATED',
  'BOOKING_CANCELLED',
  'BOOKING_DISRUPTED',
  'BOOKING_REFUNDED',
  'PASSENGER_NO_SHOW',
  'TRIP_BOARDING_REMINDER',
  'TRIP_VEHICLE_APPROACHING',
  'TRIP_ROUTE_CHANGED',
  'TRIP_SCHEDULE_CHANGED',
  'TRIP_CANCELLED',
  'TRIP_DELAYED',
  'TRIP_DISRUPTED',
  'STOP_DISABLED',
  'VEHICLE_SUBSTITUTED',
  'VEHICLE_SWAPPED',
  'PARCEL_RESERVED',
  'PARCEL_LOADED',
  'PARCEL_IN_TRANSIT',
  'PARCEL_DELIVERED_PENDING_CONFIRM',
  'PARCEL_REJECTED',
  'PARCEL_RETURNED',
  'PARCEL_REVIEW_REQUESTED',
  'PARCEL_REVIEW_APPROVED',
  'PARCEL_FINAL_PAYMENT_REQUIRED',
  'PARCEL_SETTLEMENT_RECOVERED',
  'WALLET_CREDITED',
  'WALLET_DEBITED',
  'SHUTTLE_ASSIGNED',
  'SHUTTLE_STARTED',
  'SHUTTLE_REASSIGNED',
  'SHUTTLE_CANCELLED',
  'SHUTTLE_PICKED_UP',
  'SHUTTLE_DELIVERED',
  'SHUTTLE_NO_SHOW',
  'SHUTTLE_COMPLETED',
  'SHUTTLE_UNFULFILLED',
  'SHUTTLE_WARNING',
  'TRIP_ASSIGNMENT_START_BLOCKED',
  'DRIVER_STOP_DEPARTED_WITH_PENDING',
  'OFF_ROUTE_ALERT',
  'TRIP_DELAYED_ALERT',
]);

export const localizeNotificationCode = (
  value: string | undefined,
  translate: TFunction,
): string => {
  const token = value?.trim().toUpperCase();
  if (!token) return '';
  const key = NOTIFICATION_CODE_KEYS[token as NotificationCode];
  return key ? translate(key) : value?.trim() ?? '';
};

export const replaceNotificationCodes = (
  text: string,
  translate: TFunction,
): string =>
  text.replace(NOTIFICATION_CODE_PATTERN, (token) =>
    localizeNotificationCode(token, translate) || token,
  );

const readDataValue = (data: unknown, key: string): unknown => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;
  return (data as Record<string, unknown>)[key];
};

const readNestedString = (
  data: unknown,
  path: readonly string[],
): string | undefined => {
  let current: unknown = data;
  for (const segment of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === 'string' && current.trim() ? current.trim() : undefined;
};

export const formatMoneyAmount = (
  value: unknown,
  locale: string = 'vi',
): string => {
  let num: number | undefined;
  if (typeof value === 'number' && Number.isFinite(value)) {
    num = Math.trunc(value);
  } else if (typeof value === 'string') {
    const cleaned = value.replace(/[.,\s]/g, '').trim();
    if (/^\d+$/.test(cleaned)) {
      num = parseInt(cleaned, 10);
    }
  }
  if (num !== undefined) {
    try {
      return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN', {
        maximumFractionDigits: 0,
      }).format(num);
    } catch {
      return num.toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN');
    }
  }
  return '';
};

export const formatRawMoneyInText = (
  text: string,
  locale: string = 'vi',
): string =>
  text.replace(
    /\b(\d{4,})\s*(VND|đ|₫)\b/gi,
    (_, amountStr: string, currency: string) => {
      const num = parseInt(amountStr, 10);
      if (!Number.isFinite(num)) return `${amountStr} ${currency}`;
      const formatted = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN', {
        maximumFractionDigits: 0,
      }).format(num);
      return `${formatted} ${currency}`;
    },
  );

const formatTicketRef = (
  bookingCode: string | undefined,
  translate: TFunction,
): string => {
  const code = bookingCode?.trim();
  return code ? `#${code}` : translate('notification.refs.yourTicket');
};

const formatParcelRef = (
  parcelCode: string | undefined,
  translate: TFunction,
): string => {
  const code = parcelCode?.trim();
  return code ? code : translate('notification.refs.yourParcel');
};

export interface LocalizeNotificationCopyInput {
  type: string;
  title: string;
  body: string;
  data?: unknown;
}

export interface LocalizedNotificationCopy {
  title: string;
  body: string;
}

export const localizeNotificationCopy = (
  input: LocalizeNotificationCopyInput,
  translate: TFunction,
): LocalizedNotificationCopy => {
  const bookingCode = getNotificationDataString(input.data, 'bookingCode');
  const parcelCode = getNotificationDataString(input.data, 'parcelCode');
  const routeName = getNotificationDataString(input.data, 'routeName');
  const licensePlate = getNotificationDataString(input.data, 'licensePlate')
    ?? getNotificationDataString(input.data, 'newVehiclePlateNumber')
    ?? readNestedString(input.data, ['vehicle', 'licensePlate']);
  const pickupOrder = getNotificationDataString(input.data, 'pickupOrder')
    ?? (typeof readDataValue(input.data, 'pickupOrder') === 'number'
      ? String(readDataValue(input.data, 'pickupOrder'))
      : undefined);
  const status = localizeNotificationCode(
    getNotificationDataString(input.data, 'status')
      ?? getNotificationDataString(input.data, 'recoveredStatus'),
    translate,
  );
  const reason = localizeNotificationCode(
    getNotificationDataString(input.data, 'reason')
      ?? getNotificationDataString(input.data, 'cancellationReason'),
    translate,
  );
  const role = localizeNotificationCode(
    getNotificationDataString(input.data, 'resourceRole'),
    translate,
  );
  const rawAmount =
    readDataValue(input.data, 'amount')
    ?? readDataValue(input.data, 'amountVnd')
    ?? readDataValue(input.data, 'refundAmount')
    ?? readDataValue(input.data, 'payoutAmount')
    ?? readDataValue(input.data, 'payoutAmountVnd');
  let amountCandidate: unknown = rawAmount;
  if (amountCandidate === undefined && typeof input.body === 'string') {
    const match = input.body.match(/(\d[\d.,\s]*)\s*(?:VND|đ|₫)/i);
    if (match) {
      amountCandidate = match[1];
    }
  }
  const locale =
    (translate as unknown as { language?: string }).language?.startsWith('en')
      ? 'en'
      : 'vi';
  const amount = formatMoneyAmount(amountCandidate, locale);
  const hasClaim = Boolean(
    readDataValue(input.data, 'claimId')
    || readDataValue(input.data, 'payoutId'),
  );

  const interpolation = {
    bookingRef: formatTicketRef(bookingCode, translate),
    parcelRef: formatParcelRef(parcelCode, translate),
    routeName: routeName || translate('notification.refs.yourTrip'),
    licensePlate: licensePlate || translate('notification.refs.vehicle'),
    pickupOrder: pickupOrder ?? '',
    pickupHint: pickupOrder
      ? translate('notification.refs.pickupHint', { pickupOrder })
      : '',
    refundHint: amount
      ? translate('notification.refs.refundHint', { amount })
      : '',
    status: status || translate('notification.codes.unknown'),
    reason: reason || translate('notification.refs.unspecifiedReason'),
    role: role || translate('notification.codes.DRIVER'),
    amount: amount || '0',
  };

  if (TYPED_NOTIFICATION_COPY.has(input.type)) {
    if (input.type === 'WALLET_CREDITED' && hasClaim) {
      return {
        title: translate('notification.types.WALLET_CREDITED.claimTitle', interpolation),
        body: translate('notification.types.WALLET_CREDITED.claimBody', interpolation),
      };
    }
    return {
      title: translate(`notification.types.${input.type}.title`, interpolation),
      body: translate(`notification.types.${input.type}.body`, interpolation),
    };
  }

  return {
    title: replaceNotificationCodes(input.title, translate),
    body: formatRawMoneyInText(replaceNotificationCodes(input.body, translate), locale),
  };
};
