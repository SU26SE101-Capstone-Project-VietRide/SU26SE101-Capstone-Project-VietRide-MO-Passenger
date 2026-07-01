import { useEffect } from 'react';

import { queryClient } from '@shared/api/queryClient';
import { setTokenRefreshSuccessHandler } from '@shared/api/tokenRefresh';
import { authKeys } from '../api/authApi';
import { mapAuthUser, type AuthUserDto } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { useCurrentUser } from './useCurrentUser';

export function useAuthSync(): void {
  const setUser = useAuthStore((state) => state.setUser);
  const currentUserQuery = useCurrentUser();

  useEffect(() => {
    if (currentUserQuery.data) {
      setUser(currentUserQuery.data);
    }
  }, [currentUserQuery.data, setUser]);

  useEffect(() => {
    setTokenRefreshSuccessHandler((bundle) => {
      if (!bundle.user) {
        return;
      }

      const { isGuest, setUser: setStoreUser } = useAuthStore.getState();

      if (isGuest) {
        return;
      }

      const user = mapAuthUser(bundle.user as AuthUserDto);
      queryClient.setQueryData(authKeys.me, user);
      setStoreUser(user);
    });

    return () => {
      setTokenRefreshSuccessHandler(null);
    };
  }, []);
}
