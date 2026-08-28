import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import type { BookingHistoryShuttleRequest } from '../types';

const translations: Record<string, string> = {
  'bookingHistory.shuttle.title': 'Trung chuyển',
  'bookingHistory.shuttle.inbound': 'Đón khách ở',
  'bookingHistory.shuttle.outbound': 'Thả khách ở',
  'bookingHistory.shuttle.active': 'Đã yêu cầu',
  'bookingHistory.shuttle.cancelled': 'Đã hủy',
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] ?? key,
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
  Van: () => null,
}));

import { ShuttleHistorySummary } from './ShuttleHistorySummary';

const request = (
  overrides: Partial<BookingHistoryShuttleRequest>,
): BookingHistoryShuttleRequest => ({
  direction: 'INBOUND_TO_STATION',
  address: '12 Nguyễn Huệ',
  latitude: 10.7731,
  longitude: 106.7032,
  roadDistanceMeters: 3_200,
  isActive: true,
  requestedAt: '2026-08-21T01:00:00Z',
  cancelledAt: null,
  ...overrides,
});

describe('ShuttleHistorySummary', () => {
  it('shows every pickup before every drop-off while preserving order within each group', () => {
    const requests = [
      request({
        direction: 'OUTBOUND_FROM_STATION',
        address: '45 Lê Lợi',
        requestedAt: '2026-08-21T01:00:00Z',
        isActive: false,
        cancelledAt: '2026-08-21T02:00:00Z',
      }),
      request({
        address: '12 Nguyễn Huệ',
        requestedAt: '2026-08-21T01:01:00Z',
      }),
      request({
        address: '18 Pasteur',
        requestedAt: '2026-08-21T01:02:00Z',
        isActive: false,
        cancelledAt: '2026-08-21T02:02:00Z',
      }),
    ] as const;
    const originalDirections = requests.map(item => item.direction);
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <ShuttleHistorySummary requests={requests} />,
      );
    });

    const labels = renderer!.root
      .findAllByType(Text)
      .map(node => node.props.children)
      .filter((value): value is string => typeof value === 'string');

    expect(labels).toEqual([
      'Trung chuyển',
      'Đón khách ở',
      'Đã yêu cầu',
      '12 Nguyễn Huệ',
      'Đón khách ở',
      'Đã hủy',
      '18 Pasteur',
      'Thả khách ở',
      'Đã hủy',
      '45 Lê Lợi',
    ]);
    expect(requests.map(item => item.direction)).toEqual(originalDirections);

    act(() => renderer!.unmount());
  });
});
