import type { TFunction } from 'i18next';

import {
  localizeNotificationCode,
  localizeNotificationCopy,
  replaceNotificationCodes,
} from './notificationCopy';

const translations: Record<string, string> = {
  'notification.codes.CHECK_IN': 'check-in',
  'notification.codes.CHECKED_IN': 'checked in',
  'notification.codes.CHECK_IN_TIMEOUT': 'missed the check-in deadline',
  'notification.codes.PICKED_UP': 'picked up',
  'notification.codes.ACTIVE': 'active',
  'notification.codes.DRIVER': 'the driver',
  'notification.codes.unknown': 'an updated status',
  'notification.refs.yourTicket': 'your ticket',
  'notification.refs.yourParcel': 'your parcel',
  'notification.refs.yourTrip': 'your trip',
  'notification.refs.vehicle': 'the assigned vehicle',
  'notification.refs.unspecifiedReason': 'no reason was provided',
  'notification.refs.pickupHint': ' (stop {{pickupOrder}})',
  'notification.refs.refundHint': ' Amount: {{amount}} VND.',
  'notification.types.SHUTTLE_PICKED_UP.title': 'Shuttle picked you up',
  'notification.types.SHUTTLE_PICKED_UP.body': 'The shuttle has picked you up.',
  'notification.types.PARCEL_REJECTED.title': 'Parcel rejected',
  'notification.types.PARCEL_REJECTED.body': '{{parcelRef}} was rejected. Reason: {{reason}}.',
  'notification.types.TRIP_ASSIGNMENT_START_BLOCKED.title': 'Trip could not start',
  'notification.types.TRIP_ASSIGNMENT_START_BLOCKED.body':
    '{{role}} is still {{status}} on another trip. Resolve the assignment before trying again.',
  'notification.types.BOOKING_CONFIRMED.title': 'Booking confirmed',
  'notification.types.BOOKING_CONFIRMED.body': 'Ticket {{bookingRef}} has been confirmed.',
};

const translate = ((key: string, options?: Record<string, string>) => {
  const template = translations[key] ?? key;
  if (!options) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => options[name] ?? '');
}) as TFunction;

describe('notificationCopy', () => {
  it('translates BE status and reason codes instead of showing raw enums', () => {
    expect(localizeNotificationCode('CHECK_IN', translate)).toBe('check-in');
    expect(localizeNotificationCode('checked_in', translate)).toBe('checked in');
    expect(replaceNotificationCodes(
      'Cập nhật trung chuyển: PICKED_UP. Lý do: CHECK_IN_TIMEOUT.',
      translate,
    )).toBe('Cập nhật trung chuyển: picked up. Lý do: missed the check-in deadline.');
  });

  it('rebuilds shuttle lifecycle copy from the notification type', () => {
    expect(localizeNotificationCopy({
      type: 'SHUTTLE_PICKED_UP',
      title: 'Cập nhật trung chuyển: PICKED_UP',
      body: 'Trạng thái trung chuyển đã chuyển sang PICKED_UP.',
      data: { status: 'PICKED_UP' },
    }, translate)).toEqual({
      title: 'Shuttle picked you up',
      body: 'The shuttle has picked you up.',
    });
  });

  it('localizes parcel rejection reasons such as CHECK_IN_TIMEOUT', () => {
    expect(localizeNotificationCopy({
      type: 'PARCEL_REJECTED',
      title: 'Đơn gửi hàng bị từ chối',
      body: 'Đơn VRP-1 đã CHECK_IN_TIMEOUT.',
      data: { parcelCode: 'VRP-1', reason: 'CHECK_IN_TIMEOUT' },
    }, translate)).toEqual({
      title: 'Parcel rejected',
      body: 'VRP-1 was rejected. Reason: missed the check-in deadline.',
    });
  });

  it('localizes assignment-blocked role and ACTIVE status', () => {
    expect(localizeNotificationCopy({
      type: 'TRIP_ASSIGNMENT_START_BLOCKED',
      title: 'Không thể bắt đầu chuyến',
      body: 'DRIVER vẫn đang ACTIVE ở một chuyến khác.',
      data: { resourceRole: 'DRIVER', status: 'ACTIVE' },
    }, translate)).toEqual({
      title: 'Trip could not start',
      body: 'the driver is still active on another trip. Resolve the assignment before trying again.',
    });
  });

  it('falls back to token replacement for unknown types and keeps booking codes', () => {
    expect(localizeNotificationCopy({
      type: 'FUTURE_OPERATOR_NOTICE',
      title: 'Cập nhật: CHECK_IN',
      body: 'Vé #VR-1 chuyển sang CHECKED_IN.',
    }, translate)).toEqual({
      title: 'Cập nhật: check-in',
      body: 'Vé #VR-1 chuyển sang checked in.',
    });
  });

  it('uses a localized ticket fallback when bookingCode is missing', () => {
    expect(localizeNotificationCopy({
      type: 'BOOKING_CONFIRMED',
      title: 'Đặt vé thành công',
      body: 'Vé của bạn đã được xác nhận.',
    }, translate).body).toBe('Ticket your ticket has been confirmed.');
  });
});
