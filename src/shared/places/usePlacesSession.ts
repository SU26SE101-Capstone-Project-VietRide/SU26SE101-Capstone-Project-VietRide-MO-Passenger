/**
 * Owns a single Google Places autocomplete session for the mounted screen.
 *
 * Features should not hold sessionId refs or call begin/end directly —
 * use this hook, then pass `controller` into resolveMapPlaceSelection.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { PlacesSessionController } from './resolveMapPlaceSelection';
import {
  beginPlacesSession,
  endPlacesSession,
  findPlacePredictions,
  isPlacesRequestError,
  type FindPredictionsInput,
  type PlacePrediction,
} from './vietRidePlaces';

export type UsePlacesSessionResult = {
  /** Live session id; create if missing. */
  ensureSession: (options?: { forceNew?: boolean }) => Promise<string>;
  /** End + begin a new session. */
  rotateSession: () => Promise<string>;
  /** End native session and clear local id. */
  endSession: () => Promise<void>;
  /** Clear local id only (native already closed the session). */
  clearLocalSession: () => void;
  /**
   * Autocomplete with one INVALID_SESSION retry (rotates then re-runs).
   * Prefer this over calling findPlacePredictions with a raw session id.
   */
  findPredictions: (
    input: Omit<FindPredictionsInput, 'sessionId'>,
  ) => Promise<PlacePrediction[]>;
  /** Inject into resolveMapPlaceSelection / other shared helpers. */
  controller: PlacesSessionController;
};

export function usePlacesSession(): UsePlacesSessionResult {
  const sessionIdRef = useRef<string | null>(null);

  const clearLocalSession = useCallback(() => {
    sessionIdRef.current = null;
  }, []);

  const endSession = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    sessionIdRef.current = null;
    if (sessionId) {
      await endPlacesSession(sessionId);
    }
  }, []);

  const ensureSession = useCallback(async (options?: { forceNew?: boolean }): Promise<string> => {
    if (options?.forceNew) {
      const previous = sessionIdRef.current;
      sessionIdRef.current = null;
      if (previous) {
        await endPlacesSession(previous);
      }
    } else if (sessionIdRef.current) {
      return sessionIdRef.current;
    }

    const sessionId = await beginPlacesSession();
    sessionIdRef.current = sessionId;
    return sessionId;
  }, []);

  const rotateSession = useCallback(
    () => ensureSession({ forceNew: true }),
    [ensureSession],
  );

  const findPredictions = useCallback(async (
    input: Omit<FindPredictionsInput, 'sessionId'>,
  ): Promise<PlacePrediction[]> => {
    let sessionId = await ensureSession();
    try {
      return await findPlacePredictions({ ...input, sessionId });
    } catch (error) {
      if (!isPlacesRequestError(error) || error.code !== 'INVALID_SESSION') {
        throw error;
      }
      sessionId = await ensureSession({ forceNew: true });
      return findPlacePredictions({ ...input, sessionId });
    }
  }, [ensureSession]);

  const controller = useMemo<PlacesSessionController>(() => ({
    ensure: () => ensureSession(),
    rotate: () => ensureSession({ forceNew: true }),
    clearLocal: clearLocalSession,
  }), [clearLocalSession, ensureSession]);

  useEffect(() => () => {
    endSession().catch(() => undefined);
  }, [endSession]);

  return {
    ensureSession,
    rotateSession,
    endSession,
    clearLocalSession,
    findPredictions,
    controller,
  };
}
