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
});
