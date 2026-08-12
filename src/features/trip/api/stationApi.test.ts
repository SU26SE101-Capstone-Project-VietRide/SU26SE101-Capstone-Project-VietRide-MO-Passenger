const mockGet = jest.fn();

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

import type { StationDetail } from '../types';
import {
  getStation,
  searchStations,
  stationKeys,
} from './stationApi';

const STATION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_STATION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const stationDetail: StationDetail = {
  id: STATION_ID,
  name: 'Bến xe Miền Tây',
  slug: 'ben-xe-mien-tay',
  addressStreet: '395 Kinh Dương Vương',
  locationId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  city: 'Hồ Chí Minh',
  ward: 'Phường An Lạc',
  latitude: 10.741,
  longitude: 106.619,
  contactPhone: null,
  contactEmail: null,
  operatingHours: null,
  facilities: null,
  supportsShuttle: true,
  isActive: true,
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-15T00:00:00Z',
};

describe('searchStations', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({
      data: {
        success: true,
        statusCode: 200,
        data: [],
      },
    });
  });

  it('exact mode searches by locationId only', async () => {
    await searchStations({ mode: 'exact', locationId: ' location-123 ' });

    expect(mockGet).toHaveBeenCalledWith('/stations/search', {
      params: {
        locationId: 'location-123',
      },
    });
    const params = mockGet.mock.calls[0]?.[1]?.params as Record<string, unknown>;
    expect(params).not.toHaveProperty('locationScopeCode');
  });

  it('hierarchy mode searches by locationScopeCode only', async () => {
    await searchStations({ mode: 'hierarchy', locationScopeCode: ' 79 ' });

    expect(mockGet).toHaveBeenCalledWith('/stations/search', {
      params: {
        locationScopeCode: '79',
      },
    });
    const params = mockGet.mock.calls[0]?.[1]?.params as Record<string, unknown>;
    expect(params).not.toHaveProperty('locationId');
  });

  it('isolates exact and hierarchy query keys', () => {
    expect(stationKeys.search({ mode: 'exact', locationId: '79' })).toEqual([
      'stations',
      'search',
      'exact',
      '79',
    ]);
    expect(stationKeys.search({ mode: 'hierarchy', locationScopeCode: '79' })).toEqual([
      'stations',
      'search',
      'hierarchy',
      '79',
    ]);
    expect(
      stationKeys.search({ mode: 'exact', locationId: '79' }),
    ).not.toEqual(
      stationKeys.search({ mode: 'hierarchy', locationScopeCode: '79' }),
    );
  });

  it('returns station items from the array response', async () => {
    const station = {
      id: 'station-1',
      name: 'Ben xe Mien Tay',
      city: 'Ho Chi Minh City',
      ward: 'An Lac Ward',
      locationId: 'location-123',
      latitude: null,
      longitude: null,
      addressStreet: '395 Kinh Duong Vuong',
      supportsShuttle: false,
    };
    mockGet.mockResolvedValueOnce({
      data: {
        success: true,
        statusCode: 200,
        data: [station],
      },
    });

    await expect(
      searchStations({ mode: 'exact', locationId: 'location-123' }),
    ).resolves.toEqual([station]);
  });
});

describe('getStation', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({
      data: {
        success: true,
        statusCode: 200,
        data: stationDetail,
      },
    });
  });

  it('uses the exact public station detail route and cache key', async () => {
    await expect(getStation(STATION_ID)).resolves.toEqual(stationDetail);

    expect(mockGet).toHaveBeenCalledWith(`/stations/${STATION_ID}`);
    expect(stationKeys.detail(STATION_ID)).toEqual([
      'stations',
      'detail',
      STATION_ID,
    ]);
  });

  it('forwards the React Query cancellation signal', async () => {
    const controller = new AbortController();

    await getStation(STATION_ID, controller.signal);

    expect(mockGet).toHaveBeenCalledWith(`/stations/${STATION_ID}`, {
      signal: controller.signal,
    });
  });

  it('rejects an invalid station id before making a request', async () => {
    await expect(getStation(`${STATION_ID}/status`)).rejects.toThrow(
      'Invalid stationId.',
    );

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('fails closed when the response belongs to another station', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        success: true,
        statusCode: 200,
        data: { ...stationDetail, id: OTHER_STATION_ID },
      },
    });

    await expect(getStation(STATION_ID)).rejects.toMatchObject({
      name: 'ApiRequestError',
      code: 'INVALID_API_RESPONSE',
    });
  });

  it('accepts equivalent UUID casing without changing the response', async () => {
    const uppercaseId = STATION_ID.toUpperCase();

    await expect(getStation(uppercaseId)).resolves.toEqual(stationDetail);
    expect(mockGet).toHaveBeenCalledWith(`/stations/${uppercaseId}`);
  });
});
