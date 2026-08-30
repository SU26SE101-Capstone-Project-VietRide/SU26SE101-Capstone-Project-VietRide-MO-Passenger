import { apiClient } from '@shared/api/axiosInstance';
import type { TFunction } from 'i18next';
import { z } from 'zod';
import { normalizeIdempotencyKey } from '@shared/api/idempotency';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import type { PromoOffer } from '@shared/utils/promo';
import { encodeUuidPathSegment } from '@shared/utils/pathSegment';
import { formatVnd } from '@shared/utils/format';
import { apiInstantSchema } from '@shared/utils/apiTime';
import { PARCEL_SIZE_CATEGORIES } from '../types';
import type {
  AvailableParcelTrip,
  AvailableParcelTripsParams,
  CreateParcelPayload,
  CreateParcelResult,
  GetParcelVouchersParams,
  ParcelAvailableVoucher,
  ParcelDepositPaymentResult,
  ParcelDetail,
  ParcelFinalPaymentResult,
  PagedParcelResponse,
  ReceivedParcel,
  StartParcelPaymentInput,
} from '../types';
import {
  createParcelResultSchema,
  parseParcelDetail,
  parseReceivedParcelPage,
} from './parcelSchemas';
export { parcelKeys } from './parcelQueryKeys';

type ParcelPaymentEndpoint = 'deposit-payment' | 'final-payment';

