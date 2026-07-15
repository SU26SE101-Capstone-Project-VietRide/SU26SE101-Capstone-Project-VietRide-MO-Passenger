import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockSearchTrips = jest.fn();
const mockBookingState = {
  tripResultsStatus: 'loading' as const,
  trips: [],
  searchTrips: mockSearchTrips,
  selectTrip: jest.fn(),
  selectedTrip: null,
  currentLeg: 'outbound' as 'outbound' | 'return',
  searchParams: { isRoundTrip: false },
};

jest.mock('../store/useBookingStore', () => ({
  useBookingStore: (selector: (state: typeof mockBookingState) => unknown) => (
    selector(mockBookingState)
  ),
}));

jest.mock('@shared/hooks', () => ({
  useThemedStyles: (factory: (theme: { colors: { textPrimary: string } }) => unknown) => (
    factory({ colors: { textPrimary: '#111' } })
  ),
}));

jest.mock('../components', () => ({
  EmptyState: () => null,
  ErrorState: () => null,
  LoadingState: () => null,
}));

jest.mock('../components/TripCard', () => ({
  TripCard: () => null,
}));

import { TripResultsScreen } from './TripResultsScreen';

describe('TripResultsScreen search orchestration', () => {
  beforeEach(() => {
    mockSearchTrips.mockClear();
    mockBookingState.currentLeg = 'outbound';
  });

  it('waits for parent initialization, then searches once per active leg', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <TripResultsScreen autoSearchEnabled={false} onNext={jest.fn()} />,
      );
    });
    expect(mockSearchTrips).not.toHaveBeenCalled();

    await act(async () => {
      renderer!.update(
        <TripResultsScreen autoSearchEnabled onNext={jest.fn()} />,
      );
    });
    expect(mockSearchTrips).toHaveBeenCalledTimes(1);

    mockBookingState.currentLeg = 'return';
    await act(async () => {
      renderer!.update(
        <TripResultsScreen autoSearchEnabled onNext={jest.fn()} />,
      );
    });
    expect(mockSearchTrips).toHaveBeenCalledTimes(2);

    await act(async () => renderer!.unmount());
  });
});
