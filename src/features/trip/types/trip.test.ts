import type { TripDetailDto, TripSearchDto } from './trip';
import { mapBusTrip, mapTripDetail } from './trip';

const searchDto: TripSearchDto = {
  tripId: '4d680b5f-8a94-4f26-9f5b-413bd1221e02',
  operatorId: '209506ca-bc1f-4781-a3e2-98e7f384647f',
  operatorName: 'Saigon Express',
  routeId: '65643e67-9bc5-4cf4-b7e8-3ec88cd25893',
  originStation: { id: '9f2678d9-a145-4d04-af84-b4ebf86c8073', name: 'Ben xe Mien Tay' },
  destinationStation: { id: 'dbb08b70-020c-4c41-8fcc-a9a01d8ef6e4', name: 'Ben xe Da Nang' },
  departureDateTime: '2026-07-14T08:00:00+07:00',
  estimatedArrivalTime: '2026-07-14T18:00:00+07:00',
  baseFare: 350_000,
  availableSeats: 12,
  allowAlongRoutePickup: false,
  allowAlongRouteDropoff: false,
};

describe('trip DTO mappers', () => {
  it('does not invent a vehicle type or total capacity missing from search', () => {
    const trip = mapBusTrip(searchDto);

    expect(trip.operatorBadge).toBe('Saigon Express');
    expect(trip.busType).toBeNull();
    expect(trip.busLabel).toBeNull();
    expect(trip.totalSeats).toBeNull();
  });

  it('uses detail seat capacity but leaves absent operator and vehicle metadata empty', () => {
    const detailDto: TripDetailDto = {
      tripId: searchDto.tripId,
      operatorId: searchDto.operatorId,
      routeId: searchDto.routeId,
      vehicleId: '64263b62-7408-4ef3-92fc-44813aac57c4',
      status: 'SCHEDULED',
      departureDateTime: searchDto.departureDateTime,
      estimatedArrivalTime: searchDto.estimatedArrivalTime,
      baseFare: searchDto.baseFare,
      originStation: searchDto.originStation,
      destinationStation: searchDto.destinationStation,
      seatSummary: { totalSeats: 36, availableSeats: 12 },
      stops: [],
    };

    const trip = mapTripDetail(detailDto);

    expect(trip.operatorBadge).toBe('');
    expect(trip.busType).toBeNull();
    expect(trip.busLabel).toBeNull();
    expect(trip.totalSeats).toBe(36);
  });
});
