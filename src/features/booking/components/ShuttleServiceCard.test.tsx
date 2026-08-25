import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockTheme = {
  colors: {
    divider: '#d8e3e2',
    error: '#b42318',
    primary: '#007d78',
    primaryFaded: '#e3f5f3',
    surface: '#fff',
    surfaceAlt: '#f4f7f7',
    success: '#138a5b',
    textPrimary: '#13211f',
    textSecondary: '#435a57',
    textTertiary: '#70817f',
  },
  accents: {
    assistant: {
      border: '#b7ded9',
      foreground: '#007d78',
      soft: '#e3f5f3',
    },
  },
  effects: {
    isLiquid: false,
    glassBorder: '#d8e3e2',
    glassSurfaceSoft: '#f4f7f7',
  },
  components: { card: {} },
};

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));
jest.mock('@shared/hooks', () => ({
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) => factory(mockTheme),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'booking.shuttle.arrangementNotice': 'The operator will arrange the Shuttle.',
      'booking.shuttle.editAddress': 'Edit Shuttle pickup address',
      'booking.shuttle.requestAccessibility': 'Request Shuttle pickup',
      'booking.shuttle.savedAwaitingArrangement': 'Saved, awaiting arrangement',
      'booking.shuttle.title': 'Shuttle pickup',
      'booking.shuttle.requestToStation': 'Request pickup to the station',
    }[key] ?? key),
  }),
}));
jest.mock('phosphor-react-native', () => ({
  MapPinLine: () => null,
  PencilSimple: () => null,
  Van: () => null,
}));

import { ShuttleServiceCard } from './ShuttleServiceCard';

describe('ShuttleServiceCard', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  afterEach(async () => {
    if (renderer) await act(async () => renderer?.unmount());
    renderer = undefined;
  });

  it('lets an eligible passenger opt into the Shuttle request form', async () => {
    const onToggle = jest.fn();
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <ShuttleServiceCard
          status="available"
          value={null}
          stationName="Mien Tay Station"
          onToggle={onToggle}
          onEdit={jest.fn()}
        />,
      );
    });

    const shuttleSwitch = renderer!.root.findByProps({
      accessibilityLabel: 'Request Shuttle pickup',
    });
    expect(shuttleSwitch.props.disabled).toBe(false);

    act(() => shuttleSwitch.props.onValueChange(true));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('fails closed when the departure station is unsupported', async () => {
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <ShuttleServiceCard
          status="unavailable"
          value={null}
          unavailableReason="This departure station does not support Shuttle pickup."
          onToggle={jest.fn()}
          onEdit={jest.fn()}
        />,
      );
    });

    expect(renderer!.root.findByProps({
      accessibilityLabel: 'Request Shuttle pickup',
    }).props.disabled).toBe(true);
    expect(JSON.stringify(renderer!.toJSON())).toContain('does not support Shuttle pickup');
  });

  it('shows a saved request as awaiting arrangement and supports editing', async () => {
    const onEdit = jest.fn();
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <ShuttleServiceCard
          status="available"
          value={{
            stationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            address: '12 Nguyen Hue, District 1',
            latitude: 10.7769,
            longitude: 106.7009,
          }}
          onToggle={jest.fn()}
          onEdit={onEdit}
        />,
      );
    });

    expect(JSON.stringify(renderer!.toJSON())).toContain('awaiting arrangement');
    act(() => renderer!.root.findByProps({
      accessibilityLabel: 'Edit Shuttle pickup address',
    }).props.onPress());
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
