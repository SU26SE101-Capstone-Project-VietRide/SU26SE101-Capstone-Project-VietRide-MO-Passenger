import { formatTime } from '@shared/utils/format';
import { isValidGeoCoordinate } from '@shared/utils/geo';
import {
  resolveStopDisplayTime,
  resolveStopDurationFromOriginMinutes,
  resolveTripDurationHours,
} from '../utils/tripDuration';

export type BusType = 'sleeper' | 'limousine' | 'standard';
export type TripLifecycleStatus =
  | 'SCHEDULED'
  | 'BOARDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISRUPTED';
export type TripStopLifecycleStatus = 'PENDING' | 'ARRIVED' | 'SKIPPED';
export type EtaEstimateQuality = 'TRAFFIC_AWARE' | 'FALLBACK';

export type NetworkSeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED' | 'UNAVAILABLE';
export type SeatPresentationStatus = 'available' | 'selected' | 'sold' | 'unavailable';

/**
 * BE SearchTripsQuery query string (TripsController.SearchAsync).
 * Use the preferred `*LocationCode` names for leaf locations; the older
 * `*WardCode` fields remain BE aliases and are not emitted by Passenger.
 */
export interface TripSearchParams {
  originStationId?: string;
  destinationStationId?: string;
  originProvinceCode?: string;
  originLocationCode?: string;
  destinationProvinceCode?: string;
  destinationLocationCode?: string;
  departureDate: string;
  passengerCount: number;
  allowAlongRoutePickup?: boolean;
}

/**
 * BE `SearchTripPointDto` — matched pickup/dropoff inside the requested scope.
 * XOR identity: STATION sets stationId only; STOP sets stopId only.
 */
export interface TripSearchServicePointDto {
  type: 'STATION' | 'STOP';
  stationId: string | null;
  stopId: string | null;
  name: string;
  address: string | null;
  orderIndex: number;
  /** Instant with offset, e.g. 2026-08-15T09:00:00+07:00 */
  estimatedTime: string;
  allowPickup: boolean;
  allowDropoff: boolean;
}

/** UI/domain copy of a search service point after mapping. */
export type TripSearchServicePoint = TripSearchServicePointDto;

export interface StationSearchResult {
  id: string;
  name: string;
  city: string;
  ward: string | null;
  locationId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  addressStreet?: string | null;
  supportsShuttle: boolean;
}

