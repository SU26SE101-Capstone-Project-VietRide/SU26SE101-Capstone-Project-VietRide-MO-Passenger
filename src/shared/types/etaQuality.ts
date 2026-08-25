export const ETA_QUALITY_VALUES = [
  'TRAFFIC_AWARE',
  'ROUTE_BASED',
  'FALLBACK',
] as const;

export type EtaQuality = (typeof ETA_QUALITY_VALUES)[number];

/**
 * Provider-neutral ETA quality consumed by Passenger Mobile.
 *
 * `UNKNOWN` keeps a usable ETA visible when Backend adds another string value
 * before the mobile app has shipped a matching contract update.
 */
export type NormalizedEtaQuality = EtaQuality | 'UNKNOWN';

export const isEtaQuality = (value: unknown): value is EtaQuality =>
  typeof value === 'string'
  && ETA_QUALITY_VALUES.some((quality) => quality === value);

export const normalizeEtaQuality = (value: unknown): NormalizedEtaQuality =>
  isEtaQuality(value) ? value : 'UNKNOWN';
