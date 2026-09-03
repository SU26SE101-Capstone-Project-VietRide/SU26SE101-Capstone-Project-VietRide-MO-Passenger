import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'vietride:favorite-routes';
const STORAGE_VERSION = 1;
export const MAX_FAVORITE_ROUTES = 6;

export interface FavoriteRouteInput {
  originCode: string;
  originName: string;
  destinationCode: string;
  destinationName: string;
}

export interface FavoriteRoute extends FavoriteRouteInput {
  id: string;
  savedAt: number;
}

interface FavoriteRouteEnvelope {
  version: typeof STORAGE_VERSION;
  items: readonly FavoriteRoute[];
}

const normalizeText = (value: unknown): string => (
  typeof value === 'string' ? value.trim() : ''
);

export const favoriteRouteId = (
  originCode: string,
  destinationCode: string,
): string => `${originCode.trim()}:${destinationCode.trim()}`;

const normalizeFavoriteRoute = (value: unknown): FavoriteRoute | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<FavoriteRoute>;
  const originCode = normalizeText(candidate.originCode);
  const originName = normalizeText(candidate.originName);
  const destinationCode = normalizeText(candidate.destinationCode);
  const destinationName = normalizeText(candidate.destinationName);
  if (!originCode || !originName || !destinationCode || !destinationName) return null;
  if (originCode === destinationCode) return null;

  return {
    id: favoriteRouteId(originCode, destinationCode),
    originCode,
    originName,
    destinationCode,
    destinationName,
    savedAt: typeof candidate.savedAt === 'number' && Number.isFinite(candidate.savedAt)
      ? candidate.savedAt
      : 0,
  };
};

export const favoriteRoutesStorageKey = (userId?: string | null): string => {
  const namespace = normalizeText(userId) || 'guest';
  return `${STORAGE_PREFIX}:v${STORAGE_VERSION}:${namespace}`;
};

export const parseFavoriteRoutes = (raw: string | null): FavoriteRoute[] => {
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  const items = parsed
    && typeof parsed === 'object'
    && (parsed as Partial<FavoriteRouteEnvelope>).version === STORAGE_VERSION
      ? (parsed as Partial<FavoriteRouteEnvelope>).items
      : null;
  if (!Array.isArray(items)) {
    throw new Error('Favorite-route storage has an unsupported schema.');
  }

  const unique = new Map<string, FavoriteRoute>();
  for (const item of items) {
    const normalized = normalizeFavoriteRoute(item);
    if (normalized && !unique.has(normalized.id)) unique.set(normalized.id, normalized);
  }

  return Array.from(unique.values())
    .sort((left, right) => right.savedAt - left.savedAt)
    .slice(0, MAX_FAVORITE_ROUTES);
};

const serializeFavoriteRoutes = (items: readonly FavoriteRoute[]): string => JSON.stringify({
  version: STORAGE_VERSION,
  items,
} satisfies FavoriteRouteEnvelope);

interface FavoriteRoutesState {
  items: FavoriteRoute[];
  isLoading: boolean;
  error: string | null;
  toggleRoute: (route: FavoriteRouteInput) => Promise<'added' | 'removed' | 'invalid' | 'storage_error'>;
  removeRoute: (routeId: string) => Promise<boolean>;
}

export function useFavoriteRoutes(userId?: string | null): FavoriteRoutesState {
  const storageKey = favoriteRoutesStorageKey(userId);
  const activeKeyRef = useRef(storageKey);
  const itemsRef = useRef<FavoriteRoute[]>([]);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const initializationRef = useRef<Promise<void>>(Promise.resolve());
  const [items, setItems] = useState<FavoriteRoute[]>([]);
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
        const next = parseFavoriteRoutes(raw);
        if (!cancelled && activeKeyRef.current === storageKey) {
          itemsRef.current = next;
          setItems(next);
        }
        if (raw && raw !== serializeFavoriteRoutes(next)) {
          await AsyncStorage.setItem(storageKey, serializeFavoriteRoutes(next));
        }
      } catch {
        await AsyncStorage.removeItem(storageKey).catch(() => undefined);
        if (!cancelled && activeKeyRef.current === storageKey) {
          itemsRef.current = [];
          setItems([]);
          setError('Favorite routes could not be restored.');
        }
      } finally {
        if (!cancelled && activeKeyRef.current === storageKey) setIsLoading(false);
      }
    };

    const promise = load();
    initializationRef.current = promise;
    promise.catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const enqueueWrite = useCallback((write: () => Promise<void>): Promise<void> => {
    const queued = writeQueueRef.current.catch(() => undefined).then(write);
    writeQueueRef.current = queued;
    return queued;
  }, []);

  const commit = useCallback(async (
    previous: FavoriteRoute[],
    next: FavoriteRoute[],
  ): Promise<boolean> => {
    const targetKey = activeKeyRef.current;
    await initializationRef.current.catch(() => undefined);
    if (activeKeyRef.current !== targetKey) return false;

    // Keep taps responsive, but only confirm success after storage has committed.
    // A failed write rolls back when no newer mutation has superseded this state.
    itemsRef.current = next;
    setItems(next);
    setError(null);
    try {
      await enqueueWrite(() => AsyncStorage.setItem(targetKey, serializeFavoriteRoutes(next)));
      return activeKeyRef.current === targetKey;
    } catch {
      if (activeKeyRef.current === targetKey) {
        if (itemsRef.current === next) {
          itemsRef.current = previous;
          setItems(previous);
        }
        setError('Favorite routes could not be saved.');
      }
      return false;
    }
  }, [enqueueWrite]);

  const toggleRoute = useCallback(async (
    route: FavoriteRouteInput,
  ): Promise<'added' | 'removed' | 'invalid' | 'storage_error'> => {
    const normalized = normalizeFavoriteRoute({ ...route, savedAt: Date.now() });
    if (!normalized) return 'invalid';
    await initializationRef.current.catch(() => undefined);
    const current = itemsRef.current;
    const exists = current.some(item => item.id === normalized.id);
    const next = exists
      ? current.filter(item => item.id !== normalized.id)
      : [normalized, ...current].slice(0, MAX_FAVORITE_ROUTES);
    const committed = await commit(current, next);
    if (!committed) return 'storage_error';
    return exists ? 'removed' : 'added';
  }, [commit]);

  const removeRoute = useCallback(async (routeId: string): Promise<boolean> => {
    await initializationRef.current.catch(() => undefined);
    const current = itemsRef.current;
    const next = current.filter(item => item.id !== routeId);
    if (next.length === current.length) return true;
    return commit(current, next);
  }, [commit]);

  return { items, isLoading, error, toggleRoute, removeRoute };
}
