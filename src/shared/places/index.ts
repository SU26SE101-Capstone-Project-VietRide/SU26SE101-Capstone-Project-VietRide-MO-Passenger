/**
 * Shared Google Places domain — reuse from booking, parcel, profile, etc.
 *
 * Prefer:
 * - usePlacesSession() for session lifecycle in screens
 * - resolveMapPlaceSelection() when confirming a map POI / search hit
 * - vietRidePlaces facade only when you need a single low-level call
 */

export {
  beginPlacesSession,
  endPlacesSession,
  findPlacePredictions,
  isNativePlacesAvailable,
  isPlacesRequestError,
  PlacesRequestError,
  resolvePlaceDetails,
  type FindPredictionsInput,
  type PlacePrediction,
  type PlacesErrorCode,
  type ResolvePlaceInput,
  type ResolvedPlace,
} from './vietRidePlaces';

export {
  resolveMapPlaceSelection,
  type PlacesSessionController,
} from './resolveMapPlaceSelection';

export {
  usePlacesSession,
  type UsePlacesSessionResult,
} from './usePlacesSession';
