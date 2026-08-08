/**
 * Map POI / search-result → Places-verified address.
 *
 * Shared across features (shuttle picker today; parcel / booking origin later).
 * Session lifecycle is injected via PlacesSessionController (from usePlacesSession).
 */

import { getGeoDistanceKm, isValidGeoCoordinate } from '@shared/utils/geo';

import {
  PlacesRequestError,
  findPlacePredictions,
  isPlacesRequestError,
  resolvePlaceDetails,
  type PlacePrediction,
  type ResolvedPlace,
} from './vietRidePlaces';

const COUNTRY_CODE = 'vn';
const MAX_PREDICTIONS = 5;
const SEARCH_BIAS_METERS = 5_000;
const PREFER_MATCH_WITHIN_METERS = 300;
const ACCEPT_MATCH_WITHIN_METERS = 2_000;

/** Opaque session handle owned by usePlacesSession (or equivalent). */
export type PlacesSessionController = {
  ensure: () => Promise<string>;
  rotate: () => Promise<string>;
  /** Call when native closed the session (endSession: true on Details). */
  clearLocal: () => void;
};

const shortenMapLabel = (name: string): string => {
  const trimmed = name.trim();
  const head = trimmed.split(/\s*[-–|,]\s*/)[0]?.trim();
  return head && head.length >= 2 ? head : trimmed;
};

const distanceMeters = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number => {
  const km = getGeoDistanceKm(from, to);
  return km === null ? Number.POSITIVE_INFINITY : km * 1000;
};

/**
 * 1. Place Details by placeId (when not synthetic `map-poi:…`)
 * 2. Autocomplete by name near lat/lng → Details on closest hit
 */
export const resolveMapPlaceSelection = async (args: {
  placeId: string;
  seed: ResolvedPlace | null;
  session: PlacesSessionController;
}): Promise<ResolvedPlace> => {
  const { placeId, seed, session } = args;
  const isSyntheticId = placeId.startsWith('map-poi:');
  let lastError: unknown = null;
  let sessionId = await session.ensure();

  if (!isSyntheticId) {
    try {
      return await resolvePlaceDetails({
        sessionId,
        placeId,
        endSession: false,
      });
    } catch (error) {
      lastError = error;
      if (isPlacesRequestError(error) && error.code === 'INVALID_SESSION') {
        sessionId = await session.rotate();
      }
    }
  }

  if (!seed || !isValidGeoCoordinate(seed)) {
    if (isPlacesRequestError(lastError)) {
      throw lastError;
    }
    throw new PlacesRequestError(
      'INVALID_PLACE',
      'Missing map coordinates for Places lookup.',
    );
  }

  const query = shortenMapLabel(seed.displayName);
  if (query.length < 2) {
    if (isPlacesRequestError(lastError)) {
      throw lastError;
    }
    throw new PlacesRequestError(
      'INVALID_PLACE',
      'Map place has no usable name for Places search.',
    );
  }

  let predictions: PlacePrediction[] = [];
  try {
    predictions = await findPlacePredictions({
      sessionId,
      query,
      latitude: seed.latitude,
      longitude: seed.longitude,
      radiusMeters: SEARCH_BIAS_METERS,
      countryCode: COUNTRY_CODE,
      maxResults: MAX_PREDICTIONS,
    });
  } catch (error) {
    if (isPlacesRequestError(error) && error.code === 'INVALID_SESSION') {
      sessionId = await session.rotate();
      predictions = await findPlacePredictions({
        sessionId,
        query,
        latitude: seed.latitude,
        longitude: seed.longitude,
        radiusMeters: SEARCH_BIAS_METERS,
        countryCode: COUNTRY_CODE,
        maxResults: MAX_PREDICTIONS,
      });
    } else {
      throw error;
    }
  }

  if (predictions.length === 0) {
    throw new PlacesRequestError(
      'NO_RESULTS',
      `No Places match for "${query}" near the map pin.`,
    );
  }

  let best: ResolvedPlace | null = null;
  let bestDistanceM = Number.POSITIVE_INFINITY;

  for (let index = 0; index < predictions.length; index += 1) {
    const prediction = predictions[index];
    const isLast = index === predictions.length - 1;
    try {
      const candidate = await resolvePlaceDetails({
        sessionId,
        placeId: prediction.placeId,
        endSession: isLast,
      });
      if (isLast) {
        session.clearLocal();
      }

      const meters = distanceMeters(seed, candidate);
      if (meters < bestDistanceM) {
        best = candidate;
        bestDistanceM = meters;
      }
      if (best && bestDistanceM <= PREFER_MATCH_WITHIN_METERS) {
        break;
      }
    } catch (error) {
      lastError = error;
      if (isPlacesRequestError(error) && error.code === 'INVALID_SESSION') {
        sessionId = await session.rotate();
      }
    }
  }

  if (best && (bestDistanceM <= ACCEPT_MATCH_WITHIN_METERS || predictions.length === 1)) {
    return best;
  }
  if (best) {
    return best;
  }

  if (isPlacesRequestError(lastError)) {
    throw lastError;
  }
  throw new PlacesRequestError(
    'INVALID_PLACE',
    'Could not match the map pin to a Google Place nearby.',
  );
};
