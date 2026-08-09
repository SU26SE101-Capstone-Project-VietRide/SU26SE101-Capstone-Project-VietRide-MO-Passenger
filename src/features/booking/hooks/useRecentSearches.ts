import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isValidBookingSeatCount } from '../constants/bookingLimits';

const STORAGE_PREFIX = 'vietride:recent-searches';
const STORAGE_VERSION = 1;
export const MAX_RECENT_SEARCHES = 8;

export interface RecentSearchInput {
  fromCode: string;
  fromName: string;
  toCode: string;
  toName: string;
  date: string;
  passengers: number;
}

export interface RecentSearch extends RecentSearchInput {
  id: string;
  savedAt: number;
}

interface RecentSearchEnvelope {
  version: typeof STORAGE_VERSION;
  items: readonly RecentSearch[];
}

const normalizeText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const createSearchId = (search: RecentSearchInput): string =>
  `${search.fromCode}:${search.toCode}:${search.date}`;

const isFinitePassengerCount = (value: unknown): value is number =>
  typeof value === 'number'
  && isValidBookingSeatCount(value);

const normalizeSearch = (value: unknown): RecentSearch | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<RecentSearch>;
  const input: RecentSearchInput = {
    fromCode: normalizeText(candidate.fromCode),
    fromName: normalizeText(candidate.fromName),
    toCode: normalizeText(candidate.toCode),
    toName: normalizeText(candidate.toName),
    date: normalizeText(candidate.date),
    passengers: isFinitePassengerCount(candidate.passengers)
      ? candidate.passengers
      : 1,
  };

  if (
    !input.fromCode
    || !input.fromName
    || !input.toCode
    || !input.toName
    || !input.date
  ) {
    return null;
  }

  return {
    ...input,
    id: createSearchId(input),
    savedAt: typeof candidate.savedAt === 'number' && Number.isFinite(candidate.savedAt)
      ? candidate.savedAt
      : 0,
  };
};

export const recentSearchStorageKey = (userId?: string | null): string => {
  const namespace = normalizeText(userId) || 'guest';
  return `${STORAGE_PREFIX}:v${STORAGE_VERSION}:${namespace}`;
};

export const parseRecentSearches = (raw: string | null): RecentSearch[] => {
  if (!raw) return [];

  const parsed = JSON.parse(raw) as unknown;
  const candidateItems = Array.isArray(parsed)
    ? parsed
    : parsed
      && typeof parsed === 'object'
      && (parsed as Partial<RecentSearchEnvelope>).version === STORAGE_VERSION
      ? (parsed as Partial<RecentSearchEnvelope>).items
      : null;

  if (!Array.isArray(candidateItems)) {
    throw new Error('Recent-search storage has an unsupported schema.');
  }

  const unique = new Map<string, RecentSearch>();
  candidateItems.forEach((item) => {
    const normalized = normalizeSearch(item);
    if (normalized && !unique.has(normalized.id)) {
      unique.set(normalized.id, normalized);
    }
  });

  return Array.from(unique.values())
    .sort((left, right) => right.savedAt - left.savedAt)
    .slice(0, MAX_RECENT_SEARCHES);
};

export const serializeRecentSearches = (items: readonly RecentSearch[]): string =>
  JSON.stringify({
    version: STORAGE_VERSION,
    items,
  } satisfies RecentSearchEnvelope);

export const upsertRecentSearch = (
  current: readonly RecentSearch[],
  input: RecentSearchInput,
  savedAt = Date.now(),
): RecentSearch[] => {
  const normalized = normalizeSearch({ ...input, savedAt });
  if (!normalized) return [...current];

  return [
    normalized,
    ...current.filter((item) => item.id !== normalized.id),
  ].slice(0, MAX_RECENT_SEARCHES);
};

interface RecentSearchesState {
  items: RecentSearch[];
  isLoading: boolean;
  error: string | null;
  saveSearch: (search: RecentSearchInput) => Promise<void>;
  clearSearches: () => Promise<void>;
}

export function useRecentSearches(userId?: string | null): RecentSearchesState {
  const storageKey = recentSearchStorageKey(userId);
  const activeKeyRef = useRef(storageKey);
  const itemsRef = useRef<RecentSearch[]>([]);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const initializationRef = useRef<{
    storageKey: string;
    promise: Promise<void>;
  }>({ storageKey, promise: Promise.resolve() });
  const [items, setItems] = useState<RecentSearch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    activeKeyRef.current = storageKey;
    itemsRef.current = [];
    setItems([]);
    setIsLoading(true);
    setError(null);

    const load = async (): Promise<void> => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        const nextItems = parseRecentSearches(raw);
        if (!cancelled && activeKeyRef.current === storageKey) {
          itemsRef.current = nextItems;
          setItems(nextItems);
        }

        if (raw && raw !== serializeRecentSearches(nextItems)) {
          await AsyncStorage.setItem(storageKey, serializeRecentSearches(nextItems));
        }
      } catch {
        await AsyncStorage.removeItem(storageKey).catch(() => undefined);
        if (!cancelled && activeKeyRef.current === storageKey) {
          itemsRef.current = [];
          setItems([]);
          setError('Recent searches could not be restored.');
        }
      } finally {
        if (!cancelled && activeKeyRef.current === storageKey) {
          setIsLoading(false);
        }
      }
    };

    const loadPromise = load();
    initializationRef.current = { storageKey, promise: loadPromise };
    loadPromise.catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const enqueueStorageWrite = useCallback((write: () => Promise<void>): Promise<void> => {
    const queued = writeQueueRef.current.catch(() => undefined).then(write);
    writeQueueRef.current = queued;
    return queued;
  }, []);

  const saveSearch = useCallback(async (search: RecentSearchInput): Promise<void> => {
    const targetKey = activeKeyRef.current;
    const initialization = initializationRef.current;
    if (initialization.storageKey === targetKey) {
      await initialization.promise.catch(() => undefined);
    }
    if (activeKeyRef.current !== targetKey) return;

    const nextItems = upsertRecentSearch(itemsRef.current, search);
    itemsRef.current = nextItems;
    setItems(nextItems);
    setError(null);

    try {
      await enqueueStorageWrite(() => (
        AsyncStorage.setItem(targetKey, serializeRecentSearches(nextItems))
      ));
    } catch {
      if (activeKeyRef.current === targetKey) {
        setError('Recent search could not be saved.');
      }
    }
  }, [enqueueStorageWrite]);

  const clearSearches = useCallback(async (): Promise<void> => {
    const targetKey = activeKeyRef.current;
    const initialization = initializationRef.current;
    if (initialization.storageKey === targetKey) {
      await initialization.promise.catch(() => undefined);
    }
    if (activeKeyRef.current !== targetKey) return;

    itemsRef.current = [];
    setItems([]);
    setError(null);

    try {
      await enqueueStorageWrite(() => AsyncStorage.removeItem(targetKey));
    } catch {
      if (activeKeyRef.current === targetKey) {
        setError('Recent searches could not be cleared.');
      }
    }
  }, [enqueueStorageWrite]);

  return { items, isLoading, error, saveSearch, clearSearches };
}
