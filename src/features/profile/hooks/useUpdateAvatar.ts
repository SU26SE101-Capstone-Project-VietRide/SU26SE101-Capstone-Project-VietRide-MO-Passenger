import { useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';

import { authKeys } from '@features/auth/api/authApi';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { createIdempotencyKey } from '@shared/api/idempotency';
import { ApiRequestError, toApiError } from '@shared/api/errors';
import { uploadImageToFirebase } from '@shared/lib/firebase/firebaseImageUploadService';
import {
  prepareImageUpload,
  type PreparedImage,
} from '@shared/lib/image/imagePreparationService';
import {
  getTokenSessionEpoch,
  isTokenSessionEpochCurrent,
} from '@shared/utils/storage';

import { updateAvatarUrl } from '../api/profileApi';
import {
  validateAvatarAsset,
  type AvatarPickerAsset,
} from '../validation/avatarUploadValidation';

interface AvatarUploadOperation {
  sourceUri: string;
  idempotencyKey: string;
  preparedImage?: PreparedImage;
  downloadUrl?: string;
}

const deletePreparedImage = async (preparedImage?: PreparedImage): Promise<void> => {
  if (preparedImage) {
    await FileSystem.deleteAsync(preparedImage.uri, { idempotent: true }).catch(() => undefined);
  }
};

export function useUpdateAvatar() {
  const queryClient = useQueryClient();
  const operationRef = useRef<AvatarUploadOperation | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ asset }: { asset: AvatarPickerAsset }) => {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new ApiRequestError({
          code: 'AVATAR_AUTH_REQUIRED',
          message: 'profile.avatar.errors.authRequired',
          statusCode: 401,
        });
      }
      const sessionEpoch = getTokenSessionEpoch();

      const validation = validateAvatarAsset(asset);
      if (!validation.success) {
        throw new ApiRequestError({
          code: validation.code,
          message: validation.messageKey,
        });
      }

      let operation = operationRef.current;
      if (!operation || operation.sourceUri !== validation.file.uri) {
        operation = {
          sourceUri: validation.file.uri,
          idempotencyKey: createIdempotencyKey('avatar-upload-mobile'),
        };
        operationRef.current = operation;
      }

      if (!operation.preparedImage) {
        operation.preparedImage = await prepareImageUpload(asset);
      }

      if (!operation.downloadUrl) {
        operation.downloadUrl = await uploadImageToFirebase({
          uri: operation.preparedImage.uri,
          mimeType: operation.preparedImage.mimeType,
          purpose: 'USER_AVATAR',
        });
      }

      if (
        !isTokenSessionEpochCurrent(sessionEpoch)
        || useAuthStore.getState().user?.id !== user.id
      ) {
        throw new ApiRequestError({
          code: 'AVATAR_SESSION_CHANGED',
          message: 'profile.avatar.errors.sessionChanged',
        });
      }

      const response = await updateAvatarUrl(
        operation.downloadUrl,
        operation.idempotencyKey,
      );
      if (response.userId !== user.id) {
        throw new ApiRequestError({
          code: 'AVATAR_ACCOUNT_MISMATCH',
          message: 'profile.avatar.errors.accountMismatch',
        });
      }

      return {
        avatarUrl: response.avatarUrl,
        sessionEpoch,
        userId: user.id,
      };
    },
    onSuccess: async ({ avatarUrl, sessionEpoch, userId }) => {
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.id === userId) {
        useAuthStore.getState().setUser(
          { ...currentUser, avatarUrl },
          sessionEpoch,
        );
        queryClient.invalidateQueries({ queryKey: authKeys.me });
      }

      const operation = operationRef.current;
      operationRef.current = null;
      await deletePreparedImage(operation?.preparedImage);
    },
    onError: async (error) => {
      const apiError = toApiError(error);
      const isTerminalClientError = Boolean(
        apiError.statusCode
          && apiError.statusCode >= 400
          && apiError.statusCode < 500
          && apiError.statusCode !== 429,
      );

      if (isTerminalClientError) {
        const operation = operationRef.current;
        operationRef.current = null;
        await deletePreparedImage(operation?.preparedImage);
      }
    },
  });

  return {
    uploadAvatar: useCallback(
      (asset: AvatarPickerAsset) => mutation.mutateAsync({ asset }),
      [mutation],
    ),
    isUploading: mutation.isPending,
  };
}
