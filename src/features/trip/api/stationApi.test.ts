const mockGet = jest.fn();

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

import { searchStations } from './stationApi';

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
