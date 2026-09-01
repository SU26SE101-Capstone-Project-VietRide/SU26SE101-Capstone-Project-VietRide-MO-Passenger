import { apiClient } from '@shared/api/axiosInstance';
import type { ApiSuccessEnvelope } from '@shared/api/errors';
import type {
  AvailableParcelTrip,
  CreateParcelPayload,
  GetParcelVouchersParams,
  ParcelDetail,
} from '../types';
import {
  createParcel,
  getAvailableParcelTrips,
  getAvailableParcelVouchers,
  getParcelDetail,
  parcelKeys,
} from './parcelApi';

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const PARCEL_ID = '4d680b5f-8a94-4f26-9f5b-413bd1221e02';
const TRIP_ID = '11111111-1111-4111-8111-111111111111';
const BOOKING_ID = '77777777-7777-4777-8777-777777777777';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OPAQUE_QUOTE_TOKEN = 'opaque.base64url-payload.base64url-signature';

const availableTripWire = {
  tripId: TRIP_ID,
  routeId: '22222222-2222-4222-8222-222222222222',
  status: 'SCHEDULED',
  operatorId: '33333333-3333-4333-8333-333333333333',
  operatorName: 'VietRide Express',
  originStation: {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Origin',
  },
  destinationStation: {
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Destination',
  },
  departureDateTime: '2026-05-18T08:00:00+07:00',
  estimatedArrivalTime: '2026-05-18T16:00:00+07:00',
  quoteToken: OPAQUE_QUOTE_TOKEN,
  quoteExpiresAt: '2026-05-18T07:10:00+07:00',
  estimatedSizeCategory: 'MEDIUM',
  estimatedGrossPriceVnd: 160_000,
  estimatedDiscountVnd: 10_000,
  estimatedPriceVnd: 150_000,
  estimatedDepositVnd: 30_000,
  depositPercent: 20,
  dropoffPoints: [{
    type: 'STOP',
    stationId: null,
    stopId: '66666666-6666-4666-8666-666666666666',
    name: 'Central stop',
    orderIndex: 2,
    estimatedArrivalTime: '2026-05-18T14:00:00+07:00',
  }],
};

const parcelDetailWire: ParcelDetail = {
  parcelId: PARCEL_ID,
  parcelCode: 'PCL-001',
  status: 'PENDING',
  senderUserId: USER_ID,
  recipientUserId: null,
  recipientName: null,
  recipientPhone: null,
  operatorId: '33333333-3333-4333-8333-333333333333',
  tripId: TRIP_ID,
  bookingId: null,
  dropoffStopId: null,
  description: null,
  quantity: 1,
  declaredValueVnd: null,
  photoUrl: null,
  checkInPhotoUrls: null,
  deliveryPhotoUrls: null,
  sizeCategory: 'MEDIUM',
  estimatedWeightKg: 8,
  actualWeightKg: null,
  deliveryMethod: 'TERMINAL_PICKUP',
  depositAmount: 30_000,
  originalDepositAmount: 30_000,
  discountAmount: 0,
  voucherCode: null,
  voucherUsageId: null,
  additionalAmount: 0,
  estimatedSizeCategory: 'MEDIUM',
  actualSizeCategory: null,
  estimatedLengthCm: 40,
  estimatedWidthCm: 30,
  estimatedHeightCm: 20,
  estimatedVolumeM3: 0.024,
  estimatedDimWeightKg: 4.8,
  estimatedChargeableWeightKg: 8,
  actualLengthCm: null,
  actualWidthCm: null,
  actualHeightCm: null,
  actualVolumeM3: null,
  actualDimWeightKg: null,
  actualChargeableWeightKg: null,
  estimatedGrossPriceVnd: 150_000,
  finalGrossPriceVnd: 0,
  discountAmountVnd: 0,
  estimatedTotalPriceVnd: 150_000,
  finalTotalPriceVnd: 0,
  depositPercent: 20,
  depositRequiredVnd: 30_000,
  depositPaidVnd: 0,
  balanceRequiredVnd: 0,
  balancePaidVnd: 0,
  refundDueVnd: 0,
  refundedAmountVnd: 0,
  forfeitedDepositVnd: 0,
  depositPaymentId: null,
  balancePaymentId: null,
  loadCutoffAt: null,
  latestCheckInAt: null,
  checkedInAt: null,
  checkedInByUserId: null,
  reweighedAt: null,
  reweighedByUserId: null,
  finalPaymentDeadline: null,
  pricePerKgVnd: 10_000,
  minimumPriceVnd: 50_000,
  dimWeightFactor: 5_000,
  settlementPolicyVersion: 2,
  createdAt: '2026-05-18T06:00:00+07:00',
  loadedAt: null,
  unloadedAt: null,
  deliveredPendingConfirmAt: null,
  confirmedAt: null,
  rejectedAt: null,
  originStationName: 'Origin',
  destinationStationName: 'Destination',
  eta: null,
  operator: null,
  trip: null,
  dropoffLocation: null,
  compensationPolicySnapshot: null,
  reliabilitySummary: null,
  availableActions: [],
};

