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

export type NativeVietRidePlacesModule = {
  beginSession(): Promise<string>;
  findPredictions(input: FindPredictionsInput): Promise<PlacePrediction[]>;
  resolvePlace(input: ResolvePlaceInput): Promise<ResolvedPlace>;
  endSession(sessionId: string): Promise<void>;
};
