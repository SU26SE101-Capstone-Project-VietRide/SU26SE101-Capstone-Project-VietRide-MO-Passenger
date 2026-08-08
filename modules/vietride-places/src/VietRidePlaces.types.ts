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
  /**
   * Optional autocomplete session. Omit or pass empty for session-less Place
   * Details (map pin previews for many results without closing the search session).
   */
  sessionId?: string;
  placeId: string;
  /**
   * When true (default), the session is closed after a successful details fetch.
   * Map pin previews must pass false (and usually omit sessionId).
   */
  endSession?: boolean;
};

export type NativeVietRidePlacesModule = {
  beginSession(): Promise<string>;
  findPredictions(input: FindPredictionsInput): Promise<PlacePrediction[]>;
  resolvePlace(input: ResolvePlaceInput): Promise<ResolvedPlace>;
  endSession(sessionId: string): Promise<void>;
};