describe('getParcelDetail', () => {
  const getMock = jest.mocked(apiClient.get);

  beforeEach(() => {
    getMock.mockReset();
  });

  it('uses a validated UUID as the only dynamic path segment', async () => {
    const envelope: ApiSuccessEnvelope<ParcelDetail> = {
      success: true,
      statusCode: 200,
      data: parcelDetailWire,
    };
    getMock.mockResolvedValueOnce({ data: envelope });

    await expect(getParcelDetail(PARCEL_ID)).resolves.toEqual(parcelDetailWire);
    expect(getMock).toHaveBeenCalledWith(`/parcels/${PARCEL_ID}`);
  });

  it.each([
    'not-a-uuid',
    `${PARCEL_ID}/status`,
    `${PARCEL_ID}?include=private`,
  ])('rejects %p before issuing a request', async (parcelId) => {
    await expect(getParcelDetail(parcelId)).rejects.toThrow('Invalid parcelId.');
    expect(getMock).not.toHaveBeenCalled();
  });
});

describe('parcel signed quote contract', () => {
  const getMock = jest.mocked(apiClient.get);
  const postMock = jest.mocked(apiClient.post);

  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it('searches by destination location and parses typed drop-off points', async () => {
    const envelope: ApiSuccessEnvelope<{
      items: typeof availableTripWire[];
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    }> = {
      success: true,
      statusCode: 200,
      data: {
        items: [availableTripWire],
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
    getMock.mockResolvedValueOnce({ data: envelope });

    const page = await getAvailableParcelTrips({
      originStationId: availableTripWire.originStation.id,
      destinationProvinceCode: '79',
      destinationLocationCode: '26734',
      departureDate: '2026-05-18',
      lengthCm: 40,
      widthCm: 30,
      heightCm: 20,
      estimatedWeightKg: 8,
    });

    expect(page.items).toHaveLength(1);
    const trip = page.items[0] as AvailableParcelTrip;
    expect(trip.quoteToken).toBe(OPAQUE_QUOTE_TOKEN);
    expect(trip.quoteExpiresAt).toBe('2026-05-18T07:10:00+07:00');
    expect(trip.estimatedSizeCategory).toBe('MEDIUM');
    expect(trip.estimatedGrossPriceVnd).toBe(160_000);
    expect(trip.estimatedDiscountVnd).toBe(10_000);
    expect(trip.dropoffPoints).toEqual([{
      type: 'STOP',
      stationId: null,
      stopId: '66666666-6666-4666-8666-666666666666',
      name: 'Central stop',
      orderIndex: 2,
      estimatedArrivalTime: '2026-05-18T14:00:00+07:00',
    }]);
    expect(JSON.stringify(trip)).toContain(OPAQUE_QUOTE_TOKEN);
    expect(getMock).toHaveBeenCalledWith('/parcels/available-trips', {
      params: expect.objectContaining({
        originStationId: availableTripWire.originStation.id,
        destinationProvinceCode: '79',
        destinationLocationCode: '26734',
      }),
    });
  });

  it('parses pre-v1.76 trips without quote money fields as null (rolling deploy)', async () => {
    const envelope: ApiSuccessEnvelope<{
      items: Array<Record<string, unknown>>;
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    }> = {
      success: true,
      statusCode: 200,
      data: {
        items: [{
          ...availableTripWire,
          quoteToken: undefined,
          quoteExpiresAt: undefined,
          estimatedSizeCategory: undefined,
          estimatedGrossPriceVnd: undefined,
          estimatedDiscountVnd: undefined,
        }],
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
    getMock.mockResolvedValueOnce({ data: envelope });

    const page = await getAvailableParcelTrips({
      originStationId: availableTripWire.originStation.id,
      destinationStationId: availableTripWire.destinationStation.id,
      departureDate: '2026-05-18',
      lengthCm: 40,
      widthCm: 30,
      heightCm: 20,
      estimatedWeightKg: 8,
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0].quoteToken).toBeNull();
    expect(page.items[0].estimatedGrossPriceVnd).toBeNull();
    expect(page.items[0].estimatedDiscountVnd).toBeNull();
  });

  it('never places the raw quoteToken into React Query keys', () => {
    const voucherParams: GetParcelVouchersParams = {
      tripId: TRIP_ID,
      sizeCategory: 'MEDIUM',
      paymentMethod: 'VNPAY',
      quoteToken: OPAQUE_QUOTE_TOKEN,
      quoteExpiresAt: '2026-05-18T07:10:00+07:00',
      estimatedGrossPriceVnd: 160_000,
    };

    const tripKey = JSON.stringify(parcelKeys.availableTrips(USER_ID, {
      originStationId: availableTripWire.originStation.id,
      destinationStationId: availableTripWire.destinationStation.id,
      departureDate: '2026-05-18',
      lengthCm: 40,
      widthCm: 30,
      heightCm: 20,
      estimatedWeightKg: 8,
    }));
    const voucherKey = JSON.stringify(parcelKeys.vouchers(USER_ID, voucherParams));

    expect(tripKey).toContain(USER_ID);
    expect(tripKey).not.toContain(OPAQUE_QUOTE_TOKEN);
    expect(voucherKey).toContain(USER_ID);
    expect(voucherKey).toContain('VNPAY');
    expect(voucherKey).toContain(TRIP_ID);
    expect(voucherKey).toContain('MEDIUM');
    expect(voucherKey).toContain('2026-05-18T07:10:00+07:00');
    expect(voucherKey).toContain('160000');
    expect(voucherKey).not.toContain(OPAQUE_QUOTE_TOKEN);
    expect(voucherKey).not.toContain('orderAmount');
  });

  it('scopes available-trips keys by user so quotes cannot leak across sessions', () => {
    const params = {
      originStationId: availableTripWire.originStation.id,
      destinationStationId: availableTripWire.destinationStation.id,
      departureDate: '2026-05-18',
      lengthCm: 40,
      widthCm: 30,
      heightCm: 20,
      estimatedWeightKg: 8,
    } as const;

    expect(parcelKeys.availableTrips('user-a', params)).not.toEqual(
      parcelKeys.availableTrips('user-b', params),
    );
  });

  it('serializes only the signed-quote voucher request params', async () => {
    const envelope: ApiSuccessEnvelope<unknown[]> = {
      success: true,
      statusCode: 200,
      data: [],
    };
    getMock.mockResolvedValueOnce({ data: envelope });

    await getAvailableParcelVouchers({
      tripId: TRIP_ID,
      sizeCategory: 'MEDIUM',
      paymentMethod: 'WALLET',
      quoteToken: OPAQUE_QUOTE_TOKEN,
      quoteExpiresAt: '2026-05-18T07:10:00+07:00',
      estimatedGrossPriceVnd: 160_000,
    });

    expect(getMock).toHaveBeenCalledWith(
      '/parcels/vouchers/available',
      expect.objectContaining({
        params: {
          tripId: TRIP_ID,
          sizeCategory: 'MEDIUM',
          paymentMethod: 'WALLET',
          quoteToken: OPAQUE_QUOTE_TOKEN,
        },
      }),
    );
    const requestParams = getMock.mock.calls[0]?.[1]?.params as Record<string, unknown>;
    expect(Object.keys(requestParams).sort()).toEqual([
      'paymentMethod',
      'quoteToken',
      'sizeCategory',
      'tripId',
    ]);
  });

  it('has no orderAmount surface in the Parcel voucher API source contract', () => {
    const fs = jest.requireActual<typeof import('node:fs')>('node:fs');
    const path = jest.requireActual<typeof import('node:path')>('node:path');
    const apiSource = fs.readFileSync(
      path.join(__dirname, 'parcelApi.ts'),
      'utf8',
    );
    const typesSource = fs.readFileSync(
      path.join(__dirname, '../types/index.ts'),
      'utf8',
    );
    expect(apiSource).not.toContain('orderAmount');
    expect(typesSource).not.toMatch(
      /interface GetParcelVouchersParams[\s\S]*orderAmount/,
    );
  });

  it('posts create parcels with the opaque quoteToken', async () => {
    const payload: CreateParcelPayload = {
      tripId: TRIP_ID,
      quoteToken: OPAQUE_QUOTE_TOKEN,
      dropoffStopId: null,
      bookingId: null,
      itemName: 'Documents',
      description: null,
      sizeCategory: 'MEDIUM',
      lengthCm: 40,
      widthCm: 30,
      heightCm: 20,
      estimatedWeightKg: 8,
      declaredValueVnd: 2_000_000,
      quantity: 1,
      photoUrl: null,
      recipient: {
        fullName: 'Recipient',
        phoneNumber: '0912345678',
        email: null,
      },
      deliveryMethod: 'TERMINAL_PICKUP',
      paymentMethod: 'VNPAY',
      voucherCode: null,
    };
    const envelope: ApiSuccessEnvelope<unknown> = {
      success: true,
      statusCode: 201,
      data: {
        parcelId: PARCEL_ID,
        bookingId: BOOKING_ID,
        parcelCode: 'VR-PCL-1',
        status: 'PENDING_PAYMENT',
        estimatedSizeCategory: 'MEDIUM',
        estimatedGrossPriceVnd: 160_000,
        discountAmountVnd: 0,
        estimatedTotalPriceVnd: 160_000,
        depositPercent: 20,
        depositRequiredVnd: 32_000,
        depositPaidVnd: 0,
        voucherCode: null,
        settlementPolicyVersion: 2,
      },
    };
    postMock.mockResolvedValueOnce({ data: envelope });

    const idempotencyKey = '11111111-1111-4111-8111-111111111111';
    const result = await createParcel(payload, idempotencyKey);

    expect(result.bookingId).toBe(BOOKING_ID);
    expect(postMock).toHaveBeenCalledWith(
      '/parcels',
      expect.objectContaining({
        tripId: TRIP_ID,
        quoteToken: OPAQUE_QUOTE_TOKEN,
        sizeCategory: 'MEDIUM',
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Idempotency-Key': idempotencyKey,
        }),
      }),
    );
  });
});
