import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import type { PromoOffer } from '@shared/utils/promo';
import type {
  AvailableParcelTrip,
  AvailableParcelTripsParams,
  CreateParcelPayload,
  CreateParcelResult,
  GetParcelVouchersParams,
  ParcelAvailableVoucher,
  ParcelDetail,
  PagedParcelResponse,
  ReceivedParcel,
} from '../types';

export const parcelKeys = {
  all: ['parcels'] as const,
  availableTrips: (params: AvailableParcelTripsParams) =>
    [...parcelKeys.all, 'available-trips', params] as const,
  vouchers: (params: GetParcelVouchersParams) =>
    [...parcelKeys.all, 'vouchers', 'available', params] as const,
  detail: (parcelId: string) => [...parcelKeys.all, parcelId, 'detail'] as const,
  received: (page: number, pageSize: number) =>
    [...parcelKeys.all, 'received', page, pageSize] as const,
};

export const createParcelIdempotencyKey = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `parcel-mobile-${timestamp}-${random}`;
};

export async function getAvailableParcelTrips(
  params: AvailableParcelTripsParams,
): Promise<PagedParcelResponse<AvailableParcelTrip>> {
  const response = await apiClient.get<ApiEnvelope<PagedParcelResponse<AvailableParcelTrip>>>(
    '/parcels/available-trips',
    { params },
  );

  return unwrapApiResponse(response.data);
}

export async function getAvailableParcelVouchers(
  params: GetParcelVouchersParams,
): Promise<ParcelAvailableVoucher[]> {
  const response = await apiClient.get<ApiEnvelope<ParcelAvailableVoucher[]>>(
    '/parcels/vouchers/available',
    { params },
  );

  return unwrapApiResponse(response.data);
}

export async function createParcel(payload: CreateParcelPayload): Promise<CreateParcelResult> {
  const response = await apiClient.post<ApiEnvelope<CreateParcelResult>>('/parcels', payload, {
    headers: {
      'Idempotency-Key': createParcelIdempotencyKey(),
    },
  });

  return unwrapApiResponse(response.data);
}

export async function getParcelDetail(parcelId: string): Promise<ParcelDetail> {
  const response = await apiClient.get<ApiEnvelope<ParcelDetail>>(`/parcels/${parcelId}`);
  return unwrapApiResponse(response.data);
}

export async function getReceivedParcels(
  page = 1,
  pageSize = 20,
): Promise<PagedParcelResponse<ReceivedParcel>> {
  const response = await apiClient.get<ApiEnvelope<PagedParcelResponse<ReceivedParcel>>>(
    '/parcels/received',
    { params: { page, pageSize } },
  );

  return unwrapApiResponse(response.data);
}

export function mapParcelVoucherToPromo(voucher: ParcelAvailableVoucher): PromoOffer {
  const normalizedType = voucher.type.toUpperCase();
  const isPercent = normalizedType.includes('PERCENT');
  const discountLabel = isPercent
    ? `${voucher.value}% OFF`
    : `${Math.max(voucher.discountAmount || voucher.value, 0).toLocaleString('vi-VN')} VND OFF`;

  return {
    id: voucher.id,
    code: voucher.code,
    title: voucher.name,
    description: voucher.discountAmount > 0
      ? `Save ${voucher.discountAmount.toLocaleString('vi-VN')} VND on parcel deposit.`
      : 'Available for this parcel route.',
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
