/** Provider-neutral Places boundary used by booking and future address flows. */
export {
  isPlacesRequestAborted,
  isPlacesRequestError,
  PlacesRequestError,
  type PlacesErrorCode,
} from './errors';

export {
  createGoongPlacesProvider,
  goongPlacesProvider,
  type CreateGoongPlacesProviderOptions,
  type PlacesFetch,
} from './goongPlacesProvider';

export {
  usePlacesSearch,
  type UsePlacesSearchResult,
} from './usePlacesSearch';

export type {
  FindPredictionsInput,
  PlacePrediction,
  PlacesProvider,
  PlacesRequestOptions,
  ResolvedPlace,
  ResolvePlaceInput,
} from './types';
