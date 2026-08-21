import { apiClient } from '@shared/api/axiosInstance';
import type { ApiSuccessEnvelope } from '@shared/api/errors';
import {
  confirmParcelDelivery,
  getParcelTrace,
  parcelReliabilityKeys,
  rejectParcelDelivery,
  reportParcelIncident,
  undoRejectParcelDelivery,
} from './parcelReliabilityApi';

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const PARCEL_ID = '11111111-1111-4111-8111-111111111111';
const TRIP_ID = '22222222-2222-4222-8222-222222222222';
const OPERATOR_ID = '33333333-3333-4333-8333-333333333333';
const INCIDENT_ID = '44444444-4444-4444-8444-444444444444';
const IDEMPOTENCY_KEY = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const NOW = '2026-08-22T09:00:00+07:00';

const success = <T,>(data: T, statusCode = 200): ApiSuccessEnvelope<T> => ({
  success: true,
  statusCode,
  data,
});

const traceWire = {
  parcelId: PARCEL_ID,
  parcelCode: 'PCL-001',
  parcelStatus: 'IN_TRANSIT',
  parcelSummary: {
    parcelId: PARCEL_ID,
    parcelCode: 'PCL-001',
    status: 'IN_TRANSIT',
    description: null,
    photoUrl: null,
    quantity: 1,
    declaredValueVnd: null,
  },
  operator: { operatorId: OPERATOR_ID },
  trip: { tripId: TRIP_ID },
  dropoffLocation: {},
  currentCustody: null,
  activeIncident: null,
  forwardingTrip: null,
  claimSummary: null,
  availableActions: [],
  timeline: { items: [], nextCursor: 'opaque:next/cursor==' },
  incidents: [],
  nextUpdateAt: null,
};

describe('Parcel Reliability API adapters', () => {
  const getMock = apiClient.get as jest.Mock;
  const postMock = apiClient.post as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes an opaque trace cursor unchanged and never puts it in a query key', async () => {
    getMock.mockResolvedValueOnce({ data: success(traceWire) });
    const cursor = 'opaque:next/cursor==';
    await getParcelTrace(PARCEL_ID, cursor, 50);

    expect(getMock).toHaveBeenCalledWith(
      `/parcels/${PARCEL_ID}/trace`,
      expect.objectContaining({ params: { cursor, limit: 50 } }),
    );
    expect(JSON.stringify(parcelReliabilityKeys.trace('user-a', PARCEL_ID)))
      .not.toContain(cursor);
  });

  it('reports description-only incidents with an empty evidence array and a retained key input', async () => {
    postMock.mockResolvedValueOnce({
      data: success({
        incidentId: INCIDENT_ID,
        parcelId: PARCEL_ID,
        incidentType: 'DELIVERY_NOT_RECEIVED',
        status: 'OPEN',
        searchDeadline: NOW,
      }, 201),
    });

    await reportParcelIncident({
      parcelId: PARCEL_ID,
      incidentType: 'DELIVERY_NOT_RECEIVED',
      description: 'Chưa nhận được hàng',
      evidenceUrls: [],
    }, IDEMPOTENCY_KEY);

    expect(postMock).toHaveBeenCalledWith(
      `/parcels/${PARCEL_ID}/incidents`,
      {
        incidentType: 'DELIVERY_NOT_RECEIVED',
        description: 'Chưa nhận được hàng',
        evidenceUrls: [],
      },
      { headers: { 'Idempotency-Key': IDEMPOTENCY_KEY } },
    );
  });

  it.each([
    ['confirm', confirmParcelDelivery, { token: ' delivery-token ' }, {
      parcelId: PARCEL_ID,
      status: 'CONFIRMED',
      confirmedAt: NOW,
    }],
    ['reject', rejectParcelDelivery, { token: ' delivery-token ', reason: ' Không nhận được ' }, {
      parcelId: PARCEL_ID,
      status: 'REJECTED',
      rejectedAt: NOW,
      canUndoUntil: '2026-08-22T09:15:00+07:00',
    }],
    ['undo', undoRejectParcelDelivery, { token: ' delivery-token ' }, {
      parcelId: PARCEL_ID,
      status: 'DELIVERED_PENDING_CONFIRM',
      undoneAt: NOW,
    }],
  ])('keeps anonymous delivery %s requests unauthenticated and idempotent', async (
    _name,
    adapter,
    input,
    result,
  ) => {
    postMock.mockResolvedValueOnce({ data: success(result) });
    await (adapter as (value: never, key: string) => Promise<unknown>)(
      input as never,
      IDEMPOTENCY_KEY,
    );
    const config = postMock.mock.calls[0]?.[2];
    expect(config).toEqual({
      headers: { 'Idempotency-Key': IDEMPOTENCY_KEY },
      skipAuth: true,
      skipAuthRefresh: true,
    });
    expect(config.headers).not.toHaveProperty('Authorization');
    expect(postMock.mock.calls[0]?.[1].token).toBe('delivery-token');
  });

  it('rejects blank delivery token/reason before sending a request', async () => {
    await expect(confirmParcelDelivery({ token: ' ' }, IDEMPOTENCY_KEY)).rejects.toThrow();
    await expect(rejectParcelDelivery({
      token: 'delivery-token',
      reason: ' ',
    }, IDEMPOTENCY_KEY)).rejects.toThrow();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('scopes all Reliability caches by account', () => {
    expect(parcelReliabilityKeys.claims('user-a', PARCEL_ID)).not.toEqual(
      parcelReliabilityKeys.claims('user-b', PARCEL_ID),
    );
  });
});
