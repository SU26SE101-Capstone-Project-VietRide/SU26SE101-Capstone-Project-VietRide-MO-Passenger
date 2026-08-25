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
  effectiveFare: 350_000,
  surchargePercent: 0,
  surchargeAmount: 0,
  surchargePeriodId: null,
  surchargePeriodName: null,
  pickupPoints: [
    {
      type: 'STATION',
      stationId: '9f2678d9-a145-4d04-af84-b4ebf86c8073',
      stopId: null,
      name: 'Ben xe Mien Tay',
      address: 'An Lac',
      orderIndex: 0,
      estimatedTime: '2026-07-14T08:00:00+07:00',
      allowPickup: true,
      allowDropoff: false,
    },
  ],
  dropoffPoints: [
    {
      type: 'STATION',
      stationId: 'dbb08b70-020c-4c41-8fcc-a9a01d8ef6e4',
      stopId: null,
      name: 'Ben xe Da Nang',
      address: null,
      orderIndex: 1,
      estimatedTime: '2026-07-14T18:00:00+07:00',
      allowPickup: false,
      allowDropoff: true,
    },
  ],
};

const createDetailDto = (
  overrides: Partial<TripDetailDto> = {},
): TripDetailDto => ({
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
  ...overrides,
});

describe('trip DTO mappers', () => {
  it('does not invent a vehicle type or total capacity missing from search', () => {
    const trip = mapBusTrip(searchDto);

    expect(trip.operatorBadge).toBe('Saigon Express');
    expect(trip.busType).toBeNull();
    expect(trip.busLabel).toBeNull();
    expect(trip.totalSeats).toBeNull();
    expect(trip.pickupPoints).toHaveLength(1);
    expect(trip.dropoffPoints[0]?.type).toBe('STATION');
  });

  it('uses detail seat capacity but leaves absent operator and vehicle metadata empty', () => {
    const detailDto = createDetailDto();

    const trip = mapTripDetail(detailDto);

    expect(trip.operatorBadge).toBe('');
    expect(trip.busType).toBeNull();
    expect(trip.busLabel).toBeNull();
    expect(trip.totalSeats).toBe(36);
  });

  it('accepts Goong route-based planned ETA quality without changing stop ETA data', () => {
    const estimatedArrivalTime = '2026-07-14T10:15:00+07:00';
    const trip = mapTripDetail(createDetailDto({
      plannedEtaQuality: 'ROUTE_BASED',
      stops: [{
        stopId: '6bc61db2-998f-4749-a053-3c1937b9c98d',
        name: 'Binh Duong',
        orderIndex: 1,
        estimatedArrivalTime,
        estimatedDurationFromOriginMinutes: 135,
      }],
    }));

    expect(trip.plannedEtaQuality).toBe('ROUTE_BASED');
    expect(trip.stops[0]).toMatchObject({
      estimatedArrivalTime,
      estimatedDurationFromOriginMinutes: 135,
      time: '10:15',
    });
  });

  it('keeps rolling compatibility for missing and future planned ETA qualities', () => {
    expect(mapTripDetail(createDetailDto()).plannedEtaQuality).toBe('FALLBACK');
    expect(mapTripDetail(createDetailDto({
      plannedEtaQuality: 'PREDICTIVE',
    })).plannedEtaQuality).toBe('UNKNOWN');
  });

  it('maps only valid public route-stop coordinates for native map markers', () => {
    const detailDto = createDetailDto({
      status: 'IN_PROGRESS',
      stops: [
        {
          stopId: '6bc61db2-998f-4749-a053-3c1937b9c98d',
          name: 'Binh Duong',
          address: 'National Highway 13',
          latitude: 10.9804,
          longitude: 106.6519,
          isActive: true,
          orderIndex: 1,
          effectiveFare: 120_000,
        },
        {
          stopId: 'bc3d1944-19f3-4981-99f4-a9c6fb7efda7',
          name: 'Invalid location',
          latitude: 181,
          longitude: 106.7,
          orderIndex: 2,
        },
      ],
    });

    const trip = mapTripDetail(detailDto);

    expect(trip.stops[0]).toMatchObject({
      address: 'National Highway 13',
      latitude: 10.9804,
      longitude: 106.6519,
      isActive: true,
      effectiveFare: 120_000,
    });
    expect(trip.stops[1]).toMatchObject({ latitude: null, longitude: null });
  });
});
