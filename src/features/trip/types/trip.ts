import { formatTime } from '@shared/utils/format';
import { isValidGeoCoordinate } from '@shared/utils/geo';

export type BusType = 'sleeper' | 'limousine' | 'standard';
export type TripLifecycleStatus =
  | 'SCHEDULED'
  | 'BOARDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISRUPTED';
export type TripStopLifecycleStatus = 'PENDING' | 'ARRIVED' | 'SKIPPED';

export interface TripSearchParams {
  originStationId?: string;
  destinationStationId?: string;
  originLocationCode?: string;
  destinationLocationCode?: string;
  departureDate: string;
  passengerCount: number;
  allowAlongRoutePickup?: boolean;
}

export interface StationSearchResult {
  id: string;
  name: string;
  city: string;
  province: string;
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
  province: string;
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
  price: number;
  seatsLeft: number;
  allowPickup: boolean;
  allowDropoff: boolean;
  busType: BusType | null;
  busLabel: string | null;
  durationHours: number;
  totalSeats: number | null;
  departureCity: string;
  arrivalCity: string;
  status?: TripLifecycleStatus;
}

export interface TripDetail extends BusTrip {
  status: TripLifecycleStatus;
  destinationArrivedAt: string | null;
  stops: TripStop[];
}

export interface TripStop {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  time: string;
  orderIndex: number;
  isActive?: boolean;
  status?: TripStopLifecycleStatus;
  actualArrivalTime?: string | null;
  distanceFromOriginKm?: number | null;
  allowPickup?: boolean;
  allowDropoff?: boolean;
  fareFromThisStop?: number | null;
  effectiveFare?: number | null;
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
  status: 'available' | 'selected' | 'sold';
  row?: number;
  col?: number;
  deck?: number;
  type?: string;
  price?: number;
}

export interface TripSearchDto {
  tripId: string;
  operatorId: string;
  operatorName: string;
  routeId: string;
  originStation: { id: string; name: string };
  destinationStation: { id: string; name: string };
  departureDateTime: string;
  estimatedArrivalTime: string;
  baseFare: number;
  availableSeats: number;
  allowAlongRoutePickup: boolean;
  allowAlongRouteDropoff: boolean;
}

export interface TripDetailDto {
  tripId: string;
  operatorId: string;
  routeId: string;
  status: TripLifecycleStatus;
  vehicleId: string;
  departureDateTime: string;
  estimatedArrivalTime: string;
  destinationArrivedAt?: string | null;
  baseFare: number;
  originStation: { id: string; name: string };
  destinationStation: { id: string; name: string };
  seatSummary: { totalSeats: number; availableSeats: number };
  returnRouteId?: string | null;
  fareBreakdown?: {
    baseFare: number;
    stops: Array<{ stopId: string; fare: number }>;
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
    distanceFromOriginKm?: number | null;
    allowPickup?: boolean;
    allowDropoff?: boolean;
    fareFromThisStop?: number | null;
    effectiveFare?: number | null;
  }>;
}

export interface SeatDto {
  seatNumber: string;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
  type?: string;
  row: number;
  col: number;
  deck?: number;
}

const durationHoursBetween = (start: string, end: string): number => {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  return Math.round((endMs - startMs) / (1000 * 60 * 60) * 10) / 10;
};

const stationCityLabel = (stationName: string): string =>
  stationName.replace('Ben xe ', '').replace('Bến xe ', '');

export function mapBusTrip(dto: TripSearchDto): BusTrip {
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
    price: dto.baseFare,
    seatsLeft: dto.availableSeats,
    allowPickup: dto.allowAlongRoutePickup,
    allowDropoff: dto.allowAlongRouteDropoff,
    // The public search contract does not expose vehicle type or seat capacity.
    busType: null,
    busLabel: null,
    durationHours: durationHoursBetween(dto.departureDateTime, dto.estimatedArrivalTime),
    totalSeats: null,
    departureCity: stationCityLabel(dto.originStation.name),
    arrivalCity: stationCityLabel(dto.destinationStation.name),
  };
}

export function mapTripDetail(dto: TripDetailDto): TripDetail {
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
    price: dto.baseFare,
    seatsLeft: dto.seatSummary.availableSeats,
    allowPickup: dto.stops.some((stop) => Boolean(stop.allowPickup)),
    allowDropoff: dto.stops.some((stop) => Boolean(stop.allowDropoff)),
    busType: null,
    busLabel: null,
    durationHours: durationHoursBetween(dto.departureDateTime, dto.estimatedArrivalTime),
    totalSeats: dto.seatSummary.totalSeats,
    departureCity: stationCityLabel(dto.originStation.name),
    arrivalCity: stationCityLabel(dto.destinationStation.name),
    stops: (dto.stops || []).map((stop) => {
      const latitude = stop.latitude;
      const longitude = stop.longitude;
      const hasValidCoordinates = typeof latitude === 'number'
        && typeof longitude === 'number'
        && isValidGeoCoordinate({
          latitude,
          longitude,
        });

      return {
        id: stop.stopId ?? stop.id ?? '',
        name: stop.name ?? `Route stop ${stop.orderIndex ?? ''}`.trim(),
        address: stop.address ?? null,
        latitude: hasValidCoordinates ? latitude : null,
        longitude: hasValidCoordinates ? longitude : null,
        time: formatTime(stop.estimatedArrivalTime ?? stop.arrivalTime ?? ''),
        orderIndex: stop.orderIndex ?? 0,
        isActive: stop.isActive,
        status: stop.status,
        actualArrivalTime: stop.actualArrivalTime ?? null,
        distanceFromOriginKm: stop.distanceFromOriginKm,
        allowPickup: stop.allowPickup,
        allowDropoff: stop.allowDropoff,
        fareFromThisStop: stop.fareFromThisStop,
        effectiveFare: stop.effectiveFare,
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
      status: dto.status === 'AVAILABLE' ? 'available' : 'sold',
      row: dto.row,
      col: dto.col,
      deck,
      type: dto.type,
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
