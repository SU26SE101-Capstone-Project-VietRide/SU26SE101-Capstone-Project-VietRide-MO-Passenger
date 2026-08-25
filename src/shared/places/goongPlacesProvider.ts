import { fetch as expoFetch } from 'expo/fetch';

import { isValidGeoCoordinate } from '@shared/utils/geo';

import { PlacesRequestError, isPlacesRequestError } from './errors';
import type {
  FindPredictionsInput,
  PlacePrediction,
  PlacesProvider,
  ResolvedPlace,
  ResolvePlaceInput,
} from './types';

const GOONG_V2_BASE_URL = 'https://rsapi.goong.io/v2';
const AUTOCOMPLETE_PATH = '/place/autocomplete';
const PLACE_DETAIL_PATH = '/place/detail';
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RESULTS = 5;

type FetchResponse = {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
};

export type PlacesFetch = (
  url: string,
  init: { readonly method: 'GET'; readonly signal: AbortSignal },
) => Promise<FetchResponse>;

export type CreateGoongPlacesProviderOptions = {
  apiKey?: string;
  fetchImplementation?: PlacesFetch;
  requestTimeoutMs?: number;
};

type ProviderOperation = 'AUTOCOMPLETE' | 'PLACE_DETAIL';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const asProviderStatus = (payload: Record<string, unknown>): string | null =>
  asNonEmptyString(payload.status)?.toUpperCase() ?? null;

const providerStatusError = (status: string): PlacesRequestError | null => {
  if (status === 'OK') return null;
  if (status === 'ZERO_RESULTS' || status === 'NOT_FOUND') {
    return new PlacesRequestError('NO_RESULTS', 'No matching places were found.');
  }
  if (status === 'OVER_QUERY_LIMIT' || status === 'RESOURCE_EXHAUSTED') {
    return new PlacesRequestError('QUOTA', 'Address search is temporarily limited.');
  }
  if (status === 'REQUEST_DENIED' || status === 'UNAUTHENTICATED') {
    return new PlacesRequestError(
      'CONFIGURATION',
      'Address search is not configured for this build.',
    );
  }
  return new PlacesRequestError(
    'UNAVAILABLE',
    'Address search is temporarily unavailable.',
  );
};

const httpError = (
  status: number,
  operation: ProviderOperation,
): PlacesRequestError => {
  if (status === 401 || status === 403) {
    return new PlacesRequestError(
      'CONFIGURATION',
      'Address search is not configured for this build.',
    );
  }
  if (status === 429) {
    return new PlacesRequestError('QUOTA', 'Address search is temporarily limited.');
  }
  if (operation === 'PLACE_DETAIL' && (status === 400 || status === 404)) {
    return new PlacesRequestError('INVALID_PLACE', 'Place details are incomplete.');
  }
  return new PlacesRequestError(
    'UNAVAILABLE',
    'Address search is temporarily unavailable.',
  );
};

const isAbortLike = (error: unknown): boolean => {
  const record = asRecord(error);
  const name = asNonEmptyString(record?.name) ?? '';
  return name.toLowerCase() === 'aborterror';
};

const normalizePrediction = (value: unknown): PlacePrediction | null => {
  const record = asRecord(value);
  if (!record) return null;

  const structured = asRecord(record.structured_formatting);
  const placeId = asNonEmptyString(record.place_id);
  const fullText = asNonEmptyString(record.description);
  const primaryText = asNonEmptyString(structured?.main_text) ?? fullText;
  if (!placeId || !fullText || !primaryText) return null;

  return {
    placeId,
    primaryText,
    secondaryText: asNonEmptyString(structured?.secondary_text) ?? '',
    fullText,
  };
};

const normalizeResolvedPlace = (
  payload: unknown,
  requestedPlaceId: string,
): ResolvedPlace => {
  const root = asRecord(payload);
  if (!root) {
    throw new PlacesRequestError(
      'UNAVAILABLE',
      'Address search returned an invalid response.',
    );
  }

  const status = asProviderStatus(root);
  if (status) {
    const statusError = providerStatusError(status);
    if (statusError) {
      throw statusError.code === 'NO_RESULTS'
        ? new PlacesRequestError('INVALID_PLACE', 'Place details are incomplete.')
        : statusError;
    }
  }

  const result = asRecord(root.result);
  const geometry = asRecord(result?.geometry);
  const location = asRecord(geometry?.location);
  const latitude = asFiniteNumber(location?.lat);
  const longitude = asFiniteNumber(location?.lng);
  const displayName = asNonEmptyString(result?.name)
    ?? asNonEmptyString(result?.formatted_address);
  const formattedAddress = asNonEmptyString(result?.formatted_address)
    ?? displayName;
  const placeId = asNonEmptyString(result?.place_id) ?? requestedPlaceId;

  if (
    latitude === null
    || longitude === null
    || !displayName
    || !formattedAddress
    || !isValidGeoCoordinate({ latitude, longitude })
  ) {
    throw new PlacesRequestError('INVALID_PLACE', 'Place details are incomplete.');
  }

  return {
    provider: 'goong',
    placeId,
    displayName,
    formattedAddress,
    latitude,
    longitude,
  };
};

