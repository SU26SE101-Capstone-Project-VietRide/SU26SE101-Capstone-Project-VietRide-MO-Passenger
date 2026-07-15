import * as SecureStore from 'expo-secure-store';

type ResettableSecureStore = jest.Mocked<typeof SecureStore> & {
  __resetStore: () => void;
};

const secureStore = SecureStore as unknown as ResettableSecureStore;

describe('expo-secure-store Jest mock', () => {
  beforeEach(() => {
    secureStore.__resetStore();
  });

  afterAll(() => {
    secureStore.__resetStore();
  });

  it('persists and deletes values in memory', async () => {
    await secureStore.setItemAsync('token', 'secret');
    await expect(secureStore.getItemAsync('token')).resolves.toBe('secret');

    await secureStore.deleteItemAsync('token');
    await expect(secureStore.getItemAsync('token')).resolves.toBeNull();
  });

  it('clears persisted values and call history between tests', async () => {
    await secureStore.setItemAsync('token', 'secret');
    await secureStore.getItemAsync('token');
    secureStore.getItemAsync.mockResolvedValueOnce('stale override');

    secureStore.__resetStore();

    await expect(secureStore.getItemAsync('token')).resolves.toBeNull();
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(secureStore.getItemAsync).toHaveBeenCalledTimes(1);
  });
});
