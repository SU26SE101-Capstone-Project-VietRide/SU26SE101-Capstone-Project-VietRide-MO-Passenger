import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import type { BookingLegDraft } from '../utils/bookingPayload';

const translations: Record<string, string> = {
  'booking.steps.trip': 'Chuyến xe',
  'booking.checkout.route': 'Tuyến',
  'booking.checkout.departureTime': 'Giờ khởi hành',
  'booking.checkout.seats': 'Ghế',
  'booking.steps.pickup': 'Điểm đón',
  'booking.steps.dropoff': 'Điểm trả',
  'booking.checkout.boardingAt': 'Lên xe',
  'booking.checkout.alightingAt': 'Xuống xe',
  'booking.checkout.selectPickup': 'Chọn điểm đón',
  'booking.checkout.selectDropoff': 'Chọn điểm trả',
  'common.notAvailable': 'Không có',
  'common.none': 'Không có',
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { field?: string }) =>
      key === 'booking.checkout.editField'
        ? `Chỉnh sửa ${params?.field ?? ''}`
        : translations[key] ?? key,
  }),
}));
jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => jest.requireActual('@shared/theme').themes.liquid_light,
}));
jest.mock('@shared/hooks', () => ({
  useThemedStyles: (factory: (theme: unknown) => unknown) =>
    factory(jest.requireActual('@shared/theme').themes.liquid_light),
}));
jest.mock('phosphor-react-native', () => ({
  MapPinLine: () => null,
  PencilSimple: () => null,
  Van: () => null,
}));

import { BookingLegSummaryCard } from './BookingLegSummaryCard';

const leg: BookingLegDraft = {
  trip: {
    id: 'trip-1',
    operatorId: 'operator-1',
    routeId: 'route-1',
    originStationId: 'origin-1',
    destinationStationId: 'destination-1',
    operatorBadge: 'VietRide',
    departureStation: 'Bến Miền Tây',
    arrivalStation: 'Bến Đà Lạt',
    departureTime: '08:00',
    arrivalTime: '14:00',
    baseFare: 250000,
    effectiveFare: 250000,
    seatsLeft: 10,
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
  },
  seats: [{ id: 'seat-1', label: '01-1', status: 'selected' }],
  pickUp: {
    id: 'pickup-1',
    name: 'Bến Miền Tây',
    address: '395 Kinh Dương Vương',
    time: '08:00',
    status: 'available',
  },
  dropOff: {
    id: 'dropoff-1',
    name: 'Bến Đà Lạt',
    address: '01 Tô Hiến Thành',
    time: '14:00',
    status: 'available',
  },
};

const EDIT_LABELS = [
  'Chỉnh sửa Chuyến xe',
  'Chỉnh sửa Ghế',
  'Chỉnh sửa Điểm đón',
  'Chỉnh sửa Điểm trả',
];

describe('BookingLegSummaryCard', () => {
  it('places one edit icon beside each booking step section', () => {
    const handlers = [jest.fn(), jest.fn(), jest.fn(), jest.fn()];
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <BookingLegSummaryCard
          title="Chuyến chiều đi"
          leg={leg}
          onEditTrip={handlers[0]}
          onEditSeats={handlers[1]}
          onEditPickup={handlers[2]}
          onEditDropoff={handlers[3]}
        />,
      );
    });

    EDIT_LABELS.forEach((label, index) => {
      const editButton = renderer!.root.findByProps({
        accessibilityLabel: label,
      });
      act(() => editButton.props.onPress());
      expect(handlers[index]).toHaveBeenCalledTimes(1);
    });

    const renderedEditLabels = renderer!.root
      .findAll(
        node =>
          node.props.accessibilityRole === 'button' &&
          typeof node.props.accessibilityLabel === 'string' &&
          node.props.accessibilityLabel.startsWith('Chỉnh sửa '),
      )
      .map(node => node.props.accessibilityLabel);
    expect(new Set(renderedEditLabels)).toEqual(new Set(EDIT_LABELS));

    act(() => renderer!.unmount());
  });

  it('does not repeat a station address when it equals the station name', () => {
    const duplicateAddressLeg: BookingLegDraft = {
      ...leg,
      pickUp: leg.pickUp ? { ...leg.pickUp, address: leg.pickUp.name } : null,
      dropOff: leg.dropOff
        ? { ...leg.dropOff, address: leg.dropOff.name }
        : null,
    };
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <BookingLegSummaryCard
          title="Chuyến chiều đi"
          leg={duplicateAddressLeg}
        />,
      );
    });

    const labels = renderer!.root
      .findAllByType(Text)
      .map(node => node.props.children)
      .filter((value): value is string => typeof value === 'string');

    expect(labels.filter(value => value === 'Bến Miền Tây')).toHaveLength(1);
    expect(labels.filter(value => value === 'Bến Đà Lạt')).toHaveLength(1);

    act(() => renderer!.unmount());
  });
});