const toGoongLatLng = (input: FindPredictionsInput): string | null => {
  if (!input.location) return null;
  if (!isValidGeoCoordinate(input.location)) {
    throw new PlacesRequestError('INVALID_PLACE', 'Search coordinates are invalid.');
  }
  return `${input.location.latitude},${input.location.longitude}`;
};

const defaultFetch: PlacesFetch = (url, init) =>
  expoFetch(url, init) as unknown as Promise<FetchResponse>;

export const createGoongPlacesProvider = (
  options: CreateGoongPlacesProviderOptions,
): PlacesProvider => {
  const apiKey = options.apiKey?.trim() ?? '';
  const fetchImplementation = options.fetchImplementation ?? defaultFetch;
  const timeoutMs = Number.isFinite(options.requestTimeoutMs)
    ? Math.max(1, Math.floor(options.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS))
    : DEFAULT_TIMEOUT_MS;

  const requestJson = async (
    path: string,
    params: Readonly<Record<string, string>>,
    operation: ProviderOperation,
    externalSignal?: AbortSignal,
  ): Promise<unknown> => {
    if (!apiKey) {
      throw new PlacesRequestError(
        'CONFIGURATION',
        'Address search is not configured for this build.',
      );
    }

    const controller = new AbortController();
    let timedOut = false;
    const abortFromCaller = () => controller.abort();
    if (externalSignal?.aborted) {
      controller.abort();
    } else {
      externalSignal?.addEventListener('abort', abortFromCaller, { once: true });
    }

    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const url = new URL(`${GOONG_V2_BASE_URL}${path}`);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
      url.searchParams.set('api_key', apiKey);

      let response: FetchResponse;
      try {
        response = await fetchImplementation(url.toString(), {
          method: 'GET',
          signal: controller.signal,
        });
      } catch (error) {
        if (timedOut) {
          throw new PlacesRequestError(
            'UNAVAILABLE',
            'Address search is temporarily unavailable.',
          );
        }
        if (controller.signal.aborted || isAbortLike(error)) {
          throw new PlacesRequestError('ABORTED', 'Address search was cancelled.');
        }
        throw new PlacesRequestError('OFFLINE', 'Address search needs a network connection.');
      }

      if (!response.ok) throw httpError(response.status, operation);

      try {
        return await response.json();
      } catch {
        throw new PlacesRequestError(
          'UNAVAILABLE',
          'Address search returned an invalid response.',
        );
      }
    } catch (error) {
      if (isPlacesRequestError(error)) throw error;
      throw new PlacesRequestError(
        'UNAVAILABLE',
        'Address search is temporarily unavailable.',
      );
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener('abort', abortFromCaller);
    }
  };

  return {
    async autocomplete(input, requestOptions) {
      const normalizedQuery = input.query.trim().replace(/\s+/g, ' ');
      if (!normalizedQuery) return [];

      const requestedMaxResults = typeof input.maxResults === 'number'
        && Number.isFinite(input.maxResults)
        ? Math.floor(input.maxResults)
        : MAX_RESULTS;
      const maxResults = Math.min(
        Math.max(requestedMaxResults, 1),
        MAX_RESULTS,
      );
      const location = toGoongLatLng(input);
      const params: Record<string, string> = {
        input: normalizedQuery,
        limit: String(maxResults),
        more_compound: 'true',
      };
      if (location) {
        params.location = location;
      }
      if (
        typeof input.radiusMeters === 'number'
        && Number.isFinite(input.radiusMeters)
        && input.radiusMeters > 0
      ) {
        params.radius = String(input.radiusMeters / 1000);
      }

      const payload = await requestJson(
        AUTOCOMPLETE_PATH,
        params,
        'AUTOCOMPLETE',
        requestOptions?.signal,
      );
      const root = asRecord(payload);
      if (!root) {
        throw new PlacesRequestError(
          'UNAVAILABLE',
          'Address search returned an invalid response.',
        );
      }

      const status = asProviderStatus(root);
      if (status) {
        const statusError = providerStatusError(status);
        if (statusError?.code === 'NO_RESULTS') return [];
        if (statusError) throw statusError;
      }

      if (!Array.isArray(root.predictions)) {
        throw new PlacesRequestError(
          'UNAVAILABLE',
          'Address search returned an invalid response.',
        );
      }

      const predictions = root.predictions
        .map(normalizePrediction)
        .filter((item): item is PlacePrediction => item !== null)
        .slice(0, maxResults);
      if (root.predictions.length > 0 && predictions.length === 0) {
        throw new PlacesRequestError(
          'UNAVAILABLE',
          'Address search returned an invalid response.',
        );
      }
      return predictions;
    },

    async resolvePlace(input: ResolvePlaceInput, requestOptions) {
      const placeId = input.placeId.trim();
      if (!placeId) {
        throw new PlacesRequestError('INVALID_PLACE', 'A place identifier is required.');
      }
      const payload = await requestJson(
        PLACE_DETAIL_PATH,
        { place_id: placeId },
        'PLACE_DETAIL',
        requestOptions?.signal,
      );
      return normalizeResolvedPlace(payload, placeId);
    },
  };
};

// Expo only inlines public variables read through static dot notation.
export const goongPlacesProvider = createGoongPlacesProvider({
  apiKey: process.env.EXPO_PUBLIC_GOONG_API_KEY,
});
