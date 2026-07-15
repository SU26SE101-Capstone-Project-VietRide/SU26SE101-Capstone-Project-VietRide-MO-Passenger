/**
 * Booking history fixtures used only by the explicit demo provider.
 *
 * The backend baseline does not expose a passenger booking-history/detail
 * contract yet. Production must therefore render an unavailable state instead
 * of calling `/bookings/history` or treating `/bookings/:id` as ticket detail.
 */
import type { BookingHistoryItem } from '../types/booking';

export interface BookingHistoryTicketDetail extends BookingHistoryItem {
  ticketCode: string;
  seatNumbers: string[];
  busTypeLabel: string;
  paymentMethod: 'WALLET' | 'VNPAY';
  pickup: {
    name: string;
    address: string;
    time: string;
    stopId?: string;
  };
  dropoff: {
    name: string;
    address: string;
    time: string;
    stopId?: string;
  };
}

export const BOOKING_HISTORY_TICKET_FIXTURE: BookingHistoryTicketDetail[] = [
  {
    id: '7d4a7b36-9945-4e21-8c47-d0a9406a4031',
    bookingCode: 'VR-DEMO-001',
    ticketCode: 'VRT-DEMO-001',
    tripId: '11111111-1111-4111-8111-111111111111',
    originStationName: 'Ben xe Mien Dong (DEMO)',
    destinationStationName: 'Ben xe Da Lat (DEMO)',
    departureDateTime: '2026-07-20T07:30:00+07:00',
    status: 'CONFIRMED',
    totalAmount: 285000,
    seatNumbers: ['A01', 'A02'],
    busTypeLabel: 'Limousine',
    paymentMethod: 'VNPAY',
    pickup: {
      name: 'Ben xe Mien Dong',
      address: '292 Dinh Bo Linh, Binh Thanh, Ho Chi Minh City',
      time: '07:30',
      stopId: '33333333-3333-4333-8333-333333333333',
    },
    dropoff: {
      name: 'Ben xe Da Lat',
      address: '01 To Hien Thanh, Da Lat, Lam Dong',
      time: '14:00',
      stopId: '22222222-2222-4222-8222-222222222222',
    },
  },
  {
    id: '1c163ec7-efc6-4c39-895c-dfe2088cad3e',
    bookingCode: 'VR-DEMO-002',
    ticketCode: 'VRT-DEMO-002',
    tripId: '44444444-4444-4444-8444-444444444444',
    originStationName: 'Ben xe Giap Bat (DEMO)',
    destinationStationName: 'Ben xe Nuoc Ngam (DEMO)',
    departureDateTime: '2026-07-10T14:00:00+07:00',
    status: 'COMPLETED',
    totalAmount: 120000,
    seatNumbers: ['B05'],
    busTypeLabel: 'Standard',
    paymentMethod: 'WALLET',
    pickup: {
      name: 'Ben xe Giap Bat',
      address: 'Giai Phong, Hoang Mai, Ha Noi',
      time: '14:00',
    },
    dropoff: {
      name: 'Ben xe Nuoc Ngam',
      address: 'Ngoc Hoi, Hoang Mai, Ha Noi',
      time: '15:15',
    },
  },
  {
    id: 'cef65c17-795b-4d9d-8eb2-5bf2dc7a4bc1',
    bookingCode: 'VR-DEMO-003',
    ticketCode: 'VRT-DEMO-003',
    tripId: '55555555-5555-4555-8555-555555555555',
    originStationName: 'Ben xe An Suong (DEMO)',
    destinationStationName: 'Ben xe Can Tho (DEMO)',
    departureDateTime: '2026-06-28T06:00:00+07:00',
    status: 'CANCELLED',
    totalAmount: 195000,
    seatNumbers: ['C08'],
    busTypeLabel: 'Sleeper',
    paymentMethod: 'VNPAY',
    pickup: {
      name: 'Ben xe An Suong',
      address: 'Quoc lo 22, Hoc Mon, Ho Chi Minh City',
      time: '06:00',
    },
    dropoff: {
      name: 'Ben xe Can Tho',
      address: 'Quoc lo 1A, Cai Rang, Can Tho',
      time: '09:30',
    },
  },
];

export const BOOKING_HISTORY_FIXTURE: BookingHistoryItem[] =
  BOOKING_HISTORY_TICKET_FIXTURE.map((detail) => ({
    id: detail.id,
    bookingCode: detail.bookingCode,
    tripId: detail.tripId,
    originStationName: detail.originStationName,
    destinationStationName: detail.destinationStationName,
    departureDateTime: detail.departureDateTime,
    status: detail.status,
    totalAmount: detail.totalAmount,
  }));

export function getBookingHistoryTicketFixture(
  bookingId: string,
): BookingHistoryTicketDetail | undefined {
  return BOOKING_HISTORY_TICKET_FIXTURE.find((detail) => detail.id === bookingId);
}
