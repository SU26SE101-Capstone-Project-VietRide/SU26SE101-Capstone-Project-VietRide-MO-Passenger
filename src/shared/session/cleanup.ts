type SessionCleanupHandler = () => void;

const cleanupHandlers = new Map<string, SessionCleanupHandler>();

/** Register private feature state without coupling auth to feature modules. */
export const registerSessionCleanup = (
  key: string,
  handler: SessionCleanupHandler,
): void => {
  cleanupHandlers.set(key, handler);
};

export const clearSessionBoundState = (): void => {
  cleanupHandlers.forEach((handler) => {
    try {
      handler();
    } catch {
      if (__DEV__) {
        console.warn('[Session] A private-state cleanup handler failed.');
      }
    }
  });
};