/** Public `GET /stations/{id}` contract used for station capabilities. */
export interface StationDetail {
  id: string;
  name: string;
  slug: string;
  addressStreet: string | null;
  locationId: string | null;
  city: string;
  ward: string | null;
  latitude: number | null;
  longitude: number | null;
  contactPhone: string | null;
  contactEmail: string | null;
  operatingHours: string | null;
  facilities: string | null;
  supportsShuttle: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusTrip {
  id: string;
  operatorId: string;
  routeId: string;
  originStationId: string;
  destinationStationId: string;
  operatorBadge: string;
  departureStation: string;
  arrivalStation: string;
  departureTime: string;
  arrivalTime: string;
  /** ISO timestamps from BE. Keep these for deadline-sensitive booking rules. */
  departureDateTime?: string;
  estimatedArrivalDateTime?: string;
  /**
   * Present after `GET /trips/{tripId}`. Search results intentionally omit it.
   * Round-trip booking uses this server-owned route identity to constrain the
   * return leg instead of guessing from station names.
   */
  returnRouteId?: string | null;
  /** Original trip base fare from BE (pre-surcharge). */
  baseFare: number;
  /**
   * Authoritative amount charged before voucher. Prefer this for display and
   * previews. Normalized to baseFare only when BE omits or returns invalid data.
   */
  effectiveFare: number;
  surchargePercent?: number;
  surchargeAmount?: number;
  surchargePeriodId?: string | null;
  surchargePeriodName?: string | null;
  seatsLeft: number;
  allowPickup: boolean;
  allowDropoff: boolean;
  busType: BusType | null;
  busLabel: string | null;
  /**
   * Display duration in hours. Prefer BE `estimatedDurationMinutes` when present;
   * otherwise rolling fallback from departure/arrival timestamps.
   */
  durationHours: number;
  /** BE-owned trip duration in minutes when the contract ships it. */
  estimatedDurationMinutes?: number | null;
  totalSeats: number | null;
  departureCity: string;
  arrivalCity: string;
  status?: TripLifecycleStatus;
  /**
   * Hierarchy/station search points from BE (`pickupPoints` / `dropoffPoints`).
   * Empty arrays when BE returns none; never invent points client-side.
   */
  pickupPoints: TripSearchServicePoint[];
  dropoffPoints: TripSearchServicePoint[];
}

export interface TripDetail extends BusTrip {
  status: TripLifecycleStatus;
  destinationArrivedAt: string | null;
  plannedEtaQuality: EtaEstimateQuality;
  returnRouteId: string | null;
  stops: TripStop[];
}

export interface TripStop {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Clock label — from BE arrival or BE origin→stop minutes (never client Haversine). */
  time: string;
  orderIndex: number;
  isActive?: boolean;
  status?: TripStopLifecycleStatus;
  actualArrivalTime?: string | null;
  /** BE planned arrival ISO when present. */
  estimatedArrivalTime?: string | null;
  /**
   * BE-owned minutes from origin departure to this stop.
   * Source of truth for origin→stop schedule once passenger wire exposes it.
   */
  estimatedDurationFromOriginMinutes?: number | null;
  distanceFromOriginKm?: number | null;
  allowPickup?: boolean;
  allowDropoff?: boolean;
  fareFromThisStop?: number | null;
  effectiveFare?: number | null;
  surchargePercent?: number;
  surchargeAmount?: number;
  surchargePeriodId?: string | null;
  surchargePeriodName?: string | null;
}

export interface SeatRow {
  rowLabel: string;
  rowNumber?: number;
  deck?: number;
  columns?: number[];
  leftSeats: Seat[];
  rightSeats: Seat[];
}

export interface Seat {
  id: string;
  label: string;
  status: SeatPresentationStatus;
  row?: number;
  col?: number;
  deck?: number;
  type?: string;
  price?: number;
  disabledReason?: string | null;
}

/**
 * BE `SearchTripItem` (camelCase JSON).
 * Required positional fields + init surcharge/points.
 */
export interface TripSearchDto {
  tripId: string;
  operatorId: string;
  operatorName: string;
  routeId: string;
  departureDateTime: string;
  estimatedArrivalTime: string;
  originStation: { id: string; name: string };
  destinationStation: { id: string; name: string };
  availableSeats: number;
  baseFare: number;
  allowAlongRoutePickup: boolean;
  allowAlongRouteDropoff: boolean;
  surchargePercent?: number;
  surchargeAmount?: number;
  effectiveFare?: number | null;
  surchargePeriodId?: string | null;
  surchargePeriodName?: string | null;
  /** Ordered by orderIndex; empty when none match (should not happen on success). */
  pickupPoints?: TripSearchServicePointDto[] | null;
  dropoffPoints?: TripSearchServicePointDto[] | null;
  /** Optional until passenger search ships BE-owned duration. */
  estimatedDurationMinutes?: number | null;
}

export interface TripDetailDto {
  tripId: string;
  operatorId: string;
  routeId: string;
  status: TripLifecycleStatus;
  vehicleId: string;
  departureDateTime: string;
  estimatedArrivalTime: string;
  plannedEtaQuality?: EtaEstimateQuality;
  /** Optional until passenger detail ships BE-owned duration. */
  estimatedDurationMinutes?: number | null;
  destinationArrivedAt?: string | null;
  baseFare: number;
  effectiveFare?: number | null;
  surchargePercent?: number;
  surchargeAmount?: number;
  surchargePeriodId?: string | null;
  surchargePeriodName?: string | null;
  originStation: { id: string; name: string };
  destinationStation: { id: string; name: string };
  seatSummary: { totalSeats: number; availableSeats: number };
  returnRouteId?: string | null;
  fareBreakdown?: {
    baseFare: number;
    effectiveBaseFare?: number | null;
    surchargePercent?: number;
    surchargeAmount?: number;
    surchargePeriodId?: string | null;
    surchargePeriodName?: string | null;
    stops: Array<{
      stopId: string;
      fare?: number | null;
      fareFromThisStop?: number | null;
      effectiveFareFromThisStop?: number | null;
      surchargePercent?: number;
      surchargeAmount?: number;
      surchargePeriodId?: string | null;
      surchargePeriodName?: string | null;
    }>;
  };
  stops: Array<{
    id?: string;
    stopId?: string;
    name?: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    isActive?: boolean;
    status?: TripStopLifecycleStatus;
    actualArrivalTime?: string | null;
    orderIndex?: number;
    arrivalTime?: string;
    estimatedArrivalTime?: string;
    /** BE origin→stop minutes (prepare for passenger wire). */
    estimatedDurationFromOriginMinutes?: number | null;
    distanceFromOriginKm?: number | null;
    allowPickup?: boolean;
    allowDropoff?: boolean;
    fareFromThisStop?: number | null;
    effectiveFare?: number | null;
    surchargePercent?: number;
    surchargeAmount?: number;
    surchargePeriodId?: string | null;
    surchargePeriodName?: string | null;
  }>;
}

export interface SeatDto {
  seatNumber: string;
  status: NetworkSeatStatus | string;
  type?: string;
  row: number;
  col: number;
  deck?: number;
  disabledReason?: string | null;
}

const stationCityLabel = (stationName: string): string =>
  stationName.replace('Ben xe ', '').replace('Bến xe ', '');

/** Accept non-negative finite numbers only; never invent surcharge math. */
export const normalizeMoneyAmount = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
};

