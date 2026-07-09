const mockSearchTrips = jest.fn();

jest.mock('../../trip/api/tripApi', () => ({
  searchTrips: (...args: unknown[]) => mockSearchTrips(...args),
  getSeatMap: jest.fn(),
}));

jest.mock('../api/bookingApi', () => ({
  createBooking: jest.fn(),
  createRoundTripBooking: jest.fn(),
}));

import { useBookingStore } from './useBookingStore';

const searchParams = {
  from: 'Ha Noi',
  to: 'Ho Chi Minh City',
  originLocationCode: 'HN',
  destinationLocationCode: 'HCM',
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

  it('searches the outbound leg by station id', async () => {
    await useBookingStore.getState().searchTrips();

    expect(mockSearchTrips).toHaveBeenCalledWith({
      originLocationCode: 'HN',
      destinationLocationCode: 'HCM',
      originStationId: '31111111-1111-1111-1111-111111111111',
      destinationStationId: '41111111-1111-1111-1111-111111111111',
      departureDate: '2026-07-10',
      passengerCount: 3,
      allowAlongRoutePickup: false,
    });
  });

  it('reverses station ids and uses the return date for the return leg', async () => {
    useBookingStore.setState({ currentLeg: 'return' });

    await useBookingStore.getState().searchTrips();

    expect(mockSearchTrips).toHaveBeenCalledWith({
      originLocationCode: 'HCM',
      destinationLocationCode: 'HN',
      originStationId: '41111111-1111-1111-1111-111111111111',
      destinationStationId: '31111111-1111-1111-1111-111111111111',
      departureDate: '2026-07-14',
      passengerCount: 3,
      allowAlongRoutePickup: false,
    });
  });

  it('searches by province when the user skips station selection', async () => {
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

    expect(mockSearchTrips).toHaveBeenCalledWith({
      originLocationCode: 'HN',
      destinationLocationCode: 'HCM',
      departureDate: '2026-07-10',
      passengerCount: 3,
      allowAlongRoutePickup: false,
    });
  });
});
