import { apiClient } from '@shared/api/axiosInstance';
import type { ApiSuccessEnvelope } from '@shared/api/errors';
import { getPassengerHistory } from './passengerHistoryApi';

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: { get: jest.fn() },
}));

const successEnvelope = <T>(data: T): ApiSuccessEnvelope<T> => ({
  success: true,
  statusCode: 200,
  data,
});

const emptyPage = {
  items: [],
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

describe('passengerHistoryApi', () => {
  const getMock = jest.mocked(apiClient.get);

  beforeEach(() => {
    getMock.mockReset();
  });

  it('sends a strictly ordered explicit-offset range', async () => {
    getMock.mockResolvedValueOnce({ data: successEnvelope(emptyPage) });

    await expect(getPassengerHistory({
      type: 'TICKET',
      from: '2026-07-20T08:00:00Z',
      to: '2026-07-20T16:00:00+07:00',
    })).resolves.toEqual(emptyPage);
    expect(getMock).toHaveBeenCalledWith('/passenger/history', {
      params: {
        type: 'TICKET',
        from: '2026-07-20T08:00:00Z',
        to: '2026-07-20T16:00:00+07:00',
        page: 1,
        pageSize: 20,
      },
    });
  });

  it('rejects offsetless or non-increasing ranges before a request', async () => {
    await expect(getPassengerHistory({
      type: 'TICKET',
      from: '2026-07-20T08:00:00',
    })).rejects.toThrow();
    await expect(getPassengerHistory({
      type: 'PARCEL',
      from: '2026-07-20T08:00:00Z',
      to: '2026-07-20T15:00:00+07:00',
    })).rejects.toThrow(/from must be before to/);

    expect(getMock).not.toHaveBeenCalled();
  });
});
