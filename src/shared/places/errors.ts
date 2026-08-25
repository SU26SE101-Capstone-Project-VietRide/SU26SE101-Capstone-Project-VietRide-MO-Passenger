export type PlacesErrorCode =
  | 'ABORTED'
  | 'CONFIGURATION'
  | 'INVALID_PLACE'
  | 'NO_RESULTS'
  | 'OFFLINE'
  | 'QUOTA'
  | 'UNAVAILABLE';

/**
 * Public Places error. Messages are deliberately generic: request URLs, query
 * text, provider payloads, and API keys must never escape through this object.
 */
export class PlacesRequestError extends Error {
  readonly code: PlacesErrorCode;

  constructor(code: PlacesErrorCode, message: string) {
    super(message);
    this.name = 'PlacesRequestError';
    this.code = code;
  }
}

export const isPlacesRequestError = (
  error: unknown,
): error is PlacesRequestError => error instanceof PlacesRequestError;

export const isPlacesRequestAborted = (error: unknown): boolean =>
  isPlacesRequestError(error) && error.code === 'ABORTED';
