import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import type { SeatRow } from '../types';

jest.mock('react-i18next', () => ({
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
  useTranslation: () => ({
    t: (
      key: string,
      params?: { row?: string; column?: number; count?: number },
    ) => {
      if (key === 'booking.seatMap.rowCode') return `Hàng ${params?.row}`;
      if (key === 'booking.seatMap.columnCode') return `Cột ${params?.column}`;
      if (key === 'booking.seatMap.selectedCount')
        return `Đã chọn (${params?.count})`;
      const labels: Record<string, string> = {
        'booking.seatMap.frontOfVehicle': 'Đầu xe',
        'booking.seatMap.deckEyebrow': 'Sơ đồ ghế tầng A',
        'booking.seatMap.lowerDeck': 'Tầng dưới',
        'booking.seatMap.available': 'Còn trống',
        'common.none': 'Không có',
      };
      return labels[key] ?? key;
    },
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
  SteeringWheel: () => null,
}));

import { SeatGrid, calculateSeatGridGeometry } from './SeatGrid';

const seatMap: SeatRow[] = [
  {
    rowLabel: '01',
    rowNumber: 1,
    deck: 1,
    columns: [1, 2],
    leftSeats: [
      {
        id: 'seat-01-1',
        label: '01-1',
        status: 'available',
        row: 1,
        col: 1,
        deck: 1,
      },
    ],
    rightSeats: [
      {
        id: 'seat-01-2',
        label: '01-2',
        status: 'available',
        row: 1,
        col: 2,
        deck: 1,
      },
    ],
  },
];

describe('SeatGrid', () => {
  it('keeps row badges and column labels without the redundant Row axis label', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <SeatGrid
          seatMap={seatMap}
          selectedSeats={[]}
          aisleAfterCols={[1]}
          onSeatPress={jest.fn()}
        />,
      );
    });

    const labels = renderer!.root
      .findAllByType(Text)
      .map(node => node.props.children);

    expect(labels).toContain('Hàng 01');
    expect(labels).toContain('Cột 1');
    expect(labels).toContain('Cột 2');
    expect(labels).not.toContain('Hàng');

    act(() => renderer!.unmount());
  });

  it.each([
    [320, 43],
    [360, 53],
    [390, 58],
    [430, 58],
  ])('keeps a four-column deck inside the card at %ipx', (width, seatSize) => {
    const geometry = calculateSeatGridGeometry(width, 4, 1);

    expect(geometry.seatSize).toBe(seatSize);
    expect(geometry.matrixWidth).toBeLessThanOrEqual(geometry.innerWidth);
  });

  it('keeps the explicit seat-size safety bounds', () => {
    expect(calculateSeatGridGeometry(240, 4, 1).seatSize).toBe(34);
    expect(calculateSeatGridGeometry(900, 4, 1).seatSize).toBe(58);
  });
});
