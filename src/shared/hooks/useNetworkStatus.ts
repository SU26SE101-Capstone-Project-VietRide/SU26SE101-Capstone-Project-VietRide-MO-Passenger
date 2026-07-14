/**
 * useNetworkStatus — Monitors internet connectivity
 *
 * The single NetInfo subscription lives beside the QueryClient. This hook is
 * intentionally only a selector, avoiding duplicate native subscriptions.
 */

import { useAppStore } from '@shared/store';

export function useNetworkStatus(): boolean {
  return useAppStore((state) => state.isOnline);
}
