import AsyncStorage from '@react-native-async-storage/async-storage';

interface PendingWrite {
  value: string;
  timer: ReturnType<typeof setTimeout>;
  resolve: Array<() => void>;
  reject: Array<(error: unknown) => void>;
}

/**
 * AsyncStorage-compatible adapter that coalesces rapid writes per key.
 *
 * Zustand persist can call setItem for every keystroke/slider update. Writing
 * each intermediate state across the native bridge is unnecessary work and can
 * contribute to input/animation jank on lower-end devices. This adapter keeps
 * the latest value and commits it after a short idle window while preserving
 * promise semantics for callers.
 *
 * Storage operations are also serialized per key. Without that queue, a slow
 * older native write could finish after a newer flush and overwrite fresh
 * state even though JavaScript issued the writes in the correct order.
 */
export const createDebouncedAsyncStorage = (delayMs = 180) => {
  const pendingWrites = new Map<string, PendingWrite>();
  const operationChains = new Map<string, Promise<void>>();

  const enqueueOperation = (
    key: string,
    operation: () => Promise<void>,
  ): Promise<void> => {
    const previous = operationChains.get(key) ?? Promise.resolve();
    const current = previous
      .catch(() => undefined)
      .then(operation);

    operationChains.set(key, current);
    current.then(
      () => {
        if (operationChains.get(key) === current) operationChains.delete(key);
      },
      () => {
        if (operationChains.get(key) === current) operationChains.delete(key);
      },
    );
    return current;
  };

  const flush = async (key: string): Promise<void> => {
    const pending = pendingWrites.get(key);
    if (!pending) {
      // A previous flush may already be crossing the native bridge. Wait for
      // it so callers such as reset/logout can rely on flush as a barrier.
      const inFlight = operationChains.get(key);
      if (inFlight) await inFlight;
      return;
    }

    clearTimeout(pending.timer);
    pendingWrites.delete(key);

    try {
      await enqueueOperation(key, () => AsyncStorage.setItem(key, pending.value));
      pending.resolve.forEach(resolve => resolve());
    } catch (error) {
      pending.reject.forEach(reject => reject(error));
      throw error;
    }
  };

  return {
    getItem: async (key: string): Promise<string | null> => {
      // Rehydration should never observe an older on-disk value while a newer
      // local write is queued or still crossing the native bridge.
      await flush(key);
      return AsyncStorage.getItem(key);
    },
    setItem: (key: string, value: string): Promise<void> => new Promise((resolve, reject) => {
      const existing = pendingWrites.get(key);
      if (existing) {
        clearTimeout(existing.timer);
        existing.value = value;
        existing.resolve.push(resolve);
        existing.reject.push(reject);
        existing.timer = setTimeout(() => {
          flush(key).catch(() => undefined);
        }, delayMs);
        return;
      }

      const pending: PendingWrite = {
        value,
        resolve: [resolve],
        reject: [reject],
        timer: setTimeout(() => {
          flush(key).catch(() => undefined);
        }, delayMs),
      };
      pendingWrites.set(key, pending);
    }),
    removeItem: async (key: string): Promise<void> => {
      const pending = pendingWrites.get(key);
      if (pending) {
        clearTimeout(pending.timer);
        pendingWrites.delete(key);
      }

      try {
        await enqueueOperation(key, () => AsyncStorage.removeItem(key));
        // Removal intentionally supersedes a queued write. Treat the callers
        // of that write as complete only after the removal itself commits.
        pending?.resolve.forEach(resolve => resolve());
      } catch (error) {
        pending?.reject.forEach(reject => reject(error));
        throw error;
      }
    },
    flush,
  };
};
