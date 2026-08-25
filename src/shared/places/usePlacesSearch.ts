import { useCallback, useEffect, useRef } from 'react';

import { PlacesRequestError } from './errors';
import { goongPlacesProvider } from './goongPlacesProvider';
import type {
  FindPredictionsInput,
  PlacePrediction,
  PlacesProvider,
  ResolvedPlace,
  ResolvePlaceInput,
} from './types';

export type UsePlacesSearchResult = {
  findPredictions: (input: FindPredictionsInput) => Promise<PlacePrediction[]>;
  resolvePlaceDetails: (input: ResolvePlaceInput) => Promise<ResolvedPlace>;
  cancelSearch: () => void;
  cancelPendingRequests: () => void;
};

/** Owns request cancellation while keeping provider details out of screens. */
export function usePlacesSearch(
  provider: PlacesProvider = goongPlacesProvider,
): UsePlacesSearchResult {
  const searchControllerRef = useRef<AbortController | null>(null);
  const detailControllerRef = useRef<AbortController | null>(null);
  const searchSequenceRef = useRef(0);
  const detailSequenceRef = useRef(0);

  const cancelSearch = useCallback(() => {
    searchSequenceRef.current += 1;
    searchControllerRef.current?.abort();
    searchControllerRef.current = null;
  }, []);

  const cancelPendingRequests = useCallback(() => {
    cancelSearch();
    detailSequenceRef.current += 1;
    detailControllerRef.current?.abort();
    detailControllerRef.current = null;
  }, [cancelSearch]);

  const findPredictions = useCallback(async (
    input: FindPredictionsInput,
  ): Promise<PlacePrediction[]> => {
    cancelSearch();
    const requestSequence = searchSequenceRef.current;
    const controller = new AbortController();
    searchControllerRef.current = controller;

    try {
      const results = await provider.autocomplete(input, {
        signal: controller.signal,
      });
      if (
        controller.signal.aborted
        || requestSequence !== searchSequenceRef.current
      ) {
        throw new PlacesRequestError('ABORTED', 'Address search was cancelled.');
      }
      return results;
    } finally {
      if (searchControllerRef.current === controller) {
        searchControllerRef.current = null;
      }
    }
  }, [cancelSearch, provider]);

  const resolvePlaceDetails = useCallback(async (
    input: ResolvePlaceInput,
  ): Promise<ResolvedPlace> => {
    detailControllerRef.current?.abort();
    detailSequenceRef.current += 1;
    const requestSequence = detailSequenceRef.current;
    const controller = new AbortController();
    detailControllerRef.current = controller;
    try {
      const result = await provider.resolvePlace(input, { signal: controller.signal });
      if (
        controller.signal.aborted
        || requestSequence !== detailSequenceRef.current
      ) {
        throw new PlacesRequestError('ABORTED', 'Address search was cancelled.');
      }
      return result;
    } finally {
      if (detailControllerRef.current === controller) {
        detailControllerRef.current = null;
      }
    }
  }, [provider]);

  useEffect(() => () => {
    cancelPendingRequests();
  }, [cancelPendingRequests]);

  return {
    findPredictions,
    resolvePlaceDetails,
    cancelSearch,
    cancelPendingRequests,
  };
}
