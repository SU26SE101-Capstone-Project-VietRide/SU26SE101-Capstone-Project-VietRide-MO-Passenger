import React from 'react';
import { StyleSheet } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import type { BusTrip } from '../types';

jest.mock('react-i18next', () => ({
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
  useTranslation: () => ({
    t: (key: string, params?: { count?: number; value?: number }) => {
      if (key === 'booking.tripCard.seatsLeft') return `${params?.count} seats`;
      if (key === 'booking.tripCard.durationHours') return `${params?.value} hours`;
      return key;
    },
  }),
}));
jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => jest.requireActual('@shared/theme').themes.liquid_light,
}));
jest.mock('@shared/hooks', () => ({
  useResponsiveLayout: () => ({ isCompact: true }),
  useThemedStyles: (factory: (theme: unknown) => unknown) =>
    factory(jest.requireActual('@shared/theme').themes.liquid_light),
}));
jest.mock('../store/useBookingStore', () => ({
  useBookingStore: (
    selector: (state: { selectedTrip: null }) => unknown,
  ) => selector({ selectedTrip: null }),
}));
jest.mock('phosphor-react-native', () => ({
  Bed: () => null,
  Bus: () => null,
  Clock: () => null,
  Van: () => null,
}));

import { TripCard } from './TripCard';

const trip: BusTrip = {
  id: 'trip-1',
  operatorId: 'operator-1',
  routeId: 'route-1',
  originStationId: 'station-1',
  destinationStationId: 'station-2',
  operatorBadge: 'VietRide',
  departureStation: 'Bến xe Miền Tây',
  arrivalStation: 'Bến xe Đà Lạt',
  departureTime: '23:59',
  arrivalTime: '05:45',
  baseFare: 300_000,
  effectiveFare: 300_000,
  seatsLeft: 4,
  allowPickup: true,
  allowDropoff: true,
  busType: 'limousine',
  busLabel: 'Limousine',
  durationHours: 6,
  totalSeats: 20,
  departureCity: 'TP. Hồ Chí Minh',
  arrivalCity: 'Đà Lạt',
  pickupPoints: [],
  dropoffPoints: [],
};

describe('TripCard responsive time row', () => {
  it('keeps both times single-line and shrinkable without starving the route', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <TripCard trip={trip} onPress={jest.fn()} />,
      );
    });

    const departure = renderer!.root.findByProps({
      testID: 'trip-card-departure-time',
    });
    const arrival = renderer!.root.findByProps({
      testID: 'trip-card-arrival-time',
    });
    const progress = renderer!.root.findByProps({ testID: 'trip-card-progress' });

    [departure, arrival].forEach((time) => {
      expect(time.props.numberOfLines).toBe(1);
      expect(time.props.adjustsFontSizeToFit).toBe(true);
      expect(time.props.minimumFontScale).toBe(0.75);
      expect(StyleSheet.flatten(time.props.style).maxWidth).toBe('100%');
    });
    expect(StyleSheet.flatten(progress.props.style)).toMatchObject({
      flex: 0.65,
      minWidth: 40,
      paddingHorizontal: 4,
    });

    act(() => renderer!.unmount());
  });
});