import { signInWithCustomToken, signOut } from 'firebase/auth';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { createIdempotencyKey } from '@shared/api/idempotency';
import { getFirebaseStorage, getFirebaseUploadAuth } from './firebaseClient';
import { getFirebaseCustomToken, type FirebaseUploadPurpose } from './firebaseUploadTokenApi';

let uploadQueue: Promise<void> = Promise.resolve();

export interface UploadImageParams {
  uri: string;
  purpose: FirebaseUploadPurpose;
  mimeType: string;
  onProgress?: (progress: number) => void;
}

const extensionForMimeType = (mimeType: string): string => {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
    default:
      return 'jpg';
  }
};

const createObjectPath = (uploadPath: string, mimeType: string): string => {
  const normalizedPrefix = uploadPath.trim().replace(/\/+$/, '');
  if (!normalizedPrefix) {
    throw new Error('[Firebase] Backend returned an empty upload path.');
  }

  return `${normalizedPrefix}/${createIdempotencyKey('firebase-object')}.${extensionForMimeType(mimeType)}`;
};

const enqueueUpload = <Result>(operation: () => Promise<Result>): Promise<Result> => {
  const queued = uploadQueue.then(operation, operation);
  uploadQueue = queued.then(
    () => undefined,
    () => undefined,
  );
  return queued;
};

async function performFirebaseUpload({
  uri,
  purpose,
  mimeType,
  onProgress,
}: UploadImageParams): Promise<string> {
  let authWasUsed = false;

  try {
    const [{ token, uploadPath }, auth] = await Promise.all([
      getFirebaseCustomToken({ purpose }),
      getFirebaseUploadAuth(),
    ]);

    await signInWithCustomToken(auth, token);
    authWasUsed = true;

    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error('[Firebase] Could not read the prepared image from the device.');
    }
    const blob = await response.blob();

    const storageRef = ref(getFirebaseStorage(), createObjectPath(uploadPath, mimeType));

    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: mimeType,
    });

    return await new Promise<string>((resolve, reject) => {
      // Throttle progress updates a bit
      let lastProgressUpdate = 0;
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (!onProgress) return;
          
          const progress = snapshot.totalBytes > 0
            ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            : 0;
          const now = Date.now();
          if (now - lastProgressUpdate > 250 || progress === 100) {
            onProgress(progress);
            lastProgressUpdate = now;
          }
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            // 6. Get public download URL
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          } catch (error) {
            reject(error);
          }
        },
      );
    });
  } finally {
    if (authWasUsed) {
      const auth = await getFirebaseUploadAuth();
      await signOut(auth).catch((error: unknown) => {
        if (__DEV__) {
          console.warn('[Firebase] Failed to clear temporary upload session.', error);
        }
      });
    }
  }
}

/** Serializes temporary Firebase sessions while allowing callers to await their own upload. */
export const uploadImageToFirebase = (params: UploadImageParams): Promise<string> =>
  enqueueUpload(() => performFirebaseUpload(params));
