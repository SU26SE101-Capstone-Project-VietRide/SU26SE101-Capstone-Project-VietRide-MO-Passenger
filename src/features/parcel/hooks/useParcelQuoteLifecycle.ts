import { useEffect } from 'react';
import { AppState } from 'react-native';

import type { AvailableParcelTrip } from '../types';
import {
  getParcelQuoteRefreshDelayMs,
  getParcelQuoteSemanticFingerprint,
  hasParcelQuoteContract,
} from '../utils/parcelQuote';

export interface UseParcelQuoteLifecycleParams {
  enabled: boolean;
  selectedTrip: AvailableParcelTrip | null | undefined;
  selectedFingerprint: string | null;
  isSearchSuccess: boolean;
  isFetching: boolean;
  refetch: () => Promise<unknown>;
  clearQuoteDependentSelection: () => void;
  onPriceChanged?: () => void;
}

/**
 * Quote refresh + semantic reconfirm for checkout. Does not store raw tokens.
 * Selection remains tripId + semantic fingerprint owned by the screen.
 */
export function useParcelQuoteLifecycle({
  enabled,
  selectedTrip,
  selectedFingerprint,
  isSearchSuccess,
  isFetching,
  refetch,
  clearQuoteDependentSelection,
  onPriceChanged,
}: UseParcelQuoteLifecycleParams): void {
  useEffect(() => {
    if (!enabled || !isSearchSuccess || isFetching) {
      return;
    }

    // No selection yet — nothing to reconfirm.
    if (!selectedFingerprint && !selectedTrip) {
      return;
    }

    if (!selectedTrip || !hasParcelQuoteContract(selectedTrip)) {
      if (selectedFingerprint) {
        clearQuoteDependentSelection();
      }
      return;
    }

    const nextFingerprint = getParcelQuoteSemanticFingerprint(selectedTrip);
    if (
      selectedFingerprint
      && nextFingerprint
      && nextFingerprint !== selectedFingerprint
    ) {
      clearQuoteDependentSelection();
      onPriceChanged?.();
    }
  }, [
    clearQuoteDependentSelection,
    enabled,
    isFetching,
    isSearchSuccess,
    onPriceChanged,
    selectedFingerprint,
    selectedTrip,
  ]);

  useEffect(() => {
    if (!enabled || !selectedTrip?.quoteExpiresAt) {
      return;
    }

    const refreshDelayMs = getParcelQuoteRefreshDelayMs(
      selectedTrip.quoteExpiresAt,
    );
    const timer = setTimeout(() => {
      refetch().catch(() => undefined);
    }, refreshDelayMs);

    return () => clearTimeout(timer);
  }, [
    enabled,
    refetch,
    selectedTrip?.quoteExpiresAt,
    selectedTrip?.tripId,
  ]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        refetch().catch(() => undefined);
      }
    });

    return () => subscription.remove();
  }, [enabled, refetch]);
}
