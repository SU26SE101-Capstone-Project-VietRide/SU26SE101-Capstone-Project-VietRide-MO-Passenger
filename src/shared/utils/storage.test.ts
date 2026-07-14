const mockGetItemAsync = jest.fn();
const mockSetItemAsync = jest.fn();
const mockDeleteItemAsync = jest.fn();

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: (...args: unknown[]) => mockGetItemAsync(...args),
  setItemAsync: (...args: unknown[]) => mockSetItemAsync(...args),
  deleteItemAsync: (...args: unknown[]) => mockDeleteItemAsync(...args),
}));

const loadStorage = (): typeof import('./storage') =>
  jest.requireActual<typeof import('./storage')>('./storage');

describe('secure token storage', () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetItemAsync.mockReset();
    mockSetItemAsync.mockReset();
    mockDeleteItemAsync.mockReset();
    mockSetItemAsync.mockResolvedValue(undefined);
    mockDeleteItemAsync.mockResolvedValue(undefined);
  });

  it('hydrates SecureStore once and serves subsequent reads from memory', async () => {
    mockGetItemAsync.mockResolvedValue(JSON.stringify({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: 2_000_000_000_000,
    }));
    const storage = loadStorage();

    await expect(storage.getToken()).resolves.toBe('access-token');
    await expect(storage.getRefreshToken()).resolves.toBe('refresh-token');

    expect(mockGetItemAsync).toHaveBeenCalledTimes(1);
    expect(mockGetItemAsync).toHaveBeenCalledWith(
      expect.any(String),
      { keychainAccessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' },
    );
  });

  it('does not expose malformed persisted credentials', async () => {
    mockGetItemAsync.mockResolvedValue(JSON.stringify({
      accessToken: '',
      refreshToken: 'refresh-token',
    }));
    const storage = loadStorage();

    await expect(storage.getTokenBundle()).resolves.toBeNull();
  });

  it('prevents a stale write from restoring credentials after logout', async () => {
    let finishWrite: (() => void) | undefined;
    mockSetItemAsync.mockImplementationOnce(
      () => new Promise<void>((resolve) => {
        finishWrite = resolve;
      }),
    );
    const storage = loadStorage();
    const sessionEpoch = storage.beginTokenSession();

    const staleWrite = storage.setToken(
      'old-access-token',
      'old-refresh-token',
      3600,
      true,
      sessionEpoch,
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(mockSetItemAsync).toHaveBeenCalledTimes(1);

    const clear = storage.clearToken();
    finishWrite?.();

    await expect(staleWrite).resolves.toBe(false);
    await expect(clear).resolves.toBe(true);
    await expect(storage.getTokenBundle()).resolves.toBeNull();
    expect(mockDeleteItemAsync).toHaveBeenCalledTimes(1);
  });
});