const nonNegativeVndSchema = z.number().int().nonnegative();
const quoteTokenSchema = z.string().trim().min(1).max(16_384);
const stationSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});
const availableParcelTripSchema = z.object({
  tripId: z.string().uuid(),
  routeId: z.string().uuid(),
  status: z.string(),
  operatorId: z.string().uuid(),
  operatorName: z.string(),
  originStation: stationSummarySchema,
  destinationStation: stationSummarySchema,
  departureDateTime: apiInstantSchema,
  estimatedArrivalTime: apiInstantSchema,
  quoteToken: quoteTokenSchema.nullable().optional().transform(value => value ?? null),
  quoteExpiresAt: apiInstantSchema.nullable().optional().transform(value => value ?? null),
  estimatedSizeCategory: z
    .enum(PARCEL_SIZE_CATEGORIES)
    .nullable()
    .optional()
    .transform(value => value ?? null),
  // Rolling v1.75→v1.76: missing money fields stay null; do not default to 0.
  estimatedGrossPriceVnd: nonNegativeVndSchema
    .nullable()
    .optional()
    .transform(value => value ?? null),
  estimatedDiscountVnd: nonNegativeVndSchema
    .nullable()
    .optional()
    .transform(value => value ?? null),
  estimatedPriceVnd: nonNegativeVndSchema,
  estimatedDepositVnd: nonNegativeVndSchema,
  depositPercent: z.number().min(0).max(100),
});
const availableParcelTripsPageSchema = z.object({
  items: z.array(availableParcelTripSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

const getIdempotencyHeaders = (idempotencyKey: string) => ({
  'Idempotency-Key': normalizeIdempotencyKey(idempotencyKey),
});

export async function getAvailableParcelTrips(
  params: AvailableParcelTripsParams,
  signal?: AbortSignal,
): Promise<PagedParcelResponse<AvailableParcelTrip>> {
  const response = await apiClient.get<
    ApiEnvelope<PagedParcelResponse<AvailableParcelTrip>>
  >('/parcels/available-trips', { params, ...(signal ? { signal } : {}) });

  return availableParcelTripsPageSchema.parse(
    unwrapApiResponse(response.data),
  );
}

export async function getAvailableParcelVouchers(
  params: GetParcelVouchersParams,
  signal?: AbortSignal,
): Promise<ParcelAvailableVoucher[]> {
  // Signed-quote path only: BE derives amount from quoteToken.
  // quoteExpiresAt / estimatedGrossPriceVnd are React Query key metadata only.
  const requestParams = {
    tripId: params.tripId,
    sizeCategory: params.sizeCategory,
    paymentMethod: params.paymentMethod,
    quoteToken: params.quoteToken,
  };
  const response = await apiClient.get<ApiEnvelope<ParcelAvailableVoucher[]>>(
    '/parcels/vouchers/available',
    { params: requestParams, ...(signal ? { signal } : {}) },
  );

  return unwrapApiResponse(response.data);
}

export async function createParcel(
  payload: CreateParcelPayload,
  idempotencyKey: string,
): Promise<CreateParcelResult> {
  const response = await apiClient.post<ApiEnvelope<CreateParcelResult>>(
    '/parcels',
    payload,
    {
      headers: getIdempotencyHeaders(idempotencyKey),
    },
  );

  return createParcelResultSchema.parse(
    unwrapApiResponse(response.data),
  ) as CreateParcelResult;
}

async function startParcelPayment<TResult>(
  endpoint: ParcelPaymentEndpoint,
  input: StartParcelPaymentInput,
  idempotencyKey: string,
): Promise<TResult> {
  const parcelIdSegment = encodeUuidPathSegment(input.parcelId, 'parcelId');
  const body =
    input.paymentMethod === 'VNPAY'
      ? {
          paymentMethod: input.paymentMethod,
          paymentReturnMode: 'MOBILE_SDK' as const,
        }
      : { paymentMethod: input.paymentMethod };
  const response = await apiClient.post<ApiEnvelope<TResult>>(
    `/parcels/${parcelIdSegment}/${endpoint}`,
    body,
    { headers: getIdempotencyHeaders(idempotencyKey) },
  );

  return unwrapApiResponse(response.data);
}

export function startParcelDepositPayment(
  input: StartParcelPaymentInput,
  idempotencyKey: string,
): Promise<ParcelDepositPaymentResult> {
  return startParcelPayment<ParcelDepositPaymentResult>(
    'deposit-payment',
    input,
    idempotencyKey,
  );
}

export function startParcelFinalPayment(
  input: StartParcelPaymentInput,
  idempotencyKey: string,
): Promise<ParcelFinalPaymentResult> {
  return startParcelPayment<ParcelFinalPaymentResult>(
    'final-payment',
    input,
    idempotencyKey,
  );
}

export async function getParcelDetail(
  parcelId: string,
  signal?: AbortSignal,
): Promise<ParcelDetail> {
  const parcelIdSegment = encodeUuidPathSegment(parcelId, 'parcelId');
  const path = `/parcels/${parcelIdSegment}`;
  const response = signal
    ? await apiClient.get<ApiEnvelope<ParcelDetail>>(path, { signal })
    : await apiClient.get<ApiEnvelope<ParcelDetail>>(path);
  return parseParcelDetail(
    unwrapApiResponse(response.data),
  ) as ParcelDetail;
}

export async function getReceivedParcels(
  page = 1,
  pageSize = 20,
  signal?: AbortSignal,
): Promise<PagedParcelResponse<ReceivedParcel>> {
  const response = await apiClient.get<
    ApiEnvelope<PagedParcelResponse<ReceivedParcel>>
  >('/parcels/received', {
    params: { page, pageSize },
    ...(signal ? { signal } : {}),
  });

  return parseReceivedParcelPage(
    unwrapApiResponse(response.data),
  ) as PagedParcelResponse<ReceivedParcel>;
}

export function mapParcelVoucherToPromo(
  voucher: ParcelAvailableVoucher,
  t: TFunction,
): PromoOffer {
  const normalizedType = voucher.type.toUpperCase();
  const isPercent = normalizedType.includes('PERCENT');
  const discountLabel = isPercent
    ? t('parcel.promos.percentOff', { value: voucher.value })
    : t('parcel.promos.amountOff', {
        amount: formatVnd(voucher.discountAmount || voucher.value, {
          display: 'code',
          clampNegative: true,
        }),
      });

  return {
    id: voucher.id,
    code: voucher.code,
    title: voucher.name,
    description:
      voucher.discountAmount > 0
        ? t('parcel.promos.saveDeposit', {
            amount: formatVnd(voucher.discountAmount, {
              display: 'code',
            }),
          })
        : t('parcel.promos.availableForRoute'),
    discountLabel,
    expiresAt: voucher.validUntil,
    minimumSpend: voucher.minOrderAmount,
    discount: isPercent
      ? {
          type: 'percent',
          percent: voucher.value,
          maxAmount: voucher.maxDiscountAmount ?? undefined,
        }
      : {
          type: 'fixed',
          amount: voucher.discountAmount || voucher.value,
        },
  };
}
