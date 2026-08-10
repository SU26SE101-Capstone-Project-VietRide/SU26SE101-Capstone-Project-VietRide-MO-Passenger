import { z } from 'zod';

import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import {
  apiInstantSchema,
  assertApiInstantRange,
} from '@shared/utils/apiTime';
import { isTrustedPaymentRedirectUrl } from '@shared/utils/url';
import type {
  PassengerHistoryItem,
  PassengerHistoryPage,
  PassengerHistoryQuery,
  PassengerHistoryQueryInput,
  PassengerHistoryType,
} from '../types';

export const PASSENGER_HISTORY_DEFAULT_PAGE_SIZE = 20;
export const PASSENGER_HISTORY_MAX_PAGE_SIZE = 100;

const rfc3339Schema = apiInstantSchema;

const nullableTextSchema = z.string().trim().max(500).nullable();
const moneySchema = z.number().int().nonnegative().safe();
const paymentRedirectUrlSchema = z.string()
  .trim()
  .min(1)
  .max(2_048)
  .url()
  .refine(
    isTrustedPaymentRedirectUrl,
    'Expected a trusted HTTPS VNPay redirect URL.',
  )
  .nullable()
  // v1.53 serializes null explicitly; this default keeps app/BE rolling
  // deploys compatible without weakening validation for a supplied URL.
  .default(null);

// Status tokens are intentionally forward-compatible. UI presentation only
// enables actions for explicit allow-lists, so a new BE enum remains visible
// as a neutral state instead of invalidating the entire History page.
const statusTokenSchema = z.string().trim().min(1).max(100)
  .regex(/^[A-Z0-9_]+$/, 'Invalid status token.');

/**
 * BE may serialize the inactive id as null (e.g. STOP with stationId:null).
 * Accept both ids as optional/nullable, enforce XOR, transform to clean union.
 */
const trackingTargetSchema = z.preprocess(
  (value) => (value === undefined ? null : value),
  z.union([
    z.null(),
    z.object({
      kind: z.enum(['STOP', 'STATION']),
      stopId: z.string().uuid().nullable().optional(),
      stationId: z.string().uuid().nullable().optional(),
    }),
  ]).superRefine((value, ctx) => {
    if (value === null) return;
    const stopId = value.stopId ?? null;
    const stationId = value.stationId ?? null;
    if (value.kind === 'STOP') {
      if (!stopId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['stopId'],
          message: 'STOP trackingTarget requires stopId.',
        });
      }
      if (stationId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['stationId'],
          message: 'STOP trackingTarget must not include stationId.',
        });
      }
      return;
    }
    if (!stationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['stationId'],
        message: 'STATION trackingTarget requires stationId.',
      });
    }
    if (stopId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['stopId'],
        message: 'STATION trackingTarget must not include stopId.',
      });
    }
  }).transform((value) => {
    if (value === null) return null;
    if (value.kind === 'STOP' && value.stopId) {
      return { kind: 'STOP' as const, stopId: value.stopId };
    }
    if (value.kind === 'STATION' && value.stationId) {
      return { kind: 'STATION' as const, stationId: value.stationId };
    }
    return null;
  }),
);

const baseHistoryItemShape = {
  id: z.string().uuid(),
  code: z.string().trim().min(1).max(100),
  tripId: z.string().uuid(),
  createdAt: rfc3339Schema,
  totalAmount: moneySchema,
  originName: nullableTextSchema,
  destinationName: nullableTextSchema,
  departureDateTime: rfc3339Schema.nullable(),
  estimatedArrivalTime: rfc3339Schema.nullable(),
  paymentRedirectUrl: paymentRedirectUrlSchema,
  trackingTarget: trackingTargetSchema,
} as const;

const ticketHistoryItemSchema = z.object({
  ...baseHistoryItemShape,
  type: z.literal('TICKET'),
  status: statusTokenSchema,
  ticket: z.object({
    bookingGroupId: z.string().uuid().nullable(),
    tripDirection: z.enum(['OUTBOUND', 'RETURN']).nullable(),
    routeName: nullableTextSchema,
    tickets: z.array(z.object({
      ticketId: z.string().uuid(),
      ticketCode: z.string().trim().min(1).max(100),
      seatNumber: z.string().trim().min(1).max(50),
      status: statusTokenSchema,
      paidAmount: moneySchema,
    })).max(5),
  }),
  parcel: z.null(),
});

const parcelHistoryItemSchema = z.object({
  ...baseHistoryItemShape,
  type: z.literal('PARCEL'),
  status: statusTokenSchema,
  ticket: z.null(),
  parcel: z.object({
    bookingId: z.string().uuid().nullable(),
    recipientName: z.string().trim().min(1).max(200),
    sizeCategory: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']),
    // BE owns this as an optional string, not as a guaranteed absolute URL.
    photoUrl: z.string().trim().max(2_048).nullable(),
    deliveryMethod: z.string().trim().min(1).max(100),
  }),
});

const passengerHistoryItemSchema = z.discriminatedUnion('type', [
  ticketHistoryItemSchema,
  parcelHistoryItemSchema,
]);

const passengerHistoryPageSchema = z.object({
  items: z.array(passengerHistoryItemSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(PASSENGER_HISTORY_MAX_PAGE_SIZE),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export const passengerHistoryKeys = {
  all: ['passenger-history'] as const,
  user: (userId: string) => [...passengerHistoryKeys.all, userId] as const,
  list: (
    userId: string,
    query: PassengerHistoryQueryInput,
  ) => [
    ...passengerHistoryKeys.user(userId),
    query.type,
    query.status ?? 'all',
    query.from ?? 'any-from',
    query.to ?? 'any-to',
    query.pageSize ?? PASSENGER_HISTORY_DEFAULT_PAGE_SIZE,
  ] as const,
};

const assertQueryBounds = (query: PassengerHistoryQuery): void => {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? PASSENGER_HISTORY_DEFAULT_PAGE_SIZE;
  if (!Number.isInteger(page) || page < 1) {
    throw new Error('Passenger history page must be a positive integer.');
  }
  if (
    !Number.isInteger(pageSize)
    || pageSize < 1
    || pageSize > PASSENGER_HISTORY_MAX_PAGE_SIZE
  ) {
    throw new Error('Passenger history pageSize is out of range.');
  }
  assertApiInstantRange(
    { from: query.from, to: query.to },
    { allowEqual: false, label: 'Passenger history range' },
  );
};

export const parsePassengerHistoryPage = (
  value: unknown,
  expectedType: PassengerHistoryType,
): PassengerHistoryPage<PassengerHistoryItem> => {
  const page = passengerHistoryPageSchema.parse(value);
  if (page.items.some((item) => item.type !== expectedType)) {
    throw new Error('Passenger history response does not match the requested type.');
  }
  return page;
};

export async function getPassengerHistory(
  query: PassengerHistoryQuery,
  signal?: AbortSignal,
): Promise<PassengerHistoryPage<PassengerHistoryItem>> {
  assertQueryBounds(query);
  const response = await apiClient.get<ApiEnvelope<PassengerHistoryPage<PassengerHistoryItem>>>(
    '/passenger/history',
    {
      params: {
        type: query.type,
        ...(query.status ? { status: query.status } : {}),
        ...(query.from ? { from: query.from } : {}),
        ...(query.to ? { to: query.to } : {}),
        page: query.page ?? 1,
        pageSize: query.pageSize ?? PASSENGER_HISTORY_DEFAULT_PAGE_SIZE,
      },
      ...(signal ? { signal } : {}),
    },
  );

  return parsePassengerHistoryPage(
    unwrapApiResponse(response.data),
    query.type,
  );
}
