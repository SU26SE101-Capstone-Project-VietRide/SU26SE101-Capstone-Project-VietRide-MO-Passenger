import { isUuid } from '@shared/utils/pathSegment';

export type BookingPendingActionReason = 'ROUTE_CHANGE' | 'SCHEDULE_CHANGE';
export type BookingPendingActionSeverity = 'MEDIUM' | 'MAJOR';
export type BookingPendingActionRefundPercent = 50 | 100;

export interface BookingPendingActionStop {
  stopId: string | null;
  stationId: string | null;
  stationName: string;
  sequence: number;
  estimatedArrivalAt?: string;
}

export interface BookingPendingActionOpen {
  bookingId: string;
  pendingActionId: string;
  reason: BookingPendingActionReason;
  deadline?: string;
  severity?: BookingPendingActionSeverity;
  oldDeparture?: string;
  newDeparture?: string;
  refundPercent?: BookingPendingActionRefundPercent;
  candidateStops: BookingPendingActionStop[];
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const readUuid = (value: unknown): string | undefined => (
  isUuid(value) ? value : undefined
);

const readInstant = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value.trim().length === 0) return undefined;
  const time = Date.parse(value);
  return Number.isFinite(time) ? value : undefined;
};

const readText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseJsonIfString = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
};

const parseCandidateStop = (value: unknown): BookingPendingActionStop | null => {
  const row = asRecord(value);
  if (!row) return null;

  const stopId = row.stopId == null ? null : readUuid(row.stopId) ?? null;
  const stationId = row.stationId == null ? null : readUuid(row.stationId) ?? null;
  const stationName = readText(row.stationName);
  const sequence = typeof row.sequence === 'number' && Number.isInteger(row.sequence)
    ? row.sequence
    : undefined;

  if (!stationName || sequence == null || sequence <= 0) return null;
  if ((stopId == null) === (stationId == null)) return null;

  return {
    stopId,
    stationId,
    stationName,
    sequence,
    ...(readInstant(row.estimatedArrivalAt)
      ? { estimatedArrivalAt: readInstant(row.estimatedArrivalAt) }
      : {}),
  };
};

const parseCandidateStops = (value: unknown): BookingPendingActionStop[] => {
  const raw = parseJsonIfString(value);
  if (!Array.isArray(raw)) return [];

  return raw
    .map(parseCandidateStop)
    .filter((stop): stop is BookingPendingActionStop => stop != null)
    .sort((left, right) => left.sequence - right.sequence);
};

const isAutoFallbackSnapshot = (data: Record<string, unknown>): boolean => (
  readUuid(data.originalStopId) != null
  && readUuid(data.fallbackDestinationStationId) != null
  && data.severity == null
  && data.oldDeparture == null
);

const isSeatReassignmentSnapshot = (data: Record<string, unknown>): boolean => {
  const reason = readText(data.reason);
  return reason === 'PENDING_SEAT_ASSIGNMENT' || Array.isArray(data.seatNumbers);
};

const classifyReason = (
  data: Record<string, unknown>,
  candidateStops: BookingPendingActionStop[],
): BookingPendingActionReason | null => {
  const reason = readText(data.reason);
  const severity = readText(data.severity);

  if (reason === 'SCHEDULE_CHANGE' || severity === 'MEDIUM' || severity === 'MAJOR') {
    return 'SCHEDULE_CHANGE';
  }
  if (reason === 'ROUTE_CHANGE' || candidateStops.length > 0) {
    return 'ROUTE_CHANGE';
  }
  if (readInstant(data.oldDeparture) && readInstant(data.newDeparture)) {
    return 'SCHEDULE_CHANGE';
  }
  return null;
};

const refundPercentFor = (
  reason: BookingPendingActionReason,
  severity: BookingPendingActionSeverity | undefined,
): BookingPendingActionRefundPercent | undefined => {
  if (reason === 'ROUTE_CHANGE') return 100;
  if (severity === 'MEDIUM') return 50;
  if (severity === 'MAJOR') return 100;
  return undefined;
};

/**
 * Opens the passenger decision screen only from Booking-owned pending-action
 * fields on notification/FCM data. Trip-level route-change payloads without
 * pendingActionId are intentionally ignored.
 */
export const parseBookingPendingActionOpen = (
  data: unknown,
): BookingPendingActionOpen | null => {
  const parsed = parseJsonIfString(data);
  const record = asRecord(parsed);
  if (!record) return null;
  if (isSeatReassignmentSnapshot(record) || isAutoFallbackSnapshot(record)) {
    return null;
  }

  const bookingId = readUuid(record.bookingId);
  const pendingActionId = readUuid(record.pendingActionId);
  if (!bookingId || !pendingActionId) return null;

  const candidateStops = parseCandidateStops(record.candidateStops);
  const reason = classifyReason(record, candidateStops);
  if (!reason) return null;

  const severity = readText(record.severity);
  const typedSeverity = severity === 'MEDIUM' || severity === 'MAJOR'
    ? severity
    : undefined;
  const refundPercent = refundPercentFor(reason, typedSeverity);

  return {
    bookingId,
    pendingActionId,
    reason,
    candidateStops,
    ...(readInstant(record.deadline) ? { deadline: readInstant(record.deadline) } : {}),
    ...(typedSeverity ? { severity: typedSeverity } : {}),
    ...(readInstant(record.oldDeparture)
      ? { oldDeparture: readInstant(record.oldDeparture) }
      : {}),
    ...(readInstant(record.newDeparture)
      ? { newDeparture: readInstant(record.newDeparture) }
      : {}),
    ...(refundPercent != null ? { refundPercent } : {}),
  };
};

export const candidateSelectionKey = (stop: BookingPendingActionStop): string => (
  `${stop.stopId ?? ''}:${stop.stationId ?? ''}`
);

export const toResolveSelection = (
  stop: BookingPendingActionStop,
): { selectedStopId: string | null; selectedStationId: string | null } => ({
  selectedStopId: stop.stopId,
  selectedStationId: stop.stationId,
});
