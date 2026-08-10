import { apiClient } from '@shared/api/axiosInstance';
import { getPaymentSessionStatus, mapPaymentSessionStatus } from './paymentSessionApi';

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const getMock = jest.mocked(apiClient.get);

describe('paymentSessionApi', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('maps known statuses', () => {
    expect(
      mapPaymentSessionStatus({ sessionId: 's1', status: 'succeeded' }),
    ).toEqual({ sessionId: 's1', status: 'SUCCEEDED' });
  });

  it('GET /payments/sessions/{id}', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        success: true,
        statusCode: 200,
        data: {
          sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          status: 'PENDING',
        },
      },
    });

    await expect(
      getPaymentSessionStatus('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    ).resolves.toEqual({
      sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      status: 'PENDING',
    });

    expect(getMock).toHaveBeenCalledWith(
      '/payments/sessions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      undefined,
    );
  });
});
