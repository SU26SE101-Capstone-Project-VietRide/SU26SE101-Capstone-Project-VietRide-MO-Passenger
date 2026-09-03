import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  selectSortedRecipients,
  useSavedRecipientsStore,
} from './useSavedRecipientsStore';

describe('useSavedRecipientsStore', () => {
  beforeEach(async () => {
    useSavedRecipientsStore.getState().reset();
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('initializes with empty recipients list', () => {
    const state = useSavedRecipientsStore.getState();
    expect(state.recipients).toEqual([]);
    expect(state.isLoaded).toBe(false);
  });

  it('adds a recipient and persists to AsyncStorage', async () => {
    const store = useSavedRecipientsStore.getState();
    const created = await store.addRecipient({
      fullName: 'Nguyễn Văn A',
      phoneNumber: '0901234567',
      email: 'a@example.com',
      label: 'home',
    });

    expect(created.id).toBeDefined();
    expect(created.fullName).toBe('Nguyễn Văn A');
    expect(created.phoneNumber).toBe('0901234567');
    expect(created.label).toBe('home');

    const state = useSavedRecipientsStore.getState();
    expect(state.recipients).toHaveLength(1);
    expect(state.recipients[0].id).toBe(created.id);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining('vietride:saved-recipients'),
      expect.stringContaining('Nguyễn Văn A'),
    );
  });

  it('updates an existing recipient and handles default status exclusivity', async () => {
    const store = useSavedRecipientsStore.getState();
    const r1 = await store.addRecipient({
      fullName: 'Recipient 1',
      phoneNumber: '0901111111',
      email: 'r1@example.com',
      isDefault: true,
    });
    const r2 = await store.addRecipient({
      fullName: 'Recipient 2',
      phoneNumber: '0902222222',
      email: 'r2@example.com',
    });

    expect(useSavedRecipientsStore.getState().recipients.find(r => r.id === r1.id)?.isDefault).toBe(true);

    // Set r2 as default
    await store.updateRecipient(r2.id, { isDefault: true, fullName: 'Recipient 2 Updated' });

    const state = useSavedRecipientsStore.getState();
    const updatedR1 = state.recipients.find(r => r.id === r1.id);
    const updatedR2 = state.recipients.find(r => r.id === r2.id);

    expect(updatedR2?.isDefault).toBe(true);
    expect(updatedR2?.fullName).toBe('Recipient 2 Updated');
    expect(updatedR1?.isDefault).toBe(false);
  });

  it('deletes a recipient by id', async () => {
    const store = useSavedRecipientsStore.getState();
    const r = await store.addRecipient({
      fullName: 'To Delete',
      phoneNumber: '0903333333',
      email: 'del@example.com',
    });

    expect(useSavedRecipientsStore.getState().recipients).toHaveLength(1);

    const deleted = await store.deleteRecipient(r.id);
    expect(deleted).toBe(true);
    expect(useSavedRecipientsStore.getState().recipients).toHaveLength(0);
  });

  it('touches a recipient to bump lastUsedAt', async () => {
    const store = useSavedRecipientsStore.getState();
    const r = await store.addRecipient({
      fullName: 'To Touch',
      phoneNumber: '0904444444',
      email: 'touch@example.com',
      lastUsedAt: 1000,
    });

    await store.touchRecipient(r.id);

    const updated = useSavedRecipientsStore.getState().recipients.find(i => i.id === r.id);
    expect(updated?.lastUsedAt).toBeGreaterThan(1000);
  });

  it('saveOrTouchRecipient updates existing entry if phone matches', async () => {
    const store = useSavedRecipientsStore.getState();
    const existing = await store.addRecipient({
      fullName: 'Existing User',
      phoneNumber: '0905555555',
      email: 'exist@example.com',
      lastUsedAt: 1000,
    });

    const result = await store.saveOrTouchRecipient({
      fullName: 'Existing User Renamed',
      phoneNumber: '0905555555',
      email: 'newemail@example.com',
    });

    expect(result.id).toBe(existing.id);
    expect(result.fullName).toBe('Existing User Renamed');
    expect(result.email).toBe('newemail@example.com');
    expect(result.lastUsedAt).toBeGreaterThan(1000);
    expect(useSavedRecipientsStore.getState().recipients).toHaveLength(1);
  });

  it('saveOrTouchRecipient adds new entry if phone does not match', async () => {
    const store = useSavedRecipientsStore.getState();
    await store.addRecipient({
      fullName: 'User 1',
      phoneNumber: '0901111111',
      email: 'u1@example.com',
    });

    const result = await store.saveOrTouchRecipient({
      fullName: 'User 2',
      phoneNumber: '0902222222',
      email: 'u2@example.com',
    });

    expect(result.fullName).toBe('User 2');
    expect(useSavedRecipientsStore.getState().recipients).toHaveLength(2);
  });

  it('selectSortedRecipients puts default first, then most recently used', () => {
    const items = [
      { id: '1', fullName: 'A', phoneNumber: '1', email: '', lastUsedAt: 100, createdAt: 100, isDefault: false },
      { id: '2', fullName: 'B', phoneNumber: '2', email: '', lastUsedAt: 300, createdAt: 100, isDefault: false },
      { id: '3', fullName: 'C', phoneNumber: '3', email: '', lastUsedAt: 50, createdAt: 100, isDefault: true },
    ];

    const sorted = selectSortedRecipients(items);
    expect(sorted[0].id).toBe('3'); // Default is always first
    expect(sorted[1].id).toBe('2'); // lastUsedAt 300
    expect(sorted[2].id).toBe('1'); // lastUsedAt 100
  });

  it('loads recipients from AsyncStorage on loadRecipients', async () => {
    const mockData = {
      version: 1,
      items: [
        {
          id: 'saved_1',
          fullName: 'Loaded User',
          phoneNumber: '0907777777',
          email: 'loaded@example.com',
          lastUsedAt: 5000,
          createdAt: 5000,
        },
      ],
    };

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockData));

    await useSavedRecipientsStore.getState().loadRecipients();

    const state = useSavedRecipientsStore.getState();
    expect(state.isLoaded).toBe(true);
    expect(state.recipients).toHaveLength(1);
    expect(state.recipients[0].fullName).toBe('Loaded User');
  });
});
