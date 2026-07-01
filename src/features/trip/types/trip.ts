export type BusType = 'sleeper' | 'limousine' | 'standard';

export interface TripSearchParams {
  originStationId: string;
  destinationStationId: string;
  departureDate: string;
  passengerCount: number;
  allowAlongRoutePickup?: boolean;
}

export interface BusTrip {
  id: string;
  operatorBadge: string;
  departureStation: string;
  arrivalStation: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  seatsLeft: number;
  allowPickup: boolean;
  allowDropoff: boolean;
  // Extrapolated fields for UI
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

// Backend DTOs for mapping
export interface TripSearchDto {
  tripId: string;
  operatorName: string;
  originStation: { id: string; name: string };
  destinationStation: { id: string; name: string };
  departureDateTime: string;
  estimatedArrivalTime: string;
  baseFare: number;
  availableSeats: number;
  allowAlongRoutePickup: boolean;
  allowAlongRouteDropoff: boolean;
}

export interface TripDetailDto extends TripSearchDto {
  vehicleType: string;
  seatSummary: { totalSeats: number };
  stops: Array<{ id: string; name: string; arrivalTime: string }>;
}

export interface SeatDto {
  seatNumber: string;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
  row: number;
  col: number;
}

export function mapBusTrip(dto: TripSearchDto): BusTrip {
  const departureDate = new Date(dto.departureDateTime);
  const arrivalDate = new Date(dto.estimatedArrivalTime);
  
  const formatTime = (d: Date) => 
    `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

  const depTimeMs = departureDate.getTime();
  const arrTimeMs = arrivalDate.getTime();
  const durationHours = Math.round((arrTimeMs - depTimeMs) / (1000 * 60 * 60) * 10) / 10;

  return {
    id: dto.tripId,
    operatorBadge: dto.operatorName,
    departureStation: dto.originStation.name,
    arrivalStation: dto.destinationStation.name,
    departureTime: formatTime(departureDate),
    arrivalTime: formatTime(arrivalDate),
    price: dto.baseFare,
    seatsLeft: dto.availableSeats,
    allowPickup: dto.allowAlongRoutePickup,
    allowDropoff: dto.allowAlongRouteDropoff,
    busType: 'sleeper',
    busLabel: `${dto.operatorName} Giường nằm`,
    durationHours,
    totalSeats: 40,
    departureCity: dto.originStation.name.replace('Bến xe ', ''),
    arrivalCity: dto.destinationStation.name.replace('Bến xe ', ''),
  };
}

export function mapTripDetail(dto: TripDetailDto): TripDetail {
  const baseTrip = mapBusTrip(dto);
  
  const busTypeMap: Record<string, BusType> = {
    'SLEEPER_BUS': 'sleeper',
    'LIMOUSINE': 'limousine',
    'STANDARD': 'standard'
  };
  
  const busType = busTypeMap[dto.vehicleType] || 'sleeper';
  const busLabel = `${dto.operatorName} ${dto.vehicleType === 'LIMOUSINE' ? 'Limousine' : dto.vehicleType === 'STANDARD' ? 'Ghế ngồi' : 'Giường nằm'}`;
  
  const depTime = new Date(dto.departureDateTime).getTime();
  const arrTime = new Date(dto.estimatedArrivalTime).getTime();
  const durationHours = Math.round((arrTime - depTime) / (1000 * 60 * 60) * 10) / 10;
  
  return {
    ...baseTrip,
    busType,
    busLabel,
    durationHours,
    totalSeats: dto.seatSummary.totalSeats,
    departureCity: dto.originStation.name.replace('Bến xe ', ''),
    arrivalCity: dto.destinationStation.name.replace('Bến xe ', ''),
    stops: (dto.stops || []).map(s => ({
      id: s.id,
      name: s.name,
      time: (() => {
        const d = new Date(s.arrivalTime);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      })()
    }))
  };
}

export function mapSeatMap(dtos: SeatDto[]): SeatRow[] {
  const rows = new Map<number, { left: Seat[], right: Seat[] }>();
  
  dtos.forEach(dto => {
    if (!rows.has(dto.row)) {
      rows.set(dto.row, { left: [], right: [] });
    }
    const row = rows.get(dto.row)!;
    
    const seat: Seat = {
      id: dto.seatNumber,
      label: dto.seatNumber,
      status: dto.status === 'BOOKED' ? 'sold' : 'available'
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
      rowLabel: String.fromCharCode(64 + rowNum), // 1 -> A, 2 -> B
      leftSeats: data.left.sort((a, b) => a.label.localeCompare(b.label)),
      rightSeats: data.right.sort((a, b) => a.label.localeCompare(b.label)),
    }));
}
