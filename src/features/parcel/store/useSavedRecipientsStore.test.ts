import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLocalSessionUser } from '@shared/session/scope';
import {
  getSavedRecipientsStorageKey,
  SavedRecipientsStoreError,
  selectSortedRecipients,
  useSavedRecipientsStore,
} from './useSavedRecipientsStore';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';

const startSession = async (userId = USER_A): Promise<void> => {
  setLocalSessionUser(null);
  setLocalSessionUser(userId);
  useSavedRecipientsStore.getState().reset();
  await useSavedRecipientsStore.getState().loadRecipients();
};

describe('useSavedRecipientsStore', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await startSession();
  });

  afterEach(() => {
    setLocalSessionUser(null);
    useSavedRecipientsStore.getState().reset();
  });

  it('starts ready with an empty list for the authenticated user', () => {
    const state = useSavedRecipientsStore.getState();
    expect(state.ownerUserId).toBe(USER_A);
    expect(state.hydrationStatus).toBe('ready');
    expect(state.recipients).toEqual([]);
  });

  it('rejects local recipient access without an authenticated session', async () => {
    setLocalSessionUser(null);
    useSavedRecipientsStore.getState().reset();

    await expect(useSavedRecipientsStore.getState().addRecipient({
      fullName: 'Nguyễn Văn A',
      phoneNumber: '0901234567',
    })).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('persists recipient data under a per-user key', async () => {
    const created = await useSavedRecipientsStore.getState().addRecipient({
      fullName: 'Nguyễn Văn A',
      phoneNumber: '0901234567',
      email: 'a@example.com',
      label: 'home',
    });

    expect(created.id).toBeDefined();
    expect(useSavedRecipientsStore.getState().recipients).toHaveLength(1);
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(
      getSavedRecipientsStorageKey(USER_A),
      expect.stringContaining('Nguyễn Văn A'),
    );
  });

  it('does not expose an in-memory write when persistence fails', async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));

    await expect(useSavedRecipientsStore.getState().addRecipient({
      fullName: 'Không được lưu ảo',
      phoneNumber: '0901234567',
    })).rejects.toEqual(new SavedRecipientsStoreError('storage_write_failed'));

    expect(useSavedRecipientsStore.getState().recipients).toEqual([]);
  });

  it('marks hydration as error and does not overwrite storage on read failure', async () => {
    setLocalSessionUser(null);
    setLocalSessionUser(USER_B);
    useSavedRecipientsStore.getState().reset();
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('read failed'));

    await useSavedRecipientsStore.getState().loadRecipients();

    expect(useSavedRecipientsStore.getState()).toMatchObject({
      ownerUserId: USER_B,
      recipients: [],
      hydrationStatus: 'error',
      isLoaded: false,
    });
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('keeps different accounts isolated', async () => {
    await useSavedRecipientsStore.getState().addRecipient({
      fullName: 'Người nhận A',
      phoneNumber: '0901111111',
    });

    await startSession(USER_B);
    expect(useSavedRecipientsStore.getState().recipients).toEqual([]);
    await useSavedRecipientsStore.getState().addRecipient({
      fullName: 'Người nhận B',
      phoneNumber: '0902222222',
    });

    await startSession(USER_A);
    expect(useSavedRecipientsStore.getState().recipients.map(item => item.fullName))
      .toEqual(['Người nhận A']);
  });

  it('migrates a legacy per-user address book without using the shared guest bucket', async () => {
    setLocalSessionUser(null);
    setLocalSessionUser(USER_B);
    useSavedRecipientsStore.getState().reset();
    await AsyncStorage.setItem(
      `vietride:saved-recipients:v1:${USER_B}`,
      JSON.stringify({
        version: 1,
        items: [{
          id: 'legacy-user-recipient',
          fullName: 'Người nhận cũ',
          phoneNumber: '0906666666',
          email: '',
          isDefault: true,
          lastUsedAt: 100,
          createdAt: 50,
        }],
      }),
    );
    await AsyncStorage.setItem(
      'vietride:saved-recipients:v1:guest',
      JSON.stringify({ version: 1, items: [] }),
    );

    await useSavedRecipientsStore.getState().loadRecipients();

    expect(useSavedRecipientsStore.getState().recipients[0]?.id)
      .toBe('legacy-user-recipient');
    await expect(AsyncStorage.getItem(getSavedRecipientsStorageKey(USER_B)))
      .resolves.toContain('legacy-user-recipient');
  });

  it('ignores hydration that completes after the account changes', async () => {
    let resolveRead: ((value: string | null) => void) | undefined;
    jest.mocked(AsyncStorage.getItem).mockImplementationOnce(() => new Promise(resolve => {
      resolveRead = resolve;
    }));
    setLocalSessionUser(null);
    setLocalSessionUser(USER_B);
    useSavedRecipientsStore.getState().reset();

    const pendingLoad = useSavedRecipientsStore.getState().loadRecipients();
    setLocalSessionUser(USER_A);
    useSavedRecipientsStore.getState().reset();
    resolveRead?.(JSON.stringify({
      version: 2,
      items: [{
        id: 'stale',
        fullName: 'Dữ liệu cũ',
        phoneNumber: '0903333333',
        email: '',
        isDefault: false,
        lastUsedAt: 1,
        createdAt: 1,
      }],
    }));
    await pendingLoad;

    expect(useSavedRecipientsStore.getState()).toMatchObject({
      ownerUserId: null,
      recipients: [],
      hydrationStatus: 'idle',
    });
  });

  it('serializes concurrent mutations without losing a recipient', async () => {
    await Promise.all([
      useSavedRecipientsStore.getState().addRecipient({
        fullName: 'Recipient 1',
        phoneNumber: '0901111111',
      }),
      useSavedRecipientsStore.getState().addRecipient({
        fullName: 'Recipient 2',
        phoneNumber: '0902222222',
      }),
    ]);

    expect(useSavedRecipientsStore.getState().recipients).toHaveLength(2);
    const persisted = await AsyncStorage.getItem(getSavedRecipientsStorageKey(USER_A));
    expect(JSON.parse(persisted ?? '{}').items).toHaveLength(2);
  });

  it('enforces normalized phone uniqueness', async () => {
    await useSavedRecipientsStore.getState().addRecipient({
      fullName: 'Recipient 1',
      phoneNumber: '0901111111',
    });

    await expect(useSavedRecipientsStore.getState().addRecipient({
      fullName: 'Recipient duplicate',
      phoneNumber: '090 111 1111',
    })).rejects.toMatchObject({ code: 'duplicate_phone' });
  });

  it('keeps exactly one default recipient', async () => {
    const store = useSavedRecipientsStore.getState();
    const first = await store.addRecipient({
      fullName: 'Recipient 1',
      phoneNumber: '0901111111',
      isDefault: true,
    });
    const second = await store.saveOrTouchRecipient({
      fullName: 'Recipient 2',
      phoneNumber: '0902222222',
      isDefault: true,
    });

    const recipients = useSavedRecipientsStore.getState().recipients;
    expect(recipients.find(item => item.id === first.id)?.isDefault).toBe(false);
    expect(recipients.find(item => item.id === second.id)?.isDefault).toBe(true);
  });

  it('restores the exact metadata used by undo', async () => {
    const created = await useSavedRecipientsStore.getState().addRecipient({
      fullName: 'To restore',
      phoneNumber: '0904444444',
      email: 'restore@example.com',
      label: 'family',
      isDefault: true,
      lastUsedAt: 1234,
    });
    await useSavedRecipientsStore.getState().deleteRecipient(created.id);
    const restored = await useSavedRecipientsStore.getState().restoreRecipient(created);

    expect(restored).toEqual(created);
    expect(useSavedRecipientsStore.getState().recipients[0]).toEqual(created);
  });

  it('updates an existing entry instead of duplicating the same phone', async () => {
    const existing = await useSavedRecipientsStore.getState().addRecipient({
      fullName: 'Existing User',
      phoneNumber: '0905555555',
      email: 'exist@example.com',
      lastUsedAt: 1000,
    });
    const result = await useSavedRecipientsStore.getState().saveOrTouchRecipient({
      fullName: 'Existing User Renamed',
      phoneNumber: '0905555555',
      email: 'newemail@example.com',
    });

    expect(result.id).toBe(existing.id);
    expect(result.fullName).toBe('Existing User Renamed');
    expect(result.email).toBe('newemail@example.com');
    expect(useSavedRecipientsStore.getState().recipients).toHaveLength(1);
  });

  it('sorts default first and then by recent use without mutating input', () => {
    const items = [
      { id: '1', fullName: 'A', phoneNumber: '1', email: '', lastUsedAt: 100, createdAt: 100, isDefault: false },
      { id: '2', fullName: 'B', phoneNumber: '2', email: '', lastUsedAt: 300, createdAt: 100, isDefault: false },
      { id: '3', fullName: 'C', phoneNumber: '3', email: '', lastUsedAt: 50, createdAt: 100, isDefault: true },
    ];

    expect(selectSortedRecipients(items).map(item => item.id)).toEqual(['3', '2', '1']);
    expect(items.map(item => item.id)).toEqual(['1', '2', '3']);
  });
});
