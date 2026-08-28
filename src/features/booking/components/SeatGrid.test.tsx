import React from 'react';
import { StyleSheet, Text } from 'react-native';
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
        'booking.seatMap.rowAxis': 'Hàng',
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
  it('keeps a fixed row axis and exposes the full localized row label', () => {
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

    expect(labels).toContain('Hàng');
    expect(labels).toContain('01');
    expect(labels).toContain('Cột 1');
    expect(labels).toContain('Cột 2');

    const rowLabel = renderer!.root
      .findAllByType(Text)
      .find(node => node.props.children === '01');
    expect(rowLabel?.props.accessibilityLabel).toBe('Hàng 01');
    expect(rowLabel?.props.adjustsFontSizeToFit).toBeUndefined();

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

  it('uses one font tier for every seat and row in the active deck', () => {
    const fiveRows: SeatRow[] = Array.from({ length: 5 }, (_, index) => {
      const row = index + 1;
      const seatNumber = `L${row.toString().padStart(2, '0')}`;
      return {
        rowLabel: row.toString().padStart(2, '0'),
        rowNumber: row,
        deck: 1,
        columns: [1],
        leftSeats: [{
          id: seatNumber,
          label: seatNumber,
          status: 'available',
          row,
          col: 1,
          deck: 1,
        }],
        rightSeats: [],
      };
    });
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <SeatGrid
          seatMap={fiveRows}
          selectedSeats={[]}
          aisleAfterCols={[]}
          onSeatPress={jest.fn()}
        />,
      );
    });

    const textNodes = renderer!.root.findAllByType(Text);
    const rowLabels = textNodes.filter(node =>
      ['01', '02', '03', '04', '05'].includes(node.props.children),
    );
    const seatLabels = textNodes.filter(node =>
      /^L\d{2}$/.test(String(node.props.children)),
    );
    const rowFontSizes = rowLabels.map(
      node => StyleSheet.flatten(node.props.style)?.fontSize,
    );
    const seatFontSizes = seatLabels.map(
      node => StyleSheet.flatten(node.props.style)?.fontSize,
    );

    expect(rowLabels).toHaveLength(5);
    expect(seatLabels).toHaveLength(5);
    expect(new Set(rowFontSizes).size).toBe(1);
    expect(new Set(seatFontSizes).size).toBe(1);
    rowLabels.forEach(node => {
      expect(node.props.adjustsFontSizeToFit).toBeUndefined();
    });
    seatLabels.forEach(node => {
      expect(node.props.adjustsFontSizeToFit).toBeUndefined();
    });

    act(() => renderer!.unmount());
  });
});
