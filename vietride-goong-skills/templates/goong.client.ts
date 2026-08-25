import axios, { type AxiosInstance } from 'axios';
import { GOONG_V2_BASE_URL, GOONG_V2_ENDPOINTS } from './goong.endpoints';
import {
  fromGoongLocation,
  toGoongLatLng,
  type GeoPoint,
} from './coordinate';
import type {
  GoongPlaceSuggestion,
  MatrixResult,
  ResolvedPlace,
} from './goong.types';

type CreateGoongClientOptions = {
  /**
   * Preferred in production: inject a VietRide backend base URL and let the BE
   * own the Goong REST API key.
   *
   * Direct mode is supported by this template for local/prototype use.
   */
  baseURL?: string;
  apiKey?: string;
};

export class GoongClient {
  private readonly http: AxiosInstance;
  private readonly apiKey?: string;

  constructor(options: CreateGoongClientOptions = {}) {
    this.http = axios.create({
      baseURL: options.baseURL ?? GOONG_V2_BASE_URL,
      timeout: 10_000,
    });
    this.apiKey = options.apiKey;
  }

  private withApiKey(params: Record<string, unknown>) {
    return this.apiKey ? { ...params, api_key: this.apiKey } : params;
  }

  async autocomplete(
    input: string,
    options?: {
      location?: GeoPoint;
      origin?: GeoPoint;
      limit?: number;
      radiusKm?: number;
      includeDeprecatedAdministrativeUnit?: boolean;
      signal?: AbortSignal;
    },
  ): Promise<GoongPlaceSuggestion[]> {
    const normalized = input.trim();
    if (!normalized) return [];

    const response = await this.http.get(GOONG_V2_ENDPOINTS.autocomplete, {
      params: this.withApiKey({
        input: normalized,
        location: options?.location
          ? toGoongLatLng(options.location)
          : undefined,
        origin: options?.origin ? toGoongLatLng(options.origin) : undefined,
        limit: options?.limit ?? 5,
        radius: options?.radiusKm,
        has_deprecated_administrative_unit:
          options?.includeDeprecatedAdministrativeUnit || undefined,
      }),
      signal: options?.signal,
    });

    const predictions = Array.isArray(response.data?.predictions)
      ? response.data.predictions
      : [];

    return predictions.map((item: any) => ({
      placeId: item.place_id,
      description: item.description,
      mainText: item.structured_formatting?.main_text,
      secondaryText: item.structured_formatting?.secondary_text,
      distanceMeters: item.distance_meters ?? null,
    }));
  }

  async placeDetail(
    placeId: string,
    options?: {
      includeDeprecatedAdministrativeUnit?: boolean;
      signal?: AbortSignal;
    },
  ): Promise<ResolvedPlace> {
    const response = await this.http.get(GOONG_V2_ENDPOINTS.placeDetail, {
      params: this.withApiKey({
        place_id: placeId,
        has_deprecated_administrative_unit:
          options?.includeDeprecatedAdministrativeUnit || undefined,
      }),
      signal: options?.signal,
    });

    const result = response.data?.result;
    const location = result?.geometry?.location;

    if (!result || !location) {
      throw new Error('Goong Place Detail returned no geometry');
    }

    return {
      provider: 'goong',
      placeId: result.place_id ?? placeId,
      name: result.name,
      formattedAddress: result.formatted_address ?? result.name ?? '',
      location: fromGoongLocation(location),
      administrative: {
        commune: result.compound?.commune,
        province: result.compound?.province,
      },
      deprecatedAddress: result.deprecated_description,
    };
  }

  /**
   * Keep request shape explicit because Goong Geocode supports multiple modes.
   * Verify current V2 docs before extending parameters.
   */
  async geocode(params: Record<string, string | number | boolean | undefined>) {
    const response = await this.http.get(GOONG_V2_ENDPOINTS.geocode, {
      params: this.withApiKey(params),
    });
    return response.data;
  }

  async directions(input: {
    origin: GeoPoint;
    destination: GeoPoint;
    vehicle: string;
    alternatives?: boolean;
    signal?: AbortSignal;
  }) {
    const response = await this.http.get(GOONG_V2_ENDPOINTS.directions, {
      params: this.withApiKey({
        origin: toGoongLatLng(input.origin),
        destination: toGoongLatLng(input.destination),
        vehicle: input.vehicle,
        alternatives: input.alternatives || undefined,
      }),
      signal: input.signal,
    });

    return response.data;
  }

  async distanceMatrix(input: {
    origins: GeoPoint[];
    destinations: GeoPoint[];
    vehicle: string;
    signal?: AbortSignal;
  }): Promise<MatrixResult> {
    const response = await this.http.get(GOONG_V2_ENDPOINTS.distanceMatrix, {
      params: this.withApiKey({
        origins: input.origins.map(toGoongLatLng).join('|'),
        destinations: input.destinations.map(toGoongLatLng).join('|'),
        vehicle: input.vehicle,
      }),
      signal: input.signal,
    });

    const rows = Array.isArray(response.data?.rows) ? response.data.rows : [];

    return {
      rows: rows.map((row: any) =>
        (row.elements ?? []).map((element: any) => {
          if (
            element?.status === 'OK' &&
            Number.isFinite(element?.distance?.value) &&
            Number.isFinite(element?.duration?.value)
          ) {
            return {
              ok: true as const,
              distanceMeters: element.distance.value,
              durationSeconds: element.duration.value,
            };
          }

          return {
            ok: false as const,
            reason: String(element?.status ?? 'UNKNOWN'),
          };
        }),
      ),
    };
  }
}
