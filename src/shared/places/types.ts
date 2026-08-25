import type { GeoCoordinate } from '@shared/types/common';

export type PlacePrediction = {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  fullText: string;
};

/** Normalized place details consumed by booking features. */
export type ResolvedPlace = {
  provider: 'goong';
  placeId: string;
  displayName: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
};

export type FindPredictionsInput = {
  query: string;
  location?: GeoCoordinate;
  radiusMeters?: number;
  maxResults?: number;
};

export type ResolvePlaceInput = {
  placeId: string;
};

export type PlacesRequestOptions = {
  signal?: AbortSignal;
};

/** Boundary implemented by a Places transport; screens never consume provider JSON. */
export interface PlacesProvider {
  autocomplete(
    input: FindPredictionsInput,
    options?: PlacesRequestOptions,
  ): Promise<PlacePrediction[]>;
  resolvePlace(
    input: ResolvePlaceInput,
    options?: PlacesRequestOptions,
  ): Promise<ResolvedPlace>;
}
