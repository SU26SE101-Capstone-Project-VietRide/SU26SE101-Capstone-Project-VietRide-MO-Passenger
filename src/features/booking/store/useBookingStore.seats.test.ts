jest.mock('../../trip/api/tripApi', () => ({
  searchTrips: jest.fn(),
  getSeatMap: jest.fn(),
  getTripDetail: jest.fn(),
}));

jest.mock('../api/bookingApi', () => ({
  createBooking: jest.fn(),
  createRoundTripBooking: jest.fn(),
}));

import type { SeatRow } from '../types';
import { MAX_BOOKING_SEATS } from '../constants/bookingLimits';
import { useBookingStore } from './useBookingStore';

const seatMap: SeatRow[] = [
  {
    rowLabel: '01',
    rowNumber: 1,
    deck: 1,
    columns: [1, 2],
    leftSeats: [
      { id: 'A01', label: 'A01', status: 'available', row: 1, col: 1, deck: 1 },
    ],
    rightSeats: [
      { id: 'A02', label: 'A02', status: 'sold', row: 1, col: 2, deck: 1 },
    ],
  },
];

describe('booking seat selection', () => {
  beforeEach(() => {
    useBookingStore.setState({ seatMap, selectedSeats: [] });
  });

  it('keeps the seat-map layout stable while toggling a seat', () => {
    const initialSeatMap = useBookingStore.getState().seatMap;

    useBookingStore.getState().toggleSeat('A01');

    expect(useBookingStore.getState().seatMap).toBe(initialSeatMap);
    expect(useBookingStore.getState().selectedSeats).toEqual([
      expect.objectContaining({ id: 'A01', status: 'selected' }),
    ]);

    useBookingStore.getState().toggleSeat('A01');

    expect(useBookingStore.getState().seatMap).toBe(initialSeatMap);
    expect(useBookingStore.getState().selectedSeats).toEqual([]);
  });

  it('ignores sold and unknown seats without changing store state', () => {
    const initialState = useBookingStore.getState();

    useBookingStore.getState().toggleSeat('A02');
    useBookingStore.getState().toggleSeat('missing-seat');

    expect(useBookingStore.getState()).toBe(initialState);
  });

  it('does not select more seats than the backend booking limit', () => {
    const availableSeats = Array.from({ length: MAX_BOOKING_SEATS + 1 }, (_, index) => ({
      id: `B${index + 1}`,
      label: `B${index + 1}`,
      status: 'available' as const,
      row: 2,
      col: index + 1,
      deck: 1,
    }));

    useBookingStore.setState({
      seatMap: [{
        rowLabel: '02',
        rowNumber: 2,
        deck: 1,
        columns: availableSeats.map((seat) => seat.col),
        leftSeats: availableSeats,
        rightSeats: [],
      }],
      selectedSeats: [],
    });

    availableSeats.forEach((seat) => useBookingStore.getState().toggleSeat(seat.id));

    expect(useBookingStore.getState().selectedSeats).toHaveLength(MAX_BOOKING_SEATS);
    expect(useBookingStore.getState().selectedSeats).not.toContainEqual(
      expect.objectContaining({ id: `B${MAX_BOOKING_SEATS + 1}` }),
    );
  });
});
