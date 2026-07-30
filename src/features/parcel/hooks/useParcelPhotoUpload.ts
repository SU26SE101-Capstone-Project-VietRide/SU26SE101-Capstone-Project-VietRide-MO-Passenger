import { useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import { ApiRequestError } from '@shared/api/errors';
import i18n from '@shared/i18n';
import { uploadImageToFirebase } from '@shared/lib/firebase/firebaseImageUploadService';
import { prepareImageUpload } from '@shared/lib/image/imagePreparationService';
import {
  getTokenSessionEpoch,
  isTokenSessionEpochCurrent,
} from '@shared/utils/storage';

interface CachedParcelPhoto {
  sourceUri: string;
  userId: string;
  downloadUrl: string;
}

interface InFlightParcelPhoto {
  sourceUri: string;
  userId: string;
  promise: Promise<string>;
}

const deletePreparedFile = (uri: string): Promise<void> =>
  FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);

/**
 * Uploads one passenger-owned parcel photo and reuses the resulting remote URL
 * while the same draft is retried. The Firebase service serializes temporary
 * auth sessions; this hook additionally prevents duplicate work from rapid taps.
 */
export function useParcelPhotoUpload() {
  const cachedRef = useRef<CachedParcelPhoto | null>(null);
  const inFlightRef = useRef<InFlightParcelPhoto | null>(null);

  const mutation = useMutation({
    mutationFn: (sourceUri: string): Promise<string> => {
      const normalizedUri = sourceUri.trim();
      const user = useAuthStore.getState().user;
      if (!normalizedUri) {
        return Promise.reject(new Error(i18n.t('parcel.errors.photoUriEmpty')));
      }
      if (!user) {
        return Promise.reject(
          new Error(i18n.t('parcel.errors.photoUploadRequiresLogin')),
        );
      }

      const cached = cachedRef.current;
      if (
        cached
        && cached.sourceUri === normalizedUri
        && cached.userId === user.id
      ) {
        return Promise.resolve(cached.downloadUrl);
      }

      const currentFlight = inFlightRef.current;
      if (
        currentFlight
        && currentFlight.sourceUri === normalizedUri
        && currentFlight.userId === user.id
      ) {
        return currentFlight.promise;
      }

      const sessionEpoch = getTokenSessionEpoch();
      const upload = (async (): Promise<string> => {
        const preparedImage = await prepareImageUpload({ uri: normalizedUri });

        try {
          const downloadUrl = await uploadImageToFirebase({
            uri: preparedImage.uri,
            mimeType: preparedImage.mimeType,
            purpose: 'PARCEL_PHOTO',
          });

          if (
            !isTokenSessionEpochCurrent(sessionEpoch)
            || useAuthStore.getState().user?.id !== user.id
          ) {
            throw new ApiRequestError({
              message: i18n.t('parcel.errors.sessionChanged'),
              code: 'SESSION_INVALIDATED',
            });
          }

          cachedRef.current = {
            sourceUri: normalizedUri,
            userId: user.id,
            downloadUrl,
          };
          return downloadUrl;
        } finally {
          await deletePreparedFile(preparedImage.uri);
        }
      })();

      inFlightRef.current = {
        sourceUri: normalizedUri,
        userId: user.id,
        promise: upload,
      };
      upload.finally(() => {
        if (inFlightRef.current?.promise === upload) {
          inFlightRef.current = null;
        }
      }).catch(() => undefined);

      return upload;
    },
    retry: 0,
  });

  const reset = useCallback(() => {
    cachedRef.current = null;
  }, []);

  return {
    uploadParcelPhoto: mutation.mutateAsync,
    isUploadingParcelPhoto: mutation.isPending,
    resetParcelPhotoUpload: reset,
  };
}
