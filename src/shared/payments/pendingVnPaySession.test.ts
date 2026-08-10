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

  it('parses and round-trips a valid session', async () => {
    const saved = await savePendingVnPaySession({
      sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      kind: 'topup',
      businessId: 'top-1',
      paymentRedirectUrl: 'https://sandbox.vnpayment.vn/pay',
      vnpaySdk: {
        tmnCode: 'TMN',
        scheme: 'vietride',
        isSandbox: true,
      },
    });

    resetPendingVnPaySessionMemory();
    await expect(getPendingVnPaySession()).resolves.toEqual(saved);

    await clearPendingVnPaySession();
    resetPendingVnPaySessionMemory();
    await expect(getPendingVnPaySession()).resolves.toBeNull();
  });

  it('rejects malformed stored JSON', () => {
    expect(parsePendingVnPaySession('{')).toBeNull();
    expect(parsePendingVnPaySession(JSON.stringify({ sessionId: 'x' }))).toBeNull();
  });
});
