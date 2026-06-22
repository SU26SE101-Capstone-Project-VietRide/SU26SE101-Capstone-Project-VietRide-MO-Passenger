import { useEffect } from 'react';

import { setUnauthorizedHandler } from '@shared/api/axiosInstance';
import { useAuthStore } from '../store/useAuthStore';

export function useAuthInitializer(): void {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      const { isGuest, resetAuthState } = useAuthStore.getState();

      if (!isGuest) {
        resetAuthState();
      }
    });

    initializeAuth().catch((error) => {
      if (__DEV__) {
        console.warn('[Auth] Initial session restore failed:', error);
      }
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [initializeAuth]);
}
