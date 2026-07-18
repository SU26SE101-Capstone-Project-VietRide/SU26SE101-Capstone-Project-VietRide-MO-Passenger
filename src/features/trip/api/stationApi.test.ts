const mockGet = jest.fn();

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

import type { StationDetail } from '../types';
import { getStation, searchStations, stationKeys } from './stationApi';

const STATION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_STATION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const stationDetail: StationDetail = {
  id: STATION_ID,
  name: 'Bến xe Miền Tây',
  slug: 'ben-xe-mien-tay',
  addressStreet: '395 Kinh Dương Vương',
  locationId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  city: 'Hồ Chí Minh',
  province: 'Hồ Chí Minh',
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

  it('searches stations by the required location id', async () => {
    await searchStations(' location-123 ');

    expect(mockGet).toHaveBeenCalledWith('/stations/search', {
      params: {
        locationId: 'location-123',
      },
    });
  });

  it('returns station items when the response data is paged-like', async () => {
    const station = {
      id: 'station-1',
      name: 'Ben xe Mien Tay',
      city: 'Ho Chi Minh City',
      province: 'Ho Chi Minh',
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
        data: {
          items: [station],
        },
      },
    });

    await expect(searchStations('location-123')).resolves.toEqual([station]);
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
