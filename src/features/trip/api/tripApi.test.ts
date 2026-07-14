const mockGet = jest.fn();

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

import { getTripDetail, searchTrips } from './tripApi';

const TRIP_ID = '4d680b5f-8a94-4f26-9f5b-413bd1221e02';

describe('tripApi', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('forwards React Query cancellation to trip search', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        success: true,
        statusCode: 200,
        data: {
          items: [],
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    });
    const controller = new AbortController();
    const params = {
      originLocationCode: 'SGN',
      destinationLocationCode: 'DAD',
      departureDate: '2026-07-14',
      passengerCount: 1,
    };

    await searchTrips(params, controller.signal);

    expect(mockGet).toHaveBeenCalledWith('/trips/search', {
      params,
      signal: controller.signal,
    });
  });

  it.each([
    'not-a-uuid',
    `${TRIP_ID}/seat-map`,
    `${TRIP_ID}?include=private`,
  ])('rejects an invalid trip path id %p before networking', async (tripId) => {
    await expect(getTripDetail(tripId)).rejects.toThrow('Invalid tripId.');
    expect(mockGet).not.toHaveBeenCalled();
  });
});
