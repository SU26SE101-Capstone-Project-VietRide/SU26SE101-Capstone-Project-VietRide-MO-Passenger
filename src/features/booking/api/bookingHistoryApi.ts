import { z } from 'zod';

import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import { apiInstantSchema, assertApiInstantRange } from '@shared/utils/apiTime';
import { isTrustedPaymentRedirectUrl } from '@shared/utils/url';
import type {
  BookingHistoryShuttleRequest,
  PassengerHistoryPage,
  PassengerTicketHistoryItem,
  PassengerTicketStatus,
} from '@features/profile/types';

const PAGE_SIZE_MAX = 100;
const moneySchema = z.number().int().nonnegative().safe();
const statusSchema = z.string().trim().min(1).max(100);
const nullableTextSchema = z.string().trim().max(500).nullable();
const nullableUuidSchema = z.string().uuid().nullable();

export const bookingHistoryShuttleRequestSchema = z.object({
  direction: z.enum(['INBOUND_TO_STATION', 'OUTBOUND_FROM_STATION']),
  address: z.string().trim().min(1).max(1_000),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  roadDistanceMeters: z.number().int().nonnegative().nullable(),
  isActive: z.boolean(),
  requestedAt: apiInstantSchema,
  cancelledAt: apiInstantSchema.nullable(),
});

const bookingHistoryItemSchema = z.object({
  bookingId: z.string().uuid(),
  bookingCode: z.string().trim().min(1).max(100),
  tripId: z.string().uuid(),
  status: statusSchema,
  createdAt: apiInstantSchema,
  totalAmount: moneySchema,
  originName: nullableTextSchema,
  destinationName: nullableTextSchema,
  departureDateTime: apiInstantSchema.nullable(),
  bookingGroupId: nullableUuidSchema,
  tripDirection: z.enum(['OUTBOUND', 'RETURN']).nullable(),
  routeName: nullableTextSchema,
  tickets: z.array(z.object({
    ticketId: z.string().uuid(),
    ticketCode: z.string().trim().min(1).max(100),
    seatNumber: z.string().trim().min(1).max(50),
    status: statusSchema,
    paidAmount: moneySchema,
  })),
  dropoffStationId: nullableUuidSchema.optional().default(null),
  dropoffStopId: nullableUuidSchema.optional().default(null),
  vehicle: z.object({
    licensePlate: z.string().trim().min(1).max(50),
    vehicleType: z.object({
      code: z.string().trim().min(1).max(50),
      displayName: z.string().trim().min(1).max(200),
    }).nullable(),
  }).nullable().optional().default(null),
  paymentRedirectUrl: z.string()
    .trim()
    .min(1)
    .max(2_048)
    .url()
    .refine(isTrustedPaymentRedirectUrl)
    .nullable()
    .optional()
    .default(null),
  // Rolling deploy compatibility: older BE versions omit this field; normalize to [].
  shuttleRequests: z.array(bookingHistoryShuttleRequestSchema)
    .optional()
    .default([]),
});

const bookingHistoryPageSchema = z.object({
  items: z.array(bookingHistoryItemSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(PAGE_SIZE_MAX),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export interface BookingHistoryQuery {
  status?: PassengerTicketStatus;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export const bookingHistoryKeys = {
  root: ['bookings', 'history'] as const,
  user: (userId: string) => [...bookingHistoryKeys.root, userId] as const,
  list: (userId: string, query: Omit<BookingHistoryQuery, 'page'>) => [
    ...bookingHistoryKeys.user(userId),
    query.status ?? 'all',
    query.from ?? 'any-from',
    query.to ?? 'any-to',
    query.pageSize ?? 10,
  ] as const,
};

const mapShuttleRequests = (
  requests: z.infer<typeof bookingHistoryShuttleRequestSchema>[],
): BookingHistoryShuttleRequest[] => requests;

export const parseBookingHistoryPage = (
  value: unknown,
): PassengerHistoryPage<PassengerTicketHistoryItem> => {
  const page = bookingHistoryPageSchema.parse(value);
  return {
    ...page,
    items: page.items.map((item): PassengerTicketHistoryItem => ({
      id: item.bookingId,
      code: item.bookingCode,
      tripId: item.tripId,
      type: 'TICKET',
      status: item.status,
      createdAt: item.createdAt,
      totalAmount: item.totalAmount,
      originName: item.originName,
      destinationName: item.destinationName,
      departureDateTime: item.departureDateTime,
      estimatedArrivalTime: null,
      paymentRedirectUrl: item.paymentRedirectUrl,
      trackingTarget: item.dropoffStopId
        ? { kind: 'STOP', stopId: item.dropoffStopId }
        : item.dropoffStationId
          ? { kind: 'STATION', stationId: item.dropoffStationId }
          : null,
      ticket: {
        bookingGroupId: item.bookingGroupId,
        tripDirection: item.tripDirection,
        routeName: item.routeName,
        tickets: item.tickets,
        vehicle: item.vehicle,
        shuttleRequests: mapShuttleRequests(item.shuttleRequests),
      },
      parcel: null,
    })),
  };
};

export async function getBookingHistory(
  query: BookingHistoryQuery = {},
  signal?: AbortSignal,
): Promise<PassengerHistoryPage<PassengerTicketHistoryItem>> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  if (!Number.isInteger(page) || page < 1) {
    throw new Error('Booking history page must be positive.');
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > PAGE_SIZE_MAX) {
    throw new Error('Booking history pageSize is out of range.');
  }
  assertApiInstantRange(
    { from: query.from, to: query.to },
    { allowEqual: false, label: 'Booking history range' },
  );

  const response = await apiClient.get<ApiEnvelope<unknown>>('/bookings/history', {
    params: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.from ? { from: query.from } : {}),
      ...(query.to ? { to: query.to } : {}),
      page,
      pageSize,
    },
    ...(signal ? { signal } : {}),
  });
  return parseBookingHistoryPage(unwrapApiResponse(response.data));
}
