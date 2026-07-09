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

  it('searches a municipality by station name and city', async () => {
    await searchStations(' Mien Tay ', 'Ho Chi Minh City', 'MUNICIPALITY');

    expect(mockGet).toHaveBeenCalledWith('/stations/search', {
      params: {
        q: 'Mien Tay',
        city: 'Ho Chi Minh City',
      },
    });
  });

  it('searches a province by station name and province', async () => {
    await searchStations('My Dinh', 'Ha Noi', 'PROVINCE');

    expect(mockGet).toHaveBeenCalledWith('/stations/search', {
      params: {
        q: 'My Dinh',
        province: 'Ha Noi',
      },
    });
  });
});
