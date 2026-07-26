import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, setPersistence, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_WEB_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const requiredFirebaseConfig = Object.entries(firebaseConfig) as Array<
  [keyof typeof firebaseConfig, string | undefined]
>;

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseStorage: FirebaseStorage | null = null;
let persistenceSetup: Promise<void> | null = null;

const assertFirebaseConfig = (): void => {
  const missing = requiredFirebaseConfig
    .filter(([, value]) => !value?.trim())
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `[Firebase] Upload is unavailable because configuration is incomplete: ${missing.join(', ')}.`,
    );
  }
};

const getFirebaseApp = (): FirebaseApp => {
  assertFirebaseConfig();

  if (!firebaseApp) {
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  }

  return firebaseApp;
};

export const getFirebaseStorage = (): FirebaseStorage => {
  if (!firebaseStorage) {
    firebaseStorage = getStorage(getFirebaseApp());
  }

  return firebaseStorage;
};

/**
 * Firebase auth is scoped to one upload operation and never persisted beside
 * the VietRide JWT session. Callers must await this before signing in.
 */
export const getFirebaseUploadAuth = async (): Promise<Auth> => {
  if (!firebaseAuth) {
    firebaseAuth = getAuth(getFirebaseApp());
  }

  if (!persistenceSetup) {
    persistenceSetup = setPersistence(firebaseAuth, inMemoryPersistence);
  }

  await persistenceSetup;
  return firebaseAuth;
};
