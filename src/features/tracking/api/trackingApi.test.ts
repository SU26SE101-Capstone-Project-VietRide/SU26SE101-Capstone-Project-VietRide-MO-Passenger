import { apiClient } from '@shared/api/axiosInstance';
import type { ApiSuccessEnvelope } from '@shared/api/errors';
import {
  getTrackingEta,
  getTrackingEtas,
  getTrackingLatest,
  getTrackingTrail,
  parseTrackingPoint,
  type TrackingEtaResponse,
  type TrackingLatestResponse,
  type TrackingTrailResponse,
} from './trackingApi';

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: { get: jest.fn() },
}));

const TRIP_ID = '11111111-1111-4111-8111-111111111111';
const STOP_ID = '22222222-2222-4222-8222-222222222222';
const STATION_ID = '33333333-3333-4333-8333-333333333333';

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

    await expect(getTrackingLatest(TRIP_ID)).resolves.toEqual(payload);
    expect(getMock).toHaveBeenCalledWith(`/tracking/trips/${TRIP_ID}/latest`);
  });

  it('rejects malformed or cross-trip latest data at the network boundary', async () => {
    getMock.mockResolvedValueOnce({
      data: successEnvelope({
        latest: {
          tripId: '33333333-3333-4333-8333-333333333333',
          latitude: 10.762622,
          longitude: 106.660172,
          recordedAt: '2026-07-20T08:00:00.000Z',
        },
      }),
    });

    await expect(getTrackingLatest(TRIP_ID)).rejects.toThrow(
      'does not match the requested trip',
    );
  });

  it('filters unsafe coordinates before they reach the map', () => {
    expect(parseTrackingPoint({
      tripId: TRIP_ID,
      latitude: 91,
      longitude: 106.660172,
      recordedAt: '2026-07-20T08:00:00.000Z',
    })).toBeNull();
    expect(parseTrackingPoint({
      tripId: TRIP_ID,
      latitude: 10.762622,
      longitude: 106.660172,
      headingDeg: 361,
      recordedAt: '2026-07-20T08:00:00.000Z',
    })).toBeNull();
  });

  it('accepts explicit-offset timestamps with BE precision variants', () => {
    expect(parseTrackingPoint({
      tripId: TRIP_ID,
      latitude: 10.762622,
      longitude: 106.660172,
      recordedAt: '2026-07-20T15:00:00+07:00',
    })).not.toBeNull();
    expect(parseTrackingPoint({
      tripId: TRIP_ID,
      latitude: 10.762622,
      longitude: 106.660172,
      recordedAt: '2026-07-20T08:00:00.1234567Z',
    })).not.toBeNull();
    expect(parseTrackingPoint({
      tripId: TRIP_ID,
      latitude: 10.762622,
      longitude: 106.660172,
      recordedAt: '2026-07-20T08:00:00',
    })).toBeNull();
  });

  it('rejects invalid trail ranges before issuing a request', async () => {
    await expect(getTrackingTrail(TRIP_ID, {
      from: '2026-07-20T08:00:00',
    })).rejects.toThrow();
    await expect(getTrackingTrail(TRIP_ID, {
      from: '2026-07-20T08:00:01Z',
      to: '2026-07-20T08:00:00Z',
    })).rejects.toThrow(/from must be before or equal to to/);

    expect(getMock).not.toHaveBeenCalled();
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

    await expect(getTrackingTrail(TRIP_ID)).resolves.toEqual(payload);
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

  it('passes a validated STOP target to the ETA endpoint', async () => {
    const payload: TrackingEtaResponse = { eta: null };
    getMock.mockResolvedValueOnce({ data: successEnvelope(payload) });

    await expect(getTrackingEta(TRIP_ID, {
      target: { kind: 'STOP', stopId: STOP_ID },
    })).resolves.toEqual(payload);
    expect(getMock).toHaveBeenCalledWith(
      `/tracking/trips/${TRIP_ID}/eta`,
      { params: { targetKind: 'STOP', stopId: STOP_ID } },
    );
  });

  it('omits target params for operational next-stop ETA', async () => {
    const payload: TrackingEtaResponse = { eta: null };
    getMock.mockResolvedValueOnce({ data: successEnvelope(payload) });

    await expect(getTrackingEta(TRIP_ID, {})).resolves.toEqual(payload);
    expect(getMock).toHaveBeenCalledWith(
      `/tracking/trips/${TRIP_ID}/eta`,
      {},
    );
  });

  it('passes a validated STATION target to the ETA endpoint', async () => {
    const payload: TrackingEtaResponse = { eta: null };
    getMock.mockResolvedValueOnce({ data: successEnvelope(payload) });

    await expect(getTrackingEta(TRIP_ID, {
      target: { kind: 'STATION', stationId: STATION_ID },
    })).resolves.toEqual(payload);
    expect(getMock).toHaveBeenCalledWith(
      `/tracking/trips/${TRIP_ID}/eta`,
      { params: { targetKind: 'STATION', stationId: STATION_ID } },
    );
  });

  it('uses the batch ETA endpoint only for the supplementary route list', async () => {
    const payload = { etas: [] };
    getMock.mockResolvedValueOnce({ data: successEnvelope(payload) });

    await expect(getTrackingEtas(TRIP_ID)).resolves.toEqual(payload);
    expect(getMock).toHaveBeenCalledWith(
      `/tracking/trips/${TRIP_ID}/etas`,
      undefined,
    );
  });

  it.each([
    ['invalid trip', 'not-a-uuid', STOP_ID],
    ['invalid stop', TRIP_ID, 'bad-stop'],
  ])('rejects %s before issuing a request', async (_label, tripId, stopId) => {
    await expect(getTrackingEta(tripId, {
      target: { kind: 'STOP', stopId },
    })).rejects.toThrow(/Invalid/);
    expect(getMock).not.toHaveBeenCalled();
  });
});
