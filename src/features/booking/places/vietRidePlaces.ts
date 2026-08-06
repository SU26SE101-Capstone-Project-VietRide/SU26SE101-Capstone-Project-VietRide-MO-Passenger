/**
 * Typed VietRide Places facade.
 *
 * UI code imports this module only. Never import the raw Expo native module
 * from screens or components. Native session tokens stay on the native side;
 * JS only holds opaque session IDs.
 */

import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import { isValidGeoCoordinate } from '@shared/utils/geo';

export type PlacePrediction = {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  fullText: string;
};

export type ResolvedPlace = {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
};

export type FindPredictionsInput = {
  sessionId: string;
  query: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  countryCode?: string;
  maxResults?: number;
};

export type ResolvePlaceInput = {
  sessionId: string;
  placeId: string;
};

export type PlacesErrorCode =
  | 'CONFIGURATION'
  | 'OFFLINE'
  | 'NO_RESULTS'
  | 'QUOTA'
  | 'UNAVAILABLE'
  | 'INVALID_SESSION'
  | 'INVALID_PLACE'
  | 'UNSUPPORTED';

export class PlacesRequestError extends Error {
  readonly code: PlacesErrorCode;

  constructor(code: PlacesErrorCode, message: string) {
    super(message);
    this.name = 'PlacesRequestError';
    this.code = code;
  }
}

export const isPlacesRequestError = (error: unknown): error is PlacesRequestError =>
  error instanceof PlacesRequestError;

type NativeModuleShape = {
  beginSession: () => Promise<string>;
  findPredictions: (input: FindPredictionsInput) => Promise<unknown>;
  resolvePlace: (input: ResolvePlaceInput) => Promise<unknown>;
  endSession: (sessionId: string) => Promise<void>;
};

let nativeModule: NativeModuleShape | null | undefined;

const loadNativeModule = (): NativeModuleShape | null => {
  if (nativeModule !== undefined) {
    return nativeModule;
  }

  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    nativeModule = null;
    return nativeModule;
  }

  try {
    nativeModule = requireNativeModule<NativeModuleShape>('VietRidePlaces');
  } catch {
    nativeModule = null;
  }

  return nativeModule;
};

export const isNativePlacesAvailable = (): boolean => loadNativeModule() !== null;

const requireNative = (): NativeModuleShape => {
  const module = loadNativeModule();
  if (!module) {
    throw new PlacesRequestError(
      'UNSUPPORTED',
      'Native Places requires a custom development or release build.',
    );
  }
  return module;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as Record<string, unknown>;
};

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value;
};

const mapNativeError = (error: unknown): PlacesRequestError => {
  if (isPlacesRequestError(error)) {
    return error;
  }

  const record = asRecord(error);
  const codeRaw = asNonEmptyString(record?.code)
    ?? asNonEmptyString((error as { code?: unknown } | null)?.code)
    ?? '';
  const normalized = codeRaw.replace(/^ERR_/, '').toUpperCase();

  switch (normalized) {
    case 'CONFIGURATION':
      return new PlacesRequestError(
        'CONFIGURATION',
        'Google Places is not configured for this build.',
      );
    case 'OFFLINE':
      return new PlacesRequestError(
        'OFFLINE',
        'Places requires a network connection.',
      );
    case 'QUOTA':
      return new PlacesRequestError(
        'QUOTA',
        'Places quota has been exceeded.',
      );
    case 'INVALID_SESSION':
      return new PlacesRequestError(
        'INVALID_SESSION',
        'Places session is not active.',
      );
    case 'INVALID_PLACE':
      return new PlacesRequestError(
        'INVALID_PLACE',
        'Place details are incomplete.',
      );
    case 'UNSUPPORTED':
      return new PlacesRequestError(
        'UNSUPPORTED',
        'Native Places requires a custom development or release build.',
      );
    case 'NO_RESULTS':
      return new PlacesRequestError('NO_RESULTS', 'No matching places were found.');
    default:
      return new PlacesRequestError(
        'UNAVAILABLE',
        'Places is temporarily unavailable.',
      );
  }
};

const validatePrediction = (value: unknown): PlacePrediction | null => {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const placeId = asNonEmptyString(record.placeId);
  const primaryText = asNonEmptyString(record.primaryText);
  const fullText = asNonEmptyString(record.fullText) ?? primaryText;
  if (!placeId || !primaryText || !fullText) {
    return null;
  }

  return {
    placeId,
    primaryText,
    secondaryText: asNonEmptyString(record.secondaryText) ?? '',
    fullText,
  };
};

const validateResolvedPlace = (value: unknown): ResolvedPlace | null => {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const placeId = asNonEmptyString(record.placeId);
  const displayName = asNonEmptyString(record.displayName);
  const formattedAddress = asNonEmptyString(record.formattedAddress);
  const latitude = asFiniteNumber(record.latitude);
  const longitude = asFiniteNumber(record.longitude);

  if (
    !placeId
    || !displayName
    || !formattedAddress
    || latitude === null
    || longitude === null
    || !isValidGeoCoordinate({ latitude, longitude })
  ) {
    return null;
  }

  return {
    placeId,
    displayName,
    formattedAddress,
    latitude,
    longitude,
  };
};

export const beginPlacesSession = async (): Promise<string> => {
  try {
    const sessionId = asNonEmptyString(await requireNative().beginSession());
    if (!sessionId) {
      throw new PlacesRequestError('UNAVAILABLE', 'Places session could not be created.');
    }
    return sessionId;
  } catch (error) {
    throw mapNativeError(error);
  }
};

export const findPlacePredictions = async (
  input: FindPredictionsInput,
): Promise<PlacePrediction[]> => {
  try {
    const raw = await requireNative().findPredictions({
      ...input,
      sessionId: input.sessionId.trim(),
      query: input.query.trim(),
      maxResults: Math.min(Math.max(input.maxResults ?? 5, 1), 5),
    });
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw
      .map(validatePrediction)
      .filter((item): item is PlacePrediction => item !== null)
      .slice(0, 5);
  } catch (error) {
    throw mapNativeError(error);
  }
};

export const resolvePlaceDetails = async (
  input: ResolvePlaceInput,
): Promise<ResolvedPlace> => {
  try {
    const resolved = validateResolvedPlace(
      await requireNative().resolvePlace({
        sessionId: input.sessionId.trim(),
        placeId: input.placeId.trim(),
      }),
    );
    if (!resolved) {
      throw new PlacesRequestError('INVALID_PLACE', 'Place details are incomplete.');
    }
    return resolved;
  } catch (error) {
    throw mapNativeError(error);
  }
};

export const endPlacesSession = async (sessionId: string): Promise<void> => {
  const normalized = sessionId.trim();
  if (!normalized) {
    return;
  }

  try {
    await requireNative().endSession(normalized);
  } catch {
    // Cleanup is best-effort and must remain idempotent.
  }
};
