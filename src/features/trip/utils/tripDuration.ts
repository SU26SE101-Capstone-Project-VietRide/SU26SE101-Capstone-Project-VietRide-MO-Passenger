/**
 * BE-owned travel-time helpers.
 *
 * Upcoming BE direction: origin→stop (and trip) durations are computed server-side
 * (`estimatedDurationMinutes`, `estimatedDurationFromOriginMinutes`) and sent on
 * the wire. Mobile must:
 * 1. Prefer those fields when present
 * 2. Never invent Haversine/speed-based times
 * 3. Keep a rolling-deploy fallback from timestamps only when BE duration is absent
 */

import { formatTime } from '@shared/utils/format';

const isPositiveFinite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/** Round to 1 decimal hour for existing trip-card i18n. */
export const minutesToDurationHours = (minutes: number): number =>
  Math.round((minutes / 60) * 10) / 10;

/**
 * Client delta fallback only — not a schedule engine.
 * Used when BE has not yet shipped estimatedDurationMinutes.
 */
export const durationHoursBetweenTimestamps = (
  start: string | undefined,
  end: string | undefined,
): number | null => {
  if (!start || !end) return null;
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return null;
  }
  return minutesToDurationHours((endMs - startMs) / 60_000);
};

export interface ResolveTripDurationInput {
  /** BE-owned whole-trip duration (preferred). */
  estimatedDurationMinutes?: number | null;
  departureDateTime?: string;
  estimatedArrivalTime?: string;
}

/**
 * Prefer BE minutes; else timestamp delta; else 0 (UI still needs a number today).
 */
export const resolveTripDurationHours = (
  input: ResolveTripDurationInput,
): number => {
  if (isPositiveFinite(input.estimatedDurationMinutes)) {
    return minutesToDurationHours(input.estimatedDurationMinutes);
  }
  return durationHoursBetweenTimestamps(
    input.departureDateTime,
    input.estimatedArrivalTime,
  ) ?? 0;
};

export interface ResolveStopScheduleInput {
  /** Static planned arrival from BE (authoritative when present). */
  estimatedArrivalTime?: string | null;
  arrivalTime?: string | null;
  /**
   * BE-owned minutes from origin departure to this stop.
   * When arrival timestamps are not yet on the passenger wire, UI may format
   * presentation time as departure + these minutes — never invent the minutes.
   */
  estimatedDurationFromOriginMinutes?: number | null;
  tripDepartureDateTime?: string | null;
}

/**
 * Display clock for a stop. Order:
 * 1. estimatedArrivalTime / arrivalTime from BE
 * 2. departure + estimatedDurationFromOriginMinutes (BE minutes only)
 * 3. empty string (caller shows unavailable — never Haversine)
 */
export const resolveStopDisplayTime = (
  input: ResolveStopScheduleInput,
): string => {
  const arrivalIso = input.estimatedArrivalTime ?? input.arrivalTime;
  if (typeof arrivalIso === 'string' && arrivalIso.trim()) {
    return formatTime(arrivalIso);
  }

  if (
    isPositiveFinite(input.estimatedDurationFromOriginMinutes)
    && input.tripDepartureDateTime
  ) {
    const originMs = Date.parse(input.tripDepartureDateTime);
    if (!Number.isFinite(originMs)) return '';
    const arrivalMs = originMs
      + input.estimatedDurationFromOriginMinutes * 60_000;
    return formatTime(new Date(arrivalMs).toISOString());
  }

  return '';
};

export const resolveStopDurationFromOriginMinutes = (
  value: unknown,
): number | null => (isPositiveFinite(value) ? Math.trunc(value) : null);
