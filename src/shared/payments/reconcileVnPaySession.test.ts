import {
  pollVnPaySessionStatus,
  reconcilePendingVnPaySession,
} from './reconcileVnPaySession';
import * as pendingStore from './pendingVnPaySession';
import type {
  PaymentSessionStatusResult,
  PendingVnPaySession,
} from './types';

jest.mock('./paymentSessionApi', () => ({
  getPaymentSessionStatus: jest.fn(),
}));

jest.mock('./pendingVnPaySession', () => ({
  clearPendingVnPaySession: jest.fn(async () => undefined),
  getPendingVnPaySession: jest.fn(),
}));

const OWNER_USER_ID = '11111111-1111-4111-8111-111111111111';
const storedSession: PendingVnPaySession = {
  sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  kind: 'booking',
  businessId: 'booking-1',
  ownerUserId: OWNER_USER_ID,
  createdAt: '2026-08-11T00:00:00.000Z',
  paymentRedirectUrl: 'https://sandbox.vnpayment.vn/pay',
  vnpaySdk: {
    tmnCode: 'TMN',
    scheme: 'vietride',
    isSandbox: true,
  },
};

describe('pollVnPaySessionStatus', () => {
  it('handles late IPN by staying pending before SUCCEEDED', async () => {
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

  it('drops a response that becomes stale while the request is in flight', async () => {
    let current = true;
    const fetchStatus = jest.fn(async () => {
      current = false;
      return { sessionId: 's1', status: 'SUCCEEDED' as const };
    });

    const result = await pollVnPaySessionStatus({
      sessionId: 's1',
      delaysMs: [0],
      isCurrent: () => current,
      fetchStatus,
    });

    expect(result).toBeNull();
  });
});

describe('reconcilePendingVnPaySession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(pendingStore.getPendingVnPaySession)
      .mockResolvedValue(storedSession);
  });

  it('clears user-switch data before any status request', async () => {
    const fetchStatus = jest.fn();

    await expect(reconcilePendingVnPaySession({
      ownerUserId: '22222222-2222-4222-8222-222222222222',
      fetchStatus,
    })).resolves.toMatchObject({ cleared: true, status: null });

    expect(fetchStatus).not.toHaveBeenCalled();
    expect(pendingStore.clearPendingVnPaySession).toHaveBeenCalledTimes(1);
  });

  it('clears terminal sessions after authoritative status', async () => {
    const fetchStatus = jest.fn(async () => ({
      sessionId: storedSession.sessionId,
      status: 'FAILED' as const,
    }));

    const result = await reconcilePendingVnPaySession({
      ownerUserId: OWNER_USER_ID,
      delaysMs: [0],
      fetchStatus,
    });

    expect(result.status?.status).toBe('FAILED');
    expect(result.cleared).toBe(true);
    expect(pendingStore.clearPendingVnPaySession).toHaveBeenCalledTimes(1);
  });

  it('does not clear a replacement session after a terminal response', async () => {
    const replacement = {
      ...storedSession,
      sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    };
    jest.mocked(pendingStore.getPendingVnPaySession)
      .mockResolvedValueOnce(storedSession)
      .mockResolvedValueOnce(replacement);
    const fetchStatus = jest.fn(async () => ({
      sessionId: storedSession.sessionId,
      status: 'SUCCEEDED' as const,
    }));

    const result = await reconcilePendingVnPaySession({
      ownerUserId: OWNER_USER_ID,
      delaysMs: [0],
      fetchStatus,
    });

    expect(result.cleared).toBe(false);
    expect(pendingStore.clearPendingVnPaySession).not.toHaveBeenCalled();
  });

  it('retains PENDING sessions', async () => {
    const fetchStatus = jest.fn(async () => ({
      sessionId: storedSession.sessionId,
      status: 'PENDING' as const,
    }));

    const result = await reconcilePendingVnPaySession({
      ownerUserId: OWNER_USER_ID,
      delaysMs: [0],
      fetchStatus,
    });

    expect(result.status?.status).toBe('PENDING');
    expect(result.cleared).toBe(false);
    expect(pendingStore.clearPendingVnPaySession).not.toHaveBeenCalled();
  });

  it('retains the session when retryable requests never resolve', async () => {
    const fetchStatus = jest.fn(async () => {
      throw new Error('network');
    });

    const result = await reconcilePendingVnPaySession({
      ownerUserId: OWNER_USER_ID,
      delaysMs: [0, 0],
      fetchStatus,
      shouldRetryError: () => true,
    });

    expect(result.status).toBeNull();
    expect(result.cleared).toBe(false);
    expect(pendingStore.clearPendingVnPaySession).not.toHaveBeenCalled();
  });
});
