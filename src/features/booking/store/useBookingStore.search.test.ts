const mockSearchTrips = jest.fn();

jest.mock('../../trip/api/tripApi', () => ({
  searchTrips: (...args: unknown[]) => mockSearchTrips(...args),
  getSeatMap: jest.fn(),
  getTripDetail: jest.fn(),
}));

jest.mock('../api/bookingApi', () => ({
  createBooking: jest.fn(),
  createRoundTripBooking: jest.fn(),
}));

import { useBookingStore } from './useBookingStore';

const expectSearchRequest = (request: Record<string, unknown>): void => {
  expect(mockSearchTrips).toHaveBeenCalledWith(request, expect.anything());
};

const searchParams = {
  from: 'Ha Noi',
  to: 'Ho Chi Minh City',
  originLocationCode: '01',
  destinationLocationCode: '79',
  originWardCode: '',
  destinationWardCode: '',
  originStationId: '31111111-1111-1111-1111-111111111111',
  destinationStationId: '41111111-1111-1111-1111-111111111111',
  originStationName: 'My Dinh Station',
  destinationStationName: 'Mien Dong Station',
  date: '10/07/2026',
  returnDate: '14/07/2026',
  passengers: 3,
  isRoundTrip: true,
};

describe('booking trip search', () => {
  beforeEach(() => {
    mockSearchTrips.mockReset();
    mockSearchTrips.mockResolvedValue([]);
    useBookingStore.setState({
      searchParams,
      currentLeg: 'outbound',
      tripResultsStatus: 'loading',
      trips: [],
    });
  });

  it('uses station-pair mode when both station ids are set (wins over province)', async () => {
    await useBookingStore.getState().searchTrips();

    expectSearchRequest({
      originStationId: '31111111-1111-1111-1111-111111111111',
      destinationStationId: '41111111-1111-1111-1111-111111111111',
      departureDate: '2026-07-10',
      passengerCount: 3,
    });
  });

  it('reverses stations and uses the return date for the return leg', async () => {
    useBookingStore.setState({
      currentLeg: 'return',
      outboundState: {
        trip: {
          id: 'outbound-trip',
          routeId: 'outbound-route',
          returnRouteId: 'return-route',
        } as never,
        seats: [],
        pickUp: null,
        dropOff: null,
        shuttlePickup: null,
        shuttleDropoff: null,
      },
    });

    await useBookingStore.getState().searchTrips();

    expectSearchRequest({
      originStationId: '41111111-1111-1111-1111-111111111111',
      destinationStationId: '31111111-1111-1111-1111-111111111111',
      departureDate: '2026-07-14',
      passengerCount: 3,
    });
  });

  it('searches by province codes when the user skips station selection', async () => {
    useBookingStore.setState({
      searchParams: {
        ...searchParams,
        originStationId: '',
        destinationStationId: '',
        originStationName: '',
        destinationStationName: '',
      },
    });

    await useBookingStore.getState().searchTrips();

    expectSearchRequest({
      originProvinceCode: '01',
      destinationProvinceCode: '79',
      departureDate: '2026-07-10',
      passengerCount: 3,
    });
  });

  it('includes optional ward codes in hierarchy mode', async () => {
    useBookingStore.setState({
      searchParams: {
        ...searchParams,
        originStationId: '',
        destinationStationId: '',
        originStationName: '',
        destinationStationName: '',
        originWardCode: '00001',
        destinationWardCode: '26506',
      },
    });

    await useBookingStore.getState().searchTrips();

    expectSearchRequest({
      originProvinceCode: '01',
      originLocationCode: '00001',
      destinationProvinceCode: '79',
      destinationLocationCode: '26506',
      departureDate: '2026-07-10',
      passengerCount: 3,
    });
  });

  it('reverses the selected outbound stations when return search is same-city all wards', async () => {
    useBookingStore.setState({
      currentLeg: 'return',
      searchParams: {
        ...searchParams,
        from: 'Ho Chi Minh City',
        to: 'Ho Chi Minh City',
        originLocationCode: '79',
        destinationLocationCode: '79',
        originStationId: '',
        destinationStationId: '',
        originStationName: '',
        destinationStationName: '',
      },
      outboundState: {
        trip: {
          id: 'outbound-trip',
          originStationId: 'mien-dong',
          destinationStationId: 'binh-duong',
        } as never,
        seats: [],
        pickUp: null,
        dropOff: null,
        shuttlePickup: null,
        shuttleDropoff: null,
      },
    });

    await useBookingStore.getState().searchTrips();

    expectSearchRequest({
      originStationId: 'binh-duong',
      destinationStationId: 'mien-dong',
      departureDate: '2026-07-14',
      passengerCount: 3,
    });
  });

  it('does not repeat the outbound hierarchy query when return scopes collapse', async () => {
    useBookingStore.setState({
      currentLeg: 'return',
      searchParams: {
        ...searchParams,
        originLocationCode: '79',
        destinationLocationCode: '79',
        originStationId: '',
        destinationStationId: '',
        originStationName: '',
        destinationStationName: '',
      },
      outboundState: null,
    });

    await useBookingStore.getState().searchTrips();

    expect(mockSearchTrips).not.toHaveBeenCalled();
    expect(useBookingStore.getState().tripResultsStatus).toBe('empty');
  });

  it('does not search a return leg before the outbound date', async () => {
    useBookingStore.setState({
      currentLeg: 'return',
      searchParams: { ...searchParams, returnDate: '09/07/2026' },
    });

    await useBookingStore.getState().searchTrips();

    expect(mockSearchTrips).not.toHaveBeenCalled();
    expect(useBookingStore.getState().tripResultsStatus).toBe('error');
  });

  it('reuses a fresh result for the same search fingerprint', async () => {
    await useBookingStore.getState().searchTrips();
    await useBookingStore.getState().searchTrips();

    expect(mockSearchTrips).toHaveBeenCalledTimes(1);
  });

  it('allows an explicit retry to bypass the short-lived cache', async () => {
    await useBookingStore.getState().searchTrips();
    await useBookingStore.getState().searchTrips({ force: true });

    expect(mockSearchTrips).toHaveBeenCalledTimes(2);
  });

  it('aborts a superseded search and keeps the newest result', async () => {
    let resolveFirst: ((value: never[]) => void) | undefined;
    mockSearchTrips.mockReturnValueOnce(new Promise((resolve) => {
      resolveFirst = resolve;
    }));
    const first = useBookingStore.getState().searchTrips({ force: true });
    const firstSignal = mockSearchTrips.mock.calls[0]?.[1] as AbortSignal;

    useBookingStore.setState({
      searchParams: { ...searchParams, date: '11/07/2026' },
    });
    mockSearchTrips.mockResolvedValueOnce([]);
    await useBookingStore.getState().searchTrips({ force: true });

    expect(firstSignal.aborted).toBe(true);
    resolveFirst?.([]);
    await first;
    expect(useBookingStore.getState().tripResultsStatus).toBe('empty');
    expect(mockSearchTrips).toHaveBeenCalledTimes(2);
  });
});
