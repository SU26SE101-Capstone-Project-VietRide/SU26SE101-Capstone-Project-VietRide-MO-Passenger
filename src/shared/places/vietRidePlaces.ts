/**
 * Typed VietRide Places facade (`@shared/places`).
 *
 * Thin bridge over the native module only:
 * - Screens own session lifecycle via `usePlacesSession`.
 * - This module does not invent sessions, retry policy, or product matching.
 * - Never import the raw Expo module from screens.
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

/**
 * Place Details always runs inside an explicit native session.
 * The picker screen (or a hook) owns begin/end; this facade never auto-opens sessions.
 */
export type ResolvePlaceInput = {
  sessionId: string;
  placeId: string;
  /**
   * When true (default), native closes the session after a successful details fetch.
   * Pass false while still browsing results; pass true on final confirmation.
   */
  endSession?: boolean;
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

type NativeResolvePlaceArgs = {
  sessionId: string;
  placeId: string;
  endSession: boolean;
};

type NativeModuleShape = {
  beginSession: () => Promise<string>;
  findPredictions: (input: FindPredictionsInput) => Promise<unknown>;
  resolvePlace: (input: NativeResolvePlaceArgs) => Promise<unknown>;
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
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const readErrorMessage = (error: unknown): string | null => {
  const record = asRecord(error);
  return asNonEmptyString(record?.message)
    ?? asNonEmptyString((error as { message?: unknown } | null)?.message)
    ?? null;
};

const mapNativeError = (error: unknown): PlacesRequestError => {
  if (isPlacesRequestError(error)) {
    return error;
  }

  const record = asRecord(error);
  const codeRaw = asNonEmptyString(record?.code)
    ?? asNonEmptyString((error as { code?: unknown } | null)?.code)
    ?? '';
  const normalized = codeRaw
    .replace(/^ERR_/, '')
    .replace(/^VIETRIDEPLACES[./]/i, '')
    .toUpperCase();
  const nativeMessage = readErrorMessage(error);

  switch (normalized) {
    case 'CONFIGURATION':
      return new PlacesRequestError(
        'CONFIGURATION',
        nativeMessage ?? 'Google Places is not configured for this build.',
      );
    case 'OFFLINE':
      return new PlacesRequestError(
        'OFFLINE',
        nativeMessage ?? 'Places requires a network connection.',
      );
    case 'QUOTA':
      return new PlacesRequestError(
        'QUOTA',
        nativeMessage ?? 'Places quota has been exceeded.',
      );
    case 'INVALID_SESSION':
      return new PlacesRequestError(
        'INVALID_SESSION',
        nativeMessage ?? 'Places session is not active.',
      );
    case 'INVALID_PLACE':
    case 'NOT_FOUND':
      return new PlacesRequestError(
        'INVALID_PLACE',
        nativeMessage ?? 'Place details are incomplete.',
      );
    case 'UNSUPPORTED':
      return new PlacesRequestError(
        'UNSUPPORTED',
        nativeMessage ?? 'Native Places requires a custom development or release build.',
      );
    case 'NO_RESULTS':
      return new PlacesRequestError(
        'NO_RESULTS',
        nativeMessage ?? 'No matching places were found.',
      );
    default:
      return new PlacesRequestError(
        'UNAVAILABLE',
        nativeMessage ?? 'Places is temporarily unavailable.',
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
  const sessionId = input.sessionId.trim();
  if (!sessionId) {
    throw new PlacesRequestError('INVALID_SESSION', 'A Places session is required.');
  }

  try {
    const raw = await requireNative().findPredictions({
      ...input,
      sessionId,
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
  const sessionId = input.sessionId.trim();
  const placeId = input.placeId.trim();

  if (!sessionId) {
    throw new PlacesRequestError('INVALID_SESSION', 'A Places session is required.');
  }
  if (!placeId) {
    throw new PlacesRequestError('INVALID_PLACE', 'A place identifier is required.');
  }

  try {
    const resolved = validateResolvedPlace(
      await requireNative().resolvePlace({
        sessionId,
        placeId,
        endSession: input.endSession !== false,
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