/**
 * Prefer BE effectiveFare. Fall back to baseFare only when effective is missing
 * or invalid. Do not recompute surcharge client-side.
 */
export const resolveEffectiveFare = (
  baseFare: number,
  effectiveFare?: number | null,
): number => {
  const normalizedBase = normalizeMoneyAmount(baseFare) ?? 0;
  const normalizedEffective = normalizeMoneyAmount(effectiveFare);
  return normalizedEffective ?? normalizedBase;
};

export function mapNetworkSeatStatus(
  status: NetworkSeatStatus | string,
): SeatPresentationStatus {
  if (status === 'AVAILABLE') return 'available';
  if (status === 'HELD' || status === 'BOOKED') return 'sold';
  return 'unavailable';
}

const mapSearchServicePoints = (
  points: TripSearchServicePointDto[] | null | undefined,
): TripSearchServicePoint[] => {
  if (!Array.isArray(points)) return [];
  return points
    .filter((point) => (
      (point.type === 'STATION' || point.type === 'STOP')
      && typeof point.name === 'string'
      && point.name.trim().length > 0
      && Number.isFinite(point.orderIndex)
    ))
    .map((point) => ({
      type: point.type,
      stationId: point.stationId ?? null,
      stopId: point.stopId ?? null,
      name: point.name.trim(),
      address: point.address ?? null,
      orderIndex: point.orderIndex,
      estimatedTime: point.estimatedTime,
      allowPickup: Boolean(point.allowPickup),
      allowDropoff: Boolean(point.allowDropoff),
    }))
    .sort((left, right) => left.orderIndex - right.orderIndex);
};

