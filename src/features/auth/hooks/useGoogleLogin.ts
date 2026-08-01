import { useCallback, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isErrorWithCode,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
  statusCodes,
} from 'react-native-nitro-google-signin';

import {
  ApiRequestError,
  getLocalizedApiErrorMessage,
  toApiError,
} from '@shared/api/errors';
import { googleLogin } from '../api/authApi';
import { AUTH_ERROR_TRANSLATION_KEYS } from '../authErrorKeys';
import { useAuthStore } from '../store/useAuthStore';

let configuredWebClientId: string | null = null;

const ensureGoogleSignInConfigured = (): void => {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!webClientId) {
    throw new ApiRequestError({
      code: 'GOOGLE_CONFIGURATION_ERROR',
      message: 'The Google web client ID is missing from this app build.',
    });
  }

  if (configuredWebClientId !== webClientId) {
    GoogleOneTapSignIn.configure({ webClientId });
    configuredWebClientId = webClientId;
  }
};

const toGoogleLoginError = (error: unknown): ApiRequestError => {
  if (error instanceof ApiRequestError) {
    return error;
  }

  if (!isErrorWithCode(error)) {
    return toApiError(error);
  }

  switch (error.code) {
    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
      return new ApiRequestError({
        code: 'GOOGLE_PLAY_SERVICES_UNAVAILABLE',
        message: 'Google Play Services is unavailable.',
      });
    case statusCodes.DEVELOPER_ERROR:
    case statusCodes.ONE_TAP_START_FAILED:
      return new ApiRequestError({
        code: 'GOOGLE_CONFIGURATION_ERROR',
        message: 'Google Sign-In rejected this app configuration.',
      });
    case statusCodes.IN_PROGRESS:
      return new ApiRequestError({
        code: 'GOOGLE_SIGN_IN_IN_PROGRESS',
        message: 'A Google Sign-In request is already in progress.',
      });
    default:
      return new ApiRequestError({
        code: 'GOOGLE_SIGN_IN_FAILED',
        message: `Google Sign-In failed with native code ${error.code}.`,
      });
  }
};

const isGoogleCancellation = (error: unknown): boolean =>
  isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED;

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
    throw new ApiRequestError({
      code: 'GOOGLE_ID_TOKEN_MISSING',
      message: 'Google Sign-In completed without an ID token.',
    });
  }

  return response.data.idToken;
};

export function useGoogleLogin() {
  const { t } = useTranslation();
  const setSession = useAuthStore((state) => state.setSession);
  const mutation = useMutation({
    mutationFn: async () => {
      try {
        const idToken = await requestGoogleIdToken();
        if (!idToken) {
          return null;
        }

        const session = await googleLogin({ idToken });
        await setSession(session);
        return session;
      } catch (error) {
        if (isGoogleCancellation(error)) {
          return null;
        }

        throw toGoogleLoginError(error);
      }
    },
  });

  const errorMessage = useMemo(
    () => mutation.error
      ? getLocalizedApiErrorMessage(
        mutation.error,
        t,
        AUTH_ERROR_TRANSLATION_KEYS,
      )
      : null,
    [mutation.error, t],
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
