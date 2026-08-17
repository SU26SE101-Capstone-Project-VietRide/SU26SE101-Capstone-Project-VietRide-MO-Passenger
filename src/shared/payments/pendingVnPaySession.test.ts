import { clearSessionBoundState } from '@shared/session/cleanup';

import {
  clearPendingVnPaySession,
  getPendingVnPaySession,
  parsePendingVnPaySession,
  resetPendingVnPaySessionMemory,
  savePendingVnPaySession,
} from './pendingVnPaySession';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    __store: store,
  };
});

describe('pendingVnPaySession', () => {
  beforeEach(() => {
    resetPendingVnPaySessionMemory();
    const secureStore = jest.requireMock('expo-secure-store') as {
      __store: Map<string, string>;
    };
    secureStore.__store.clear();
  });

  it('round-trips owner, redirect URL, and SDK metadata through SecureStore', async () => {
    const input = {
      sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      kind: 'topup' as const,
      businessId: 'top-1',
      ownerUserId: '11111111-1111-4111-8111-111111111111',
      createdAt: '2026-08-11T00:00:00.000Z',
      paymentRedirectUrl: 'https://sandbox.vnpayment.vn/pay',
      vnpaySdk: {
        tmnCode: 'TMN',
        scheme: 'vietride',
        isSandbox: true,
      },
    };

    const saved = await savePendingVnPaySession(input);
    const secureStore = jest.requireMock('expo-secure-store') as {
      __store: Map<string, string>;
    };
    expect(JSON.parse(secureStore.__store.get('pendingVnPaySession') ?? '{}'))
      .toEqual(input);

    resetPendingVnPaySessionMemory();
    await expect(getPendingVnPaySession()).resolves.toEqual(input);
    expect(saved).toEqual(input);

    await clearPendingVnPaySession();
    resetPendingVnPaySessionMemory();
    await expect(getPendingVnPaySession()).resolves.toBeNull();
  });

  it('keeps the stored session across logout so the owner can reopen after login', async () => {
    const input = {
      sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      kind: 'topup' as const,
      businessId: 'top-1',
      ownerUserId: '11111111-1111-4111-8111-111111111111',
      createdAt: '2026-08-11T00:00:00.000Z',
      paymentRedirectUrl: 'https://sandbox.vnpayment.vn/pay',
      vnpaySdk: {
        tmnCode: 'TMN',
        scheme: 'vietride',
        isSandbox: true,
      },
    };

    await savePendingVnPaySession(input);
    clearSessionBoundState();
    await expect(getPendingVnPaySession()).resolves.toEqual(input);
  });

  it('rejects legacy or malformed records missing owner/resume metadata', () => {
    expect(parsePendingVnPaySession('{')).toBeNull();
    expect(parsePendingVnPaySession(JSON.stringify({ sessionId: 'x' }))).toBeNull();
    expect(parsePendingVnPaySession(JSON.stringify({
      sessionId: 's1',
      kind: 'booking',
      createdAt: '2026-08-11T00:00:00.000Z',
      paymentRedirectUrl: 'https://sandbox.vnpayment.vn/pay',
      vnpaySdk: {
        tmnCode: 'TMN',
        scheme: 'vietride',
        isSandbox: true,
      },
    }))).toBeNull();
  });
});