export function mapBusTrip(dto: TripSearchDto): BusTrip {
  const baseFare = normalizeMoneyAmount(dto.baseFare) ?? 0;
  const estimatedDurationMinutes = resolveStopDurationFromOriginMinutes(
    dto.estimatedDurationMinutes,
  );
  return {
    id: dto.tripId,
    operatorId: dto.operatorId,
    routeId: dto.routeId,
    originStationId: dto.originStation.id,
    destinationStationId: dto.destinationStation.id,
    operatorBadge: dto.operatorName,
    departureStation: dto.originStation.name,
    arrivalStation: dto.destinationStation.name,
    departureTime: formatTime(dto.departureDateTime),
    arrivalTime: formatTime(dto.estimatedArrivalTime),
    departureDateTime: dto.departureDateTime,
    estimatedArrivalDateTime: dto.estimatedArrivalTime,
    baseFare,
    effectiveFare: resolveEffectiveFare(baseFare, dto.effectiveFare),
    surchargePercent: dto.surchargePercent,
    surchargeAmount: normalizeMoneyAmount(dto.surchargeAmount) ?? undefined,
    surchargePeriodId: dto.surchargePeriodId ?? null,
    surchargePeriodName: dto.surchargePeriodName ?? null,
    seatsLeft: dto.availableSeats,
    allowPickup: dto.allowAlongRoutePickup,
    allowDropoff: dto.allowAlongRouteDropoff,
    // The public search contract does not expose vehicle type or seat capacity.
    busType: null,
    busLabel: null,
    estimatedDurationMinutes,
    durationHours: resolveTripDurationHours({
      estimatedDurationMinutes,
      departureDateTime: dto.departureDateTime,
      estimatedArrivalTime: dto.estimatedArrivalTime,
    }),
    totalSeats: null,
    departureCity: stationCityLabel(dto.originStation.name),
    arrivalCity: stationCityLabel(dto.destinationStation.name),
    pickupPoints: mapSearchServicePoints(dto.pickupPoints),
    dropoffPoints: mapSearchServicePoints(dto.dropoffPoints),
  };
}

export function mapTripDetail(dto: TripDetailDto): TripDetail {
  const baseFare = normalizeMoneyAmount(dto.baseFare) ?? 0;
  const estimatedDurationMinutes = resolveStopDurationFromOriginMinutes(
    dto.estimatedDurationMinutes,
  );
  return {
    id: dto.tripId,
    operatorId: dto.operatorId,
    routeId: dto.routeId,
    status: dto.status,
    destinationArrivedAt: dto.destinationArrivedAt ?? null,
    originStationId: dto.originStation.id,
    destinationStationId: dto.destinationStation.id,
    // Operator name and vehicle type are absent from the detail contract. The
    // booking store enriches this object with its real search-result metadata.
    operatorBadge: '',
    departureStation: dto.originStation.name,
    arrivalStation: dto.destinationStation.name,
    departureTime: formatTime(dto.departureDateTime),
    arrivalTime: formatTime(dto.estimatedArrivalTime),
    departureDateTime: dto.departureDateTime,
    estimatedArrivalDateTime: dto.estimatedArrivalTime,
    plannedEtaQuality: dto.plannedEtaQuality ?? 'FALLBACK',
    returnRouteId: dto.returnRouteId ?? null,
    baseFare,
    effectiveFare: resolveEffectiveFare(baseFare, dto.effectiveFare),
    surchargePercent: dto.surchargePercent,
    surchargeAmount: normalizeMoneyAmount(dto.surchargeAmount) ?? undefined,
    surchargePeriodId: dto.surchargePeriodId ?? null,
    surchargePeriodName: dto.surchargePeriodName ?? null,
    seatsLeft: dto.seatSummary.availableSeats,
    allowPickup: dto.stops.some((stop) => Boolean(stop.allowPickup)),
    allowDropoff: dto.stops.some((stop) => Boolean(stop.allowDropoff)),
    busType: null,
    busLabel: null,
    estimatedDurationMinutes,
    durationHours: resolveTripDurationHours({
      estimatedDurationMinutes,
      departureDateTime: dto.departureDateTime,
      estimatedArrivalTime: dto.estimatedArrivalTime,
    }),
    totalSeats: dto.seatSummary.totalSeats,
    departureCity: stationCityLabel(dto.originStation.name),
    arrivalCity: stationCityLabel(dto.destinationStation.name),
    pickupPoints: [],
    dropoffPoints: [],
    stops: (dto.stops || []).map((stop) => {
      const latitude = stop.latitude;
      const longitude = stop.longitude;
      const hasValidCoordinates = typeof latitude === 'number'
        && typeof longitude === 'number'
        && isValidGeoCoordinate({
          latitude,
          longitude,
        });
      const estimatedDurationFromOriginMinutes = resolveStopDurationFromOriginMinutes(
        stop.estimatedDurationFromOriginMinutes,
      );

      return {
        id: stop.stopId ?? stop.id ?? '',
        // Presentation owns the localized fallback; the transport mapper must
        // not manufacture English copy or persist it as server data.
        name: stop.name?.trim() ?? '',
        address: stop.address ?? null,
        latitude: hasValidCoordinates ? latitude : null,
        longitude: hasValidCoordinates ? longitude : null,
        estimatedArrivalTime: stop.estimatedArrivalTime ?? stop.arrivalTime ?? null,
        estimatedDurationFromOriginMinutes,
        time: resolveStopDisplayTime({
          estimatedArrivalTime: stop.estimatedArrivalTime,
          arrivalTime: stop.arrivalTime,
          estimatedDurationFromOriginMinutes,
          tripDepartureDateTime: dto.departureDateTime,
        }),
        orderIndex: stop.orderIndex ?? 0,
        isActive: stop.isActive,
        status: stop.status,
        actualArrivalTime: stop.actualArrivalTime ?? null,
        distanceFromOriginKm: stop.distanceFromOriginKm,
        allowPickup: stop.allowPickup,
        allowDropoff: stop.allowDropoff,
        fareFromThisStop: stop.fareFromThisStop,
        effectiveFare: stop.effectiveFare,
        surchargePercent: stop.surchargePercent,
        surchargeAmount: normalizeMoneyAmount(stop.surchargeAmount) ?? undefined,
        surchargePeriodId: stop.surchargePeriodId ?? null,
        surchargePeriodName: stop.surchargePeriodName ?? null,
      };
    }),
  };
}

