/**
 * Saved Recipients Store — Zustand Store with AsyncStorage persistence
 *
 * Manages the user's parcel recipient address book.
 * Provides instant in-memory CRUD operations backed by asynchronous storage.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeVietnamPhone } from '@features/auth/validation/authValidation';
import type {
  CreateSavedRecipientInput,
  SavedRecipient,
  UpdateSavedRecipientInput,
} from '../types/savedRecipient';

const STORAGE_PREFIX = 'vietride:saved-recipients';
const STORAGE_VERSION = 1;
export const MAX_SAVED_RECIPIENTS = 50;

interface StoredEnvelope {
  version: number;
  items: SavedRecipient[];
}

let activeUserId: string | null = null;

export const setSavedRecipientsUserId = (userId: string | null): void => {
  activeUserId = userId;
};

export const getSavedRecipientsStorageKey = (userId?: string | null): string => {
  const resolved = (userId !== undefined ? userId : activeUserId)?.trim() || 'guest';
  return `${STORAGE_PREFIX}:v${STORAGE_VERSION}:${resolved}`;
};

const generateRecipientId = (): string =>
  `rcp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

interface SavedRecipientsState {
  recipients: SavedRecipient[];
  isLoaded: boolean;

  /** Loads persisted recipients from storage */
  loadRecipients: () => Promise<void>;

  /** Adds a new recipient to the address book */
  addRecipient: (input: CreateSavedRecipientInput) => Promise<SavedRecipient>;

  /** Updates an existing recipient */
  updateRecipient: (
    id: string,
    patch: UpdateSavedRecipientInput,
  ) => Promise<SavedRecipient | null>;

  /** Deletes a recipient by ID */
  deleteRecipient: (id: string) => Promise<boolean>;

  /** Marks a recipient as default (unsets default on others) */
  setDefaultRecipient: (id: string) => Promise<void>;

  /** Updates lastUsedAt timestamp to elevate recipient in quick-pick lists */
  touchRecipient: (id: string) => Promise<void>;

  /**
   * Helper to either touch an existing recipient (matched by normalized phone)
   * or add a new recipient entry.
   */
  saveOrTouchRecipient: (
    input: CreateSavedRecipientInput,
  ) => Promise<SavedRecipient>;

  /** Reset store state (used on logout/test cleanup) */
  reset: () => void;
}

const persistItems = async (items: SavedRecipient[]): Promise<void> => {
  try {
    const key = getSavedRecipientsStorageKey();
    const envelope: StoredEnvelope = {
      version: STORAGE_VERSION,
      items,
    };
    await AsyncStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Non-blocking storage write failure
  }
};

