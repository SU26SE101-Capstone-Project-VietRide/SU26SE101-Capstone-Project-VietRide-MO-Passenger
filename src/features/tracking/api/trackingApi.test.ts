import { apiClient } from '@shared/api/axiosInstance';
import type { ApiSuccessEnvelope } from '@shared/api/errors';
import {
  getTrackingEta,
  getTrackingLatest,
  getTrackingTrail,
  type TrackingEtaResponse,
  type TrackingLatestResponse,
  type TrackingTrailResponse,
} from './trackingApi';

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: { get: jest.fn() },
}));

const TRIP_ID = '11111111-1111-4111-8111-111111111111';
const STOP_ID = '22222222-2222-4222-8222-222222222222';

const successEnvelope = <T>(data: T): ApiSuccessEnvelope<T> => ({
  success: true,
  statusCode: 200,
  data,
});

describe('trackingApi', () => {
  const getMock = jest.mocked(apiClient.get);

  beforeEach(() => {
    getMock.mockReset();
  });

  it('requests the latest point from the trip-scoped endpoint', async () => {
    const payload: TrackingLatestResponse = { latest: null };
    getMock.mockResolvedValueOnce({ data: successEnvelope(payload) });

    await expect(getTrackingLatest(TRIP_ID)).resolves.toBe(payload);
    expect(getMock).toHaveBeenCalledWith(`/tracking/trips/${TRIP_ID}/latest`);
  });

  it('loads the newest trail page with the BE pagination contract', async () => {
    const payload: TrackingTrailResponse = {
      items: [],
      page: 1,
      pageSize: 100,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    };
    getMock.mockResolvedValueOnce({ data: successEnvelope(payload) });

    await expect(getTrackingTrail(TRIP_ID)).resolves.toBe(payload);
    expect(getMock).toHaveBeenCalledWith(
      `/tracking/trips/${TRIP_ID}/trail`,
      {
        params: {
          page: 1,
          pageSize: 100,
          sortBy: 'recordedAt',
          sortDir: 'desc',
        },
      },
    );
  });

  it('passes a validated stop UUID to the ETA endpoint', async () => {
    const payload: TrackingEtaResponse = { eta: null };
    getMock.mockResolvedValueOnce({ data: successEnvelope(payload) });

    await expect(getTrackingEta(TRIP_ID, STOP_ID)).resolves.toBe(payload);
    expect(getMock).toHaveBeenCalledWith(
      `/tracking/trips/${TRIP_ID}/eta`,
      { params: { stopId: STOP_ID } },
    );
  });

  it.each([
    ['invalid trip', 'not-a-uuid', STOP_ID],
    ['invalid stop', TRIP_ID, 'bad-stop'],
  ])('rejects %s before issuing a request', async (_label, tripId, stopId) => {
    await expect(getTrackingEta(tripId, stopId)).rejects.toThrow(/Invalid/);
    expect(getMock).not.toHaveBeenCalled();
  });
});
