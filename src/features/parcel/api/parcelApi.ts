import { apiClient } from '@shared/api/axiosInstance';
import type { TFunction } from 'i18next';
import { normalizeIdempotencyKey } from '@shared/api/idempotency';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import type { PromoOffer } from '@shared/utils/promo';
import { encodeUuidPathSegment } from '@shared/utils/pathSegment';
import { formatVnd } from '@shared/utils/format';
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

type ParcelPaymentEndpoint = 'deposit-payment' | 'final-payment';

const getIdempotencyHeaders = (idempotencyKey: string) => ({
  'Idempotency-Key': normalizeIdempotencyKey(idempotencyKey),
});

export const parcelKeys = {
  all: ['parcels'] as const,
  user: (userId: string) => [...parcelKeys.all, userId] as const,
  availableTripsRoot: () => [...parcelKeys.all, 'available-trips'] as const,
  availableTrips: (params: AvailableParcelTripsParams) => {
    return [
      ...parcelKeys.availableTripsRoot(),
      {
        originStationId: params.originStationId,
        destinationStationId: params.destinationStationId,
        departureDate: params.departureDate,
        lengthCm: params.lengthCm,
        widthCm: params.widthCm,
        heightCm: params.heightCm,
        estimatedWeightKg: params.estimatedWeightKg,
        pageSize: params.pageSize ?? 20,
      },
    ] as const;
  },
  vouchers: (userId: string, params: GetParcelVouchersParams) =>
    [...parcelKeys.user(userId), 'vouchers', 'available', params] as const,
  detail: (userId: string, parcelId: string) =>
    [...parcelKeys.user(userId), parcelId, 'detail'] as const,
  received: (userId: string, page: number, pageSize: number) =>
    [...parcelKeys.user(userId), 'received', page, pageSize] as const,
};

export async function getAvailableParcelTrips(
  params: AvailableParcelTripsParams,
  signal?: AbortSignal,
): Promise<PagedParcelResponse<AvailableParcelTrip>> {
  const response = await apiClient.get<
    ApiEnvelope<PagedParcelResponse<AvailableParcelTrip>>
  >('/parcels/available-trips', { params, ...(signal ? { signal } : {}) });

  return unwrapApiResponse(response.data);
}

export async function getAvailableParcelVouchers(
  params: GetParcelVouchersParams,
  signal?: AbortSignal,
): Promise<ParcelAvailableVoucher[]> {
  const response = await apiClient.get<ApiEnvelope<ParcelAvailableVoucher[]>>(
    '/parcels/vouchers/available',
    { params, ...(signal ? { signal } : {}) },
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

  return unwrapApiResponse(response.data);
}

async function startParcelPayment<TResult>(
  endpoint: ParcelPaymentEndpoint,
  input: StartParcelPaymentInput,
  idempotencyKey: string,
): Promise<TResult> {
  const parcelIdSegment = encodeUuidPathSegment(input.parcelId, 'parcelId');
  const response = await apiClient.post<ApiEnvelope<TResult>>(
    `/parcels/${parcelIdSegment}/${endpoint}`,
    { paymentMethod: input.paymentMethod },
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
  return unwrapApiResponse(response.data);
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

  return unwrapApiResponse(response.data);
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
