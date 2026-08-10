import { pollVnPaySessionStatus } from './reconcileVnPaySession';
import type { PaymentSessionStatusResult } from './types';

jest.mock('./paymentSessionApi', () => ({
  getPaymentSessionStatus: jest.fn(),
}));

describe('pollVnPaySessionStatus', () => {
  it('stops when session becomes SUCCEEDED', async () => {
    const fetchStatus = jest
      .fn<Promise<PaymentSessionStatusResult>, [string]>()
      .mockResolvedValueOnce({
        sessionId: 's1',
        status: 'PENDING',
      })
      .mockResolvedValueOnce({
        sessionId: 's1',
        status: 'SUCCEEDED',
      });

    const result = await pollVnPaySessionStatus({
      sessionId: 's1',
      delaysMs: [0, 0],
      waitForDelay: async () => undefined,
      fetchStatus,
    });

    expect(result).toEqual({ sessionId: 's1', status: 'SUCCEEDED' });
    expect(fetchStatus).toHaveBeenCalledTimes(2);
  });

  it('returns latest PENDING after delay budget ends', async () => {
    const fetchStatus = jest.fn(async () => ({
      sessionId: 's1',
      status: 'PENDING' as const,
    }));

    const result = await pollVnPaySessionStatus({
      sessionId: 's1',
      delaysMs: [0, 0],
      waitForDelay: async () => undefined,
      fetchStatus,
    });

    expect(result?.status).toBe('PENDING');
    expect(fetchStatus).toHaveBeenCalledTimes(2);
  });
});
