/**
 * useNetworkStatus — Monitors internet connectivity
 *
 * Syncs the network state with the Zustand appStore so that
 * components and API logic can respond to connectivity changes.
 */

import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAppStore } from '@shared/store';

export function useNetworkStatus(): boolean {
  const isOnline = useAppStore((state) => state.isOnline);
  const setOnline = useAppStore((state) => state.setOnline);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? false;
      setOnline(connected);
    });

    return () => {
      unsubscribe();
    };
  }, [setOnline]);

  return isOnline;
}
