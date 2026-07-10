export type BusType = 'sleeper' | 'limousine' | 'standard';

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
  price: number;
  seatsLeft: number;
  allowPickup: boolean;
  allowDropoff: boolean;
  busType: BusType;
  busLabel: string;
  durationHours: number;
  totalSeats: number;
  departureCity: string;
  arrivalCity: string;
}

export interface TripDetail extends BusTrip {
  stops: TripStop[];
}

export interface TripStop {
  id: string;
  name: string;
  time: string;
  orderIndex: number;
  distanceFromOriginKm?: number | null;
  allowPickup?: boolean;
  allowDropoff?: boolean;
  fareFromThisStop?: number | null;
}

export interface SeatRow {
  rowLabel: string;
  leftSeats: Seat[];
  rightSeats: Seat[];
}

export interface Seat {
  id: string;
  label: string;
  status: 'available' | 'selected' | 'sold';
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
  status: string;
  vehicleId: string;
  departureDateTime: string;
  estimatedArrivalTime: string;
  baseFare: number;
  originStation: { id: string; name: string };
  destinationStation: { id: string; name: string };
  seatSummary: { totalSeats: number; availableSeats: number };
  returnRouteId?: string | null;
  fareBreakdown?: {
    baseFare: number;
    stops: Array<{ stopId: string; fare: number }>;
  };
  vehicleType?: string;
  stops: Array<{
    id?: string;
    stopId?: string;
    name?: string;
    orderIndex?: number;
    arrivalTime?: string;
    estimatedArrivalTime?: string;
    distanceFromOriginKm?: number | null;
    allowPickup?: boolean;
    allowDropoff?: boolean;
    fareFromThisStop?: number | null;
  }>;
}

export interface SeatDto {
  seatNumber: string;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
  row: number;
  col: number;
}

const formatTime = (dateLike: string): string => {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

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
    price: dto.baseFare,
    seatsLeft: dto.availableSeats,
    allowPickup: dto.allowAlongRoutePickup,
    allowDropoff: dto.allowAlongRouteDropoff,
    busType: 'sleeper',
    busLabel: `${dto.operatorName} Sleeper bus`,
    durationHours: durationHoursBetween(dto.departureDateTime, dto.estimatedArrivalTime),
    totalSeats: 40,
    departureCity: stationCityLabel(dto.originStation.name),
    arrivalCity: stationCityLabel(dto.destinationStation.name),
  };
}

export function mapTripDetail(dto: TripDetailDto): TripDetail {
  const busTypeMap: Record<string, BusType> = {
    SLEEPER_BUS: 'sleeper',
    LIMOUSINE: 'limousine',
    STANDARD: 'standard',
  };
  const busType = dto.vehicleType ? busTypeMap[dto.vehicleType] || 'sleeper' : 'sleeper';
  const busLabel = dto.vehicleType === 'LIMOUSINE'
    ? 'Limousine'
    : dto.vehicleType === 'STANDARD'
      ? 'Standard bus'
      : 'Sleeper bus';

  return {
    id: dto.tripId,
    operatorId: dto.operatorId,
    routeId: dto.routeId,
    originStationId: dto.originStation.id,
    destinationStationId: dto.destinationStation.id,
    operatorBadge: 'VietRide',
    departureStation: dto.originStation.name,
    arrivalStation: dto.destinationStation.name,
    departureTime: formatTime(dto.departureDateTime),
    arrivalTime: formatTime(dto.estimatedArrivalTime),
    price: dto.baseFare,
    seatsLeft: dto.seatSummary.availableSeats,
    allowPickup: dto.stops.some((stop) => Boolean(stop.allowPickup)),
    allowDropoff: dto.stops.some((stop) => Boolean(stop.allowDropoff)),
    busType,
    busLabel,
    durationHours: durationHoursBetween(dto.departureDateTime, dto.estimatedArrivalTime),
    totalSeats: dto.seatSummary.totalSeats,
    departureCity: stationCityLabel(dto.originStation.name),
    arrivalCity: stationCityLabel(dto.destinationStation.name),
    stops: (dto.stops || []).map((stop) => ({
      id: stop.stopId ?? stop.id ?? '',
      name: stop.name ?? `Route stop ${stop.orderIndex ?? ''}`.trim(),
      time: formatTime(stop.estimatedArrivalTime ?? stop.arrivalTime ?? ''),
      orderIndex: stop.orderIndex ?? 0,
      distanceFromOriginKm: stop.distanceFromOriginKm,
      allowPickup: stop.allowPickup,
      allowDropoff: stop.allowDropoff,
      fareFromThisStop: stop.fareFromThisStop,
    })),
  };
}

export function mapSeatMap(dtos: SeatDto[]): SeatRow[] {
  const rows = new Map<number, { left: Seat[]; right: Seat[] }>();

  dtos.forEach((dto) => {
    if (!rows.has(dto.row)) {
      rows.set(dto.row, { left: [], right: [] });
    }
    const row = rows.get(dto.row)!;

    const seat: Seat = {
      id: dto.seatNumber,
      label: dto.seatNumber,
      status: dto.status === 'BOOKED' ? 'sold' : 'available',
    };

    if (dto.col <= 2) {
      row.left.push(seat);
    } else {
      row.right.push(seat);
    }
  });

  return Array.from(rows.entries())
    .sort(([a], [b]) => a - b)
    .map(([rowNum, data]) => ({
      rowLabel: String.fromCharCode(64 + rowNum),
      leftSeats: data.left.sort((a, b) => a.label.localeCompare(b.label)),
      rightSeats: data.right.sort((a, b) => a.label.localeCompare(b.label)),
    }));
}
