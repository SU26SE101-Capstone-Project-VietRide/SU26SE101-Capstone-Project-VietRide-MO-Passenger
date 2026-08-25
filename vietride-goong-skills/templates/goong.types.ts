import type { GeoPoint } from './coordinate';

export type GoongPlaceSuggestion = {
  placeId: string;
  description: string;
  mainText?: string;
  secondaryText?: string;
  distanceMeters?: number | null;
};

export type ResolvedPlace = {
  provider: 'goong';
  placeId?: string;
  name?: string;
  formattedAddress: string;
  location: GeoPoint;
  administrative?: {
    commune?: string;
    province?: string;
  };
  deprecatedAddress?: string;
};

export type RouteResult = {
  provider: 'goong';
  distanceMeters: number;
  durationSeconds: number;
  points: GeoPoint[];
};

export type MatrixCell =
  | {
      ok: true;
      distanceMeters: number;
      durationSeconds: number;
    }
  | {
      ok: false;
      reason: string;
    };

export type MatrixResult = {
  rows: MatrixCell[][];
};
