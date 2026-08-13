import { useEffect } from 'react';

import { setUnauthorizedHandler } from '@shared/api/axiosInstance';
import { toApiError } from '@shared/api/errors';
import { useAuthStore } from '../store/useAuthStore';

export function useAuthInitializer(): void {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    setUnauthorizedHandler((error) => {
      useAuthStore.getState().resetAuthState();
      if (error) {
        useAuthStore.setState({ authError: toApiError(error) });
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
