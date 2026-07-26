import { useCallback, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isErrorWithCode,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
  statusCodes,
} from 'react-native-nitro-google-signin';

import { googleLogin } from '../api/authApi';
import { useAuthStore } from '../store/useAuthStore';

let configuredWebClientId: string | null = null;

const ensureGoogleSignInConfigured = (): void => {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!webClientId) {
    throw new Error('Google sign-in is not configured for this app build.');
  }

  if (configuredWebClientId !== webClientId) {
    GoogleOneTapSignIn.configure({ webClientId });
    configuredWebClientId = webClientId;
  }
};

const getGoogleErrorMessage = (error: unknown): string => {
  if (!isErrorWithCode(error)) {
    return error instanceof Error ? error.message : 'Google sign-in failed. Please try again.';
  }

  switch (error.code) {
    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
      return 'Google Play Services is unavailable or needs an update.';
    case statusCodes.DEVELOPER_ERROR:
      return 'Google sign-in is not configured correctly for this app build.';
    case statusCodes.IN_PROGRESS:
      return 'Google sign-in is already in progress.';
    default:
      return error.message || 'Google sign-in failed. Please try again.';
  }
};

const requestGoogleIdToken = async (): Promise<string | null> => {
  ensureGoogleSignInConfigured();
  await GoogleOneTapSignIn.checkPlayServices();

  let response = await GoogleOneTapSignIn.signIn();
  if (isNoSavedCredentialFoundResponse(response)) {
    response = await GoogleOneTapSignIn.createAccount();
  }
  if (isNoSavedCredentialFoundResponse(response)) {
    response = await GoogleOneTapSignIn.presentExplicitSignIn();
  }
  if (isCancelledResponse(response)) {
    return null;
  }
  if (!isSuccessResponse(response) || !response.data.idToken) {
    throw new Error('Google did not return a valid ID token.');
  }

  return response.data.idToken;
};

export function useGoogleLogin() {
  const setSession = useAuthStore((state) => state.setSession);
  const mutation = useMutation({
    mutationFn: async () => {
      const idToken = await requestGoogleIdToken();
      return idToken ? googleLogin({ idToken }) : null;
    },
    onSuccess: async (session) => {
      if (session) {
        await setSession(session);
      }
    },
  });

  const errorMessage = useMemo(
    () => (mutation.error ? getGoogleErrorMessage(mutation.error) : null),
    [mutation.error],
  );

  return {
    signInWithGoogle: useCallback(async (): Promise<boolean> => {
      mutation.reset();
      return (await mutation.mutateAsync()) !== null;
    }, [mutation]),
    isPending: mutation.isPending,
    errorMessage,
  };
}