export const useSavedRecipientsStore = create<SavedRecipientsState>(
  (set, get) => ({
    recipients: [],
    isLoaded: false,

    loadRecipients: async () => {
      try {
        const key = getSavedRecipientsStorageKey();
        const raw = await AsyncStorage.getItem(key);
        if (!raw) {
          set({ recipients: [], isLoaded: true });
          return;
        }

        const envelope = JSON.parse(raw) as Partial<StoredEnvelope>;
        const rawItems = Array.isArray(envelope.items) ? envelope.items : [];
        const validated: SavedRecipient[] = rawItems
          .filter(
            item =>
              item &&
              typeof item.id === 'string' &&
              typeof item.fullName === 'string' &&
              typeof item.phoneNumber === 'string',
          )
          .map(item => ({
            id: item.id,
            fullName: item.fullName.trim(),
            phoneNumber: item.phoneNumber.trim(),
            email: (item.email ?? '').trim(),
            label: item.label,
            customLabel: item.customLabel?.trim(),
            isDefault: Boolean(item.isDefault),
            lastUsedAt: typeof item.lastUsedAt === 'number' ? item.lastUsedAt : Date.now(),
            createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
          }));

        set({ recipients: validated, isLoaded: true });
      } catch {
        set({ recipients: [], isLoaded: true });
      }
    },

    addRecipient: async input => {
      const now = Date.now();
      const newRecipient: SavedRecipient = {
        id: input.id ?? generateRecipientId(),
        fullName: input.fullName.trim(),
        phoneNumber: input.phoneNumber.trim(),
        email: (input.email ?? '').trim(),
        label: input.label,
        customLabel: input.customLabel?.trim(),
        isDefault: Boolean(input.isDefault),
        lastUsedAt: input.lastUsedAt ?? now,
        createdAt: now,
      };

      const current = get().recipients;
      let nextList = [newRecipient, ...current];

      if (newRecipient.isDefault) {
        nextList = nextList.map(item =>
          item.id === newRecipient.id
            ? item
            : item.isDefault
              ? { ...item, isDefault: false }
              : item,
        );
      }

      if (nextList.length > MAX_SAVED_RECIPIENTS) {
        nextList = nextList.slice(0, MAX_SAVED_RECIPIENTS);
      }

      set({ recipients: nextList });
      await persistItems(nextList);
      return newRecipient;
    },

    updateRecipient: async (id, patch) => {
      const current = get().recipients;
      const targetIndex = current.findIndex(r => r.id === id);
      if (targetIndex < 0) return null;

      const existing = current[targetIndex];
      const updated: SavedRecipient = {
        ...existing,
        fullName:
          patch.fullName !== undefined ? patch.fullName.trim() : existing.fullName,
        phoneNumber:
          patch.phoneNumber !== undefined
            ? patch.phoneNumber.trim()
            : existing.phoneNumber,
        email:
          patch.email !== undefined ? patch.email.trim() : existing.email,
        label: patch.label !== undefined ? patch.label : existing.label,
        customLabel:
          patch.customLabel !== undefined
            ? patch.customLabel?.trim()
            : existing.customLabel,
        isDefault:
          patch.isDefault !== undefined ? patch.isDefault : existing.isDefault,
        lastUsedAt:
          patch.lastUsedAt !== undefined ? patch.lastUsedAt : existing.lastUsedAt,
      };

      let nextList = current.map(item => (item.id === id ? updated : item));

      if (updated.isDefault) {
        nextList = nextList.map(item =>
          item.id === id
            ? item
            : item.isDefault
              ? { ...item, isDefault: false }
              : item,
        );
      }

      set({ recipients: nextList });
      await persistItems(nextList);
      return updated;
    },

    deleteRecipient: async id => {
      const current = get().recipients;
      const nextList = current.filter(r => r.id !== id);
      if (nextList.length === current.length) return false;

      set({ recipients: nextList });
      await persistItems(nextList);
      return true;
    },

    setDefaultRecipient: async id => {
      const current = get().recipients;
      const nextList = current.map(item => ({
        ...item,
        isDefault: item.id === id,
      }));
      set({ recipients: nextList });
      await persistItems(nextList);
    },

    touchRecipient: async id => {
      const current = get().recipients;
      const target = current.find(r => r.id === id);
      if (!target) return;

      const nextList = current.map(item =>
        item.id === id ? { ...item, lastUsedAt: Date.now() } : item,
      );
      set({ recipients: nextList });
      await persistItems(nextList);
    },

    saveOrTouchRecipient: async input => {
      const current = get().recipients;
      const normalizedPhone = normalizeVietnamPhone(input.phoneNumber);

      const existing = current.find(
        r =>
          normalizeVietnamPhone(r.phoneNumber) === normalizedPhone &&
          normalizedPhone.length > 0,
      );

      if (existing) {
        const patch: UpdateSavedRecipientInput = {
          lastUsedAt: Date.now(),
          fullName: input.fullName.trim() || existing.fullName,
          email: (input.email ?? '').trim() || existing.email,
        };
        if (input.label) patch.label = input.label;
        if (input.customLabel) patch.customLabel = input.customLabel;

        const updated = await get().updateRecipient(existing.id, patch);
        return updated ?? existing;
      }

      return get().addRecipient(input);
    },

    reset: () => {
      set({ recipients: [], isLoaded: false });
    },
  }),
);

/**
 * Returns recipients sorted for quick selection:
 * 1. Default recipient first (if set)
 * 2. Most recently used recipients next
 */
export const selectSortedRecipients = (
  recipients: readonly SavedRecipient[],
): SavedRecipient[] => {
  return [...recipients].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return b.lastUsedAt - a.lastUsedAt;
  });
};
