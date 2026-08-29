import type { TFunction } from 'i18next';
import en from '@shared/i18n/locales/en.json';
import vi from '@shared/i18n/locales/vi.json';

import {
  localizeNotificationCode,
  localizeNotificationCopy,
  replaceNotificationCodes,
} from './notificationCopy';

const translations: Record<string, string> = {
  'notification.codes.CHECK_IN': 'Check-in',
  'notification.codes.CHECKED_IN': 'Checked in',
  'notification.codes.CHECK_IN_TIMEOUT': 'Missed the check-in deadline',
  'notification.codes.PICKED_UP': 'Picked up',
  'notification.codes.ACTIVE': 'Active',
  'notification.codes.DRIVER': 'The driver',
  'notification.codes.unknown': 'An updated status',
  'notification.refs.yourTicket': 'your ticket',
  'notification.refs.yourParcel': 'your parcel',
  'notification.refs.yourTrip': 'your trip',
  'notification.refs.vehicle': 'the assigned vehicle',
  'notification.refs.unspecifiedReason': 'no reason was provided',
  'notification.refs.pickupHint': ' (stop {{pickupOrder}})',
  'notification.refs.refundHint': ' Amount: {{amount}} VND.',
  'notification.types.SHUTTLE_PICKED_UP.title': 'Shuttle picked you up',
  'notification.types.SHUTTLE_PICKED_UP.body': 'The shuttle has picked you up.',
  'notification.types.SHUTTLE_STARTED.title': 'Shuttle trip started',
  'notification.types.SHUTTLE_STARTED.body': 'Your shuttle is on the way. Open tracking.',
  'notification.types.SHUTTLE_REASSIGNED.title': 'Shuttle assignment updated',
  'notification.types.SHUTTLE_REASSIGNED.body': 'Open tracking for the latest details.',
  'notification.types.PARCEL_REJECTED.title': 'Parcel rejected',
  'notification.types.PARCEL_REJECTED.body': '{{parcelRef}} was rejected. Reason: {{reason}}.',
  'notification.types.TRIP_ASSIGNMENT_START_BLOCKED.title': 'Trip could not start',
  'notification.types.TRIP_ASSIGNMENT_START_BLOCKED.body':
    '{{role}} is still {{status}} on another trip. Resolve the assignment before trying again.',
  'notification.types.BOOKING_CONFIRMED.title': 'Booking confirmed',
  'notification.types.BOOKING_CONFIRMED.body': 'Ticket {{bookingRef}} has been confirmed.',
  'notification.types.VEHICLE_SUBSTITUTED.title': 'Replacement vehicle assigned',
  'notification.types.VEHICLE_SUBSTITUTED.body':
    'A replacement vehicle has been assigned to {{routeName}} ({{licensePlate}}).',
};

const translate = ((key: string, options?: Record<string, string>) => {
  const template = translations[key] ?? key;
  if (!options) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => options[name] ?? '');
}) as TFunction;

describe('notificationCopy', () => {
  it('translates BE status and reason codes instead of showing raw enums', () => {
    expect(localizeNotificationCode('CHECK_IN', translate)).toBe('Check-in');
    expect(localizeNotificationCode('checked_in', translate)).toBe('Checked in');
    expect(replaceNotificationCodes(
      'Cập nhật trung chuyển: PICKED_UP. Lý do: CHECK_IN_TIMEOUT.',
      translate,
    )).toBe('Cập nhật trung chuyển: Picked up. Lý do: Missed the check-in deadline.');
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


  it.each([
    {
      type: 'SHUTTLE_STARTED',
      title: 'Shuttle trip started',
      body: 'Your shuttle is on the way. Open tracking.',
    },
    {
      type: 'SHUTTLE_REASSIGNED',
      title: 'Shuttle assignment updated',
      body: 'Open tracking for the latest details.',
    },
  ])('uses locale-owned copy for $type', ({ type, title, body }) => {
    expect(localizeNotificationCopy({
      type,
      title: 'Thông báo từ máy chủ',
      body: 'Nội dung từ máy chủ',
    }, translate)).toEqual({ title, body });
  });

  it('defines the two new notification types in both EN and VI locales', () => {
    expect(en.notification.types.SHUTTLE_STARTED).toEqual({
      title: 'Shuttle trip started',
      body: 'Your shuttle is on the way. Open tracking for live location and ETA.',
    });
    expect(en.notification.types.SHUTTLE_REASSIGNED.title).toBe('Shuttle assignment updated');
    expect(vi.notification.types.SHUTTLE_STARTED).toEqual({
      title: 'Xe trung chuyển đã xuất phát',
      body: 'Xe trung chuyển đang di chuyển. Mở theo dõi để xem vị trí và thời gian dự kiến.',
    });
    expect(vi.notification.types.SHUTTLE_REASSIGNED.title)
      .toBe('Thông tin xe trung chuyển đã thay đổi');
  });

  it('localizes parcel rejection reasons such as CHECK_IN_TIMEOUT', () => {
    expect(localizeNotificationCopy({

      type: 'PARCEL_REJECTED',
      title: 'Đơn gửi hàng bị từ chối',
      body: 'Đơn VRP-1 đã CHECK_IN_TIMEOUT.',
      data: { parcelCode: 'VRP-1', reason: 'CHECK_IN_TIMEOUT' },
    }, translate)).toEqual({
      title: 'Parcel rejected',
      body: 'VRP-1 was rejected. Reason: Missed the check-in deadline.',
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
      body: 'The driver is still Active on another trip. Resolve the assignment before trying again.',
    });
  });

  it('reads the replacement plate from the booking-transferred payload', () => {
    expect(localizeNotificationCopy({
      type: 'VEHICLE_SUBSTITUTED',
      title: 'Xe thay thế đã được sắp xếp',
      body: 'Nội dung do BE lưu',
      data: { newVehiclePlateNumber: '51B-123.45' },
    }, translate)).toEqual({
      title: 'Replacement vehicle assigned',
      body: 'A replacement vehicle has been assigned to your trip (51B-123.45).',
    });
  });

  it('falls back to token replacement for unknown types and keeps booking codes', () => {
    expect(localizeNotificationCopy({
      type: 'FUTURE_OPERATOR_NOTICE',
      title: 'Cập nhật: CHECK_IN',
      body: 'Vé #VR-1 chuyển sang CHECKED_IN.',
    }, translate)).toEqual({
      title: 'Cập nhật: Check-in',
      body: 'Vé #VR-1 chuyển sang Checked in.',
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
