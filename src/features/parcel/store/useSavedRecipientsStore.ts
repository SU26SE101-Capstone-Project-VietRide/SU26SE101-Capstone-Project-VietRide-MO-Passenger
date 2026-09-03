/**
 * User-scoped saved-recipient address book.
 *
 * Writes are serialized and persisted before Zustand is updated. This keeps
 * storage and UI in agreement and prevents an older failed write from rolling
 * back a newer successful mutation.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { normalizeVietnamPhone } from '@features/auth/validation/authValidation';
import { registerSessionCleanup } from '@shared/session/cleanup';
import {
  getLocalSessionScope,
  isLocalSessionScopeCurrent,
  type LocalSessionScope,
} from '@shared/session/scope';
import type {
  CreateSavedRecipientInput,
  RecipientLabel,
  SavedRecipient,
  UpdateSavedRecipientInput,
} from '../types/savedRecipient';

const STORAGE_PREFIX = 'vietride:saved-recipients';
const STORAGE_VERSION = 2;
const LEGACY_STORAGE_VERSION = 1;
export const MAX_SAVED_RECIPIENTS = 50;

const RECIPIENT_LABELS = new Set<RecipientLabel>([
  'home',
  'office',
  'family',
  'customer',
  'other',
]);

interface StoredEnvelope {
  version: number;
  items: SavedRecipient[];
}

export type SavedRecipientsHydrationStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error';

export type SavedRecipientsErrorCode =
  | 'unauthenticated'
  | 'not_ready'
  | 'stale_session'
  | 'storage_read_failed'
  | 'storage_write_failed'
  | 'duplicate_phone'
  | 'limit_reached';

export class SavedRecipientsStoreError extends Error {
  readonly code: SavedRecipientsErrorCode;

  constructor(code: SavedRecipientsErrorCode) {
    super(code);
    this.name = 'SavedRecipientsStoreError';
    this.code = code;
  }
}

export const getSavedRecipientsErrorKey = (error: unknown): string => {
  if (!(error instanceof SavedRecipientsStoreError)) {
    return 'parcel.recipients.storageError';
  }
  switch (error.code) {
    case 'duplicate_phone':
      return 'parcel.recipients.duplicatePhone';
    case 'limit_reached':
      return 'parcel.recipients.limitReached';
    case 'storage_read_failed':
      return 'parcel.recipients.loadError';
    default:
      return 'parcel.recipients.storageError';
  }
};

interface SavedRecipientsState {
  ownerUserId: string | null;
  recipients: SavedRecipient[];
  hydrationStatus: SavedRecipientsHydrationStatus;
  isLoaded: boolean;
  loadRecipients: () => Promise<void>;
  addRecipient: (input: CreateSavedRecipientInput) => Promise<SavedRecipient>;
  updateRecipient: (
    id: string,
    patch: UpdateSavedRecipientInput,
  ) => Promise<SavedRecipient | null>;
  deleteRecipient: (id: string) => Promise<boolean>;
  setDefaultRecipient: (id: string) => Promise<void>;
  touchRecipient: (id: string) => Promise<void>;
  saveOrTouchRecipient: (
    input: CreateSavedRecipientInput,
  ) => Promise<SavedRecipient>;
  restoreRecipient: (recipient: SavedRecipient) => Promise<SavedRecipient>;
  reset: () => void;
}

const emptyState = {
  ownerUserId: null,
  recipients: [],
  hydrationStatus: 'idle',
  isLoaded: false,
} satisfies Pick<
  SavedRecipientsState,
  'ownerUserId' | 'recipients' | 'hydrationStatus' | 'isLoaded'
>;

const requireAuthenticatedScope = (): LocalSessionScope => {
  const scope = getLocalSessionScope();
  if (!scope.userId) {
    throw new SavedRecipientsStoreError('unauthenticated');
  }
  return scope;
};

export const getSavedRecipientsStorageKey = (userId: string): string => {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    throw new SavedRecipientsStoreError('unauthenticated');
  }
  return `${STORAGE_PREFIX}:v${STORAGE_VERSION}:${normalizedUserId}`;
};

const getLegacySavedRecipientsStorageKey = (userId: string): string =>
  `${STORAGE_PREFIX}:v${LEGACY_STORAGE_VERSION}:${userId.trim()}`;

const generateRecipientId = (): string =>
  `rcp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

const normalizedPhone = (value: string): string =>
  normalizeVietnamPhone(value).trim();

const sanitizeStoredItems = (
  value: unknown,
  expectedVersion = STORAGE_VERSION,
): SavedRecipient[] => {
  if (!value || typeof value !== 'object') {
    throw new SavedRecipientsStoreError('storage_read_failed');
  }

  const envelope = value as Partial<StoredEnvelope>;
  if (envelope.version !== expectedVersion || !Array.isArray(envelope.items)) {
    throw new SavedRecipientsStoreError('storage_read_failed');
  }

  const seenIds = new Set<string>();
  const seenPhones = new Set<string>();
  let hasDefault = false;
  const recipients: SavedRecipient[] = [];

  for (const rawItem of envelope.items) {
    if (!rawItem || typeof rawItem !== 'object') continue;
    const item = rawItem as Partial<SavedRecipient>;
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const fullName = typeof item.fullName === 'string' ? item.fullName.trim() : '';
    const phoneNumber = typeof item.phoneNumber === 'string'
      ? normalizedPhone(item.phoneNumber)
      : '';
    if (!id || !fullName || !phoneNumber) continue;
    if (seenIds.has(id) || seenPhones.has(phoneNumber)) continue;

    seenIds.add(id);
    seenPhones.add(phoneNumber);
    const isDefault: boolean = Boolean(item.isDefault) && !hasDefault;
    hasDefault ||= isDefault;
    const label = item.label && RECIPIENT_LABELS.has(item.label)
      ? item.label
      : undefined;
    const now = Date.now();

    recipients.push({
      id,
      fullName,
      phoneNumber,
      email: typeof item.email === 'string' ? item.email.trim() : '',
      ...(label ? { label } : {}),
      ...(typeof item.customLabel === 'string' && item.customLabel.trim()
        ? { customLabel: item.customLabel.trim() }
        : {}),
      isDefault,
      lastUsedAt: typeof item.lastUsedAt === 'number' && Number.isFinite(item.lastUsedAt)
        ? item.lastUsedAt
        : now,
      createdAt: typeof item.createdAt === 'number' && Number.isFinite(item.createdAt)
        ? item.createdAt
        : now,
    });

    if (recipients.length === MAX_SAVED_RECIPIENTS) break;
  }

  return recipients;
};

const persistItems = async (
  scope: LocalSessionScope,
  items: readonly SavedRecipient[],
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      getSavedRecipientsStorageKey(scope.userId ?? ''),
      JSON.stringify({
        version: STORAGE_VERSION,
        items: [...items],
      } satisfies StoredEnvelope),
    );
  } catch {
    throw new SavedRecipientsStoreError('storage_write_failed');
  }
};

let hydration:
  | { scope: LocalSessionScope; promise: Promise<void> }
  | null = null;
let mutationQueue: Promise<void> = Promise.resolve();

const enqueueMutation = <T>(
  mutate: (current: SavedRecipient[]) => {
    next: SavedRecipient[];
    result: T;
  },
): Promise<T> => {
  const requestedScope = getLocalSessionScope();

  const operation = mutationQueue.then(async () => {
    if (!requestedScope.userId) {
      throw new SavedRecipientsStoreError('unauthenticated');
    }
    if (!isLocalSessionScopeCurrent(requestedScope)) {
      throw new SavedRecipientsStoreError('stale_session');
    }

    const state = useSavedRecipientsStore.getState();
    if (
      state.hydrationStatus !== 'ready'
      || state.ownerUserId !== requestedScope.userId
    ) {
      throw new SavedRecipientsStoreError('not_ready');
    }

    const { next, result } = mutate(state.recipients);
    if (next === state.recipients) return result;
    await persistItems(requestedScope, next);

    if (!isLocalSessionScopeCurrent(requestedScope)) {
      throw new SavedRecipientsStoreError('stale_session');
    }

    useSavedRecipientsStore.setState({ recipients: next });
    return result;
  });

  mutationQueue = operation.then(
    () => undefined,
    () => undefined,
  );
  return operation;
};

const assertUniquePhone = (
  items: readonly SavedRecipient[],
  phoneNumber: string,
  exceptId?: string,
): void => {
  if (items.some(item => item.id !== exceptId && normalizedPhone(item.phoneNumber) === phoneNumber)) {
    throw new SavedRecipientsStoreError('duplicate_phone');
  }
};

export const useSavedRecipientsStore = create<SavedRecipientsState>((set) => ({
  ...emptyState,

  loadRecipients: async () => {
    const scope = requireAuthenticatedScope();
    const current = useSavedRecipientsStore.getState();
    if (current.ownerUserId === scope.userId && current.hydrationStatus === 'ready') {
      return;
    }
    if (
      hydration
      && hydration.scope.epoch === scope.epoch
      && hydration.scope.userId === scope.userId
    ) {
      return hydration.promise;
    }

    set({
      ownerUserId: scope.userId,
      recipients: [],
      hydrationStatus: 'loading',
      isLoaded: false,
    });

    const promise = (async () => {
      try {
        const userId = scope.userId ?? '';
        const raw = await AsyncStorage.getItem(getSavedRecipientsStorageKey(userId));
        let items: SavedRecipient[];
        if (raw) {
          items = sanitizeStoredItems(JSON.parse(raw) as unknown);
        } else {
          const legacyRaw = await AsyncStorage.getItem(
            getLegacySavedRecipientsStorageKey(userId),
          );
          items = legacyRaw
            ? sanitizeStoredItems(
                JSON.parse(legacyRaw) as unknown,
                LEGACY_STORAGE_VERSION,
              )
            : [];
          if (legacyRaw) {
            await persistItems(scope, items);
          }
        }
        if (!isLocalSessionScopeCurrent(scope)) return;

        set({
          ownerUserId: scope.userId,
          recipients: items,
          hydrationStatus: 'ready',
          isLoaded: true,
        });
      } catch {
        if (!isLocalSessionScopeCurrent(scope)) return;
        set({
          ownerUserId: scope.userId,
          recipients: [],
          hydrationStatus: 'error',
          isLoaded: false,
        });
      } finally {
        if (
          hydration?.scope.epoch === scope.epoch
          && hydration.scope.userId === scope.userId
        ) {
          hydration = null;
        }
      }
    })();

    hydration = { scope, promise };
    return promise;
  },

  addRecipient: input => enqueueMutation(current => {
    if (current.length >= MAX_SAVED_RECIPIENTS) {
      throw new SavedRecipientsStoreError('limit_reached');
    }
    const phoneNumber = normalizedPhone(input.phoneNumber);
    assertUniquePhone(current, phoneNumber);
    const now = Date.now();
    const created: SavedRecipient = {
      id: input.id ?? generateRecipientId(),
      fullName: input.fullName.trim(),
      phoneNumber,
      email: (input.email ?? '').trim(),
      ...(input.label ? { label: input.label } : {}),
      ...(input.customLabel?.trim()
        ? { customLabel: input.customLabel.trim() }
        : {}),
      isDefault: Boolean(input.isDefault),
      lastUsedAt: input.lastUsedAt ?? now,
      createdAt: now,
    };
    const next = [
      created,
      ...current.map(item => (
        created.isDefault && item.isDefault
          ? { ...item, isDefault: false }
          : item
      )),
    ];
    return { next, result: created };
  }),

  updateRecipient: (id, patch) => enqueueMutation(current => {
    const existing = current.find(item => item.id === id);
    if (!existing) return { next: current, result: null };
    const phoneNumber = patch.phoneNumber !== undefined
      ? normalizedPhone(patch.phoneNumber)
      : existing.phoneNumber;
    assertUniquePhone(current, phoneNumber, id);

    const updated: SavedRecipient = {
      ...existing,
      ...(patch.fullName !== undefined ? { fullName: patch.fullName.trim() } : {}),
      phoneNumber,
      ...(patch.email !== undefined ? { email: patch.email.trim() } : {}),
      ...(patch.label !== undefined ? { label: patch.label } : {}),
      ...(patch.customLabel !== undefined
        ? { customLabel: patch.customLabel?.trim() }
        : {}),
      ...(patch.isDefault !== undefined ? { isDefault: patch.isDefault } : {}),
      ...(patch.lastUsedAt !== undefined ? { lastUsedAt: patch.lastUsedAt } : {}),
    };
    const next = current.map(item => {
      if (item.id === id) return updated;
      if (updated.isDefault && item.isDefault) return { ...item, isDefault: false };
      return item;
    });
    return { next, result: updated };
  }),

  deleteRecipient: id => enqueueMutation(current => {
    const next = current.filter(item => item.id !== id);
    return {
      next: next.length === current.length ? current : next,
      result: next.length !== current.length,
    };
  }),

  setDefaultRecipient: id => enqueueMutation(current => {
    if (!current.some(item => item.id === id)) {
      return { next: current, result: undefined };
    }
    return {
      next: current.map(item => ({ ...item, isDefault: item.id === id })),
      result: undefined,
    };
  }),

  touchRecipient: id => enqueueMutation(current => {
    if (!current.some(item => item.id === id)) {
      return { next: current, result: undefined };
    }
    return {
      next: current.map(item => (
        item.id === id ? { ...item, lastUsedAt: Date.now() } : item
      )),
      result: undefined,
    };
  }),

  saveOrTouchRecipient: input => enqueueMutation(current => {
    const phoneNumber = normalizedPhone(input.phoneNumber);
    const existing = current.find(
      item => normalizedPhone(item.phoneNumber) === phoneNumber,
    );
    if (existing) {
      const updated: SavedRecipient = {
        ...existing,
        fullName: input.fullName.trim() || existing.fullName,
        phoneNumber,
        email: (input.email ?? '').trim() || existing.email,
        ...(input.label ? { label: input.label } : {}),
        ...(input.customLabel?.trim()
          ? { customLabel: input.customLabel.trim() }
          : {}),
        lastUsedAt: Date.now(),
      };
      return {
        next: current.map(item => item.id === existing.id ? updated : item),
        result: updated,
      };
    }
    if (current.length >= MAX_SAVED_RECIPIENTS) {
      throw new SavedRecipientsStoreError('limit_reached');
    }
    const now = Date.now();
    const created: SavedRecipient = {
      id: input.id ?? generateRecipientId(),
      fullName: input.fullName.trim(),
      phoneNumber,
      email: (input.email ?? '').trim(),
      ...(input.label ? { label: input.label } : {}),
      ...(input.customLabel?.trim()
        ? { customLabel: input.customLabel.trim() }
        : {}),
      isDefault: Boolean(input.isDefault),
      lastUsedAt: input.lastUsedAt ?? now,
      createdAt: now,
    };
    const next = created.isDefault
      ? [created, ...current.map(item => (
          item.isDefault ? { ...item, isDefault: false } : item
        ))]
      : [created, ...current];
    return { next, result: created };
  }),

  restoreRecipient: recipient => enqueueMutation(current => {
    const phoneNumber = normalizedPhone(recipient.phoneNumber);
    assertUniquePhone(current, phoneNumber);
    if (current.length >= MAX_SAVED_RECIPIENTS) {
      throw new SavedRecipientsStoreError('limit_reached');
    }
    const restored = { ...recipient, phoneNumber };
    return {
      next: [
        restored,
        ...current.map(item => (
          restored.isDefault && item.isDefault
            ? { ...item, isDefault: false }
            : item
        )),
      ],
      result: restored,
    };
  }),

  reset: () => set(emptyState),
}));

registerSessionCleanup('saved-recipients', () => {
  hydration = null;
  useSavedRecipientsStore.getState().reset();
});

export const selectSortedRecipients = (
  recipients: readonly SavedRecipient[],
): SavedRecipient[] => [...recipients].sort((a, b) => {
  if (a.isDefault && !b.isDefault) return -1;
  if (!a.isDefault && b.isDefault) return 1;
  return b.lastUsedAt - a.lastUsedAt;
});