export function mapSeatMap(dtos: SeatDto[]): SeatRow[] {
  const rows = new Map<string, { rowNumber: number; deck: number; seats: Seat[]; columns: Set<number> }>();

  dtos.forEach((dto) => {
    const deck = dto.deck ?? 1;
    const key = `${deck}:${dto.row}`;

    if (!rows.has(key)) {
      rows.set(key, {
        rowNumber: dto.row,
        deck,
        seats: [],
        columns: new Set<number>(),
      });
    }
    const row = rows.get(key)!;

    const seat: Seat = {
      id: dto.seatNumber,
      label: dto.seatNumber,
      status: mapNetworkSeatStatus(dto.status),
      row: dto.row,
      col: dto.col,
      deck,
      type: dto.type,
      disabledReason: dto.disabledReason ?? null,
    };

    row.seats.push(seat);
    row.columns.add(dto.col);
  });

  return Array.from(rows.values())
    .sort((a, b) => a.deck - b.deck || a.rowNumber - b.rowNumber)
    .map((data) => {
      const columns = Array.from(data.columns).sort((a, b) => a - b);
      const maxCol = Math.max(...columns, 1);
      const aisleAfterCol = maxCol >= 4 ? Math.ceil(maxCol / 2) : maxCol === 3 ? 1 : maxCol;
      const seats = data.seats.sort((a, b) => (a.col ?? 0) - (b.col ?? 0) || a.label.localeCompare(b.label));

      return {
        rowLabel: data.rowNumber.toString().padStart(2, '0'),
        rowNumber: data.rowNumber,
        deck: data.deck,
        columns,
        leftSeats: seats.filter((seat) => (seat.col ?? 0) <= aisleAfterCol),
        rightSeats: seats.filter((seat) => (seat.col ?? 0) > aisleAfterCol),
      };
    });
}
