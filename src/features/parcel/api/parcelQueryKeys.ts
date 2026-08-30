import type {
  AvailableParcelTripsParams,
  GetParcelVouchersParams,
} from '../types';

export const parcelKeys = {
  all: ['parcels'] as const,
  user: (userId: string) => [...parcelKeys.all, userId] as const,
  availableTripsRoot: () => [...parcelKeys.all, 'available-trips'] as const,
  availableTrips: (userId: string, params: AvailableParcelTripsParams) => {
    return [
      ...parcelKeys.availableTripsRoot(),
      userId,
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
  vouchers: (userId: string, params: GetParcelVouchersParams) => [
    ...parcelKeys.user(userId),
    'vouchers',
    'available',
    {
      tripId: params.tripId,
      sizeCategory: params.sizeCategory,
      paymentMethod: params.paymentMethod,
      estimatedGrossPriceVnd: params.estimatedGrossPriceVnd,
      quoteExpiresAt: params.quoteExpiresAt,
    },
  ] as const,
  detail: (userId: string, parcelId: string) =>
    [...parcelKeys.user(userId), parcelId, 'detail'] as const,
  received: (userId: string, page: number, pageSize: number) =>
    [...parcelKeys.user(userId), 'received', page, pageSize] as const,
};
