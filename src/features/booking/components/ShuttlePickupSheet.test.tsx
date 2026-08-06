import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockNavigate = jest.fn();
const mockOnClose = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../store/useBookingStore', () => ({
  useBookingStore: (selector: (state: { currentLeg: 'outbound' }) => unknown) =>
    selector({ currentLeg: 'outbound' }),
}));

jest.mock('zustand/react/shallow', () => ({
  useShallow: <T,>(fn: T) => fn,
}));

import { ShuttlePickupSheet } from './ShuttlePickupSheet';

describe('ShuttlePickupSheet', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockOnClose.mockClear();
  });

  it('navigates to ShuttleAddressPicker when opened with valid station coordinates', () => {
    act(() => {
      ReactTestRenderer.create(
        <ShuttlePickupSheet
          visible
          stationId="station-1"
          stationName="Ben Xe Mien Dong"
          stationLatitude={10.82}
          stationLongitude={106.69}
          onClose={mockOnClose}
        />,
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('ShuttleAddressPicker', {
      leg: 'outbound',
      direction: 'pickup',
      stationId: 'station-1',
      stationName: 'Ben Xe Mien Dong',
      stationLatitude: 10.82,
      stationLongitude: 106.69,
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not navigate when station coordinates are missing', () => {
    act(() => {
      ReactTestRenderer.create(
        <ShuttlePickupSheet
          visible
          stationId="station-1"
          stationName="Ben Xe Mien Dong"
          onClose={mockOnClose}
        />,
      );
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });
});
