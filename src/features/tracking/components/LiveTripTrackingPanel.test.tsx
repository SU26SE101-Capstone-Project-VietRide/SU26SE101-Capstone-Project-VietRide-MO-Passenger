import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

import { ApiRequestError } from '@shared/api/errors';

const mockTheme = {
  colors: {
    primary: '#007D78',
    textPrimary: '#10201F',
    textSecondary: '#435A57',
    textTertiary: '#70817F',
    textInverse: '#FFFFFF',
    warning: '#A46000',
    warningLight: '#FFF2D6',
    success: '#007D56',
    successLight: '#DDF8EC',
    error: '#B3261E',
    errorLight: '#FCE8E6',
    divider: '#DDE5E3',
    surface: '#FFFFFF',
    surfaceAlt: '#F3F7F6',
  },
};

const mockUseTripTracking = jest.fn();
const mockTrackingMap = jest.fn((_props: unknown) => null);
const mockUseTripDetail = jest.fn((_tripId: unknown, _options: unknown) => ({
  data: {
    status: 'IN_PROGRESS',
    stops: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Destination stop',
        latitude: 10.77,
        longitude: 106.69,
      },
    ],
  },
}));

jest.mock('@features/auth/store/useAuthStore', () => ({
  useAuthStore: (selector: (state: { user: { id: string } }) => unknown) => (
    selector({ user: { id: 'passenger-1' } })
  ),
}));

jest.mock('@features/trip/hooks', () => ({
  useTripDetail: (tripId: unknown, options: unknown) => mockUseTripDetail(tripId, options),
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
}));

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@shared/hooks', () => ({
  useIsAppActive: () => true,
  useNetworkStatus: () => true,
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) => factory(mockTheme),
}));

jest.mock('./TrackingMap', () => ({
  TrackingMap: (props: unknown) => mockTrackingMap(props),
}));

jest.mock('../hooks/useTripTracking', () => ({
  isTerminalTrackingStatus: (status?: string) => (
    status === 'COMPLETED' || status === 'CANCELLED' || status === 'DISRUPTED'
  ),
  useTripTracking: (options: unknown) => mockUseTripTracking(options),
}));

import { LiveTripTrackingPanel } from './LiveTripTrackingPanel';

const tripId = '11111111-1111-4111-8111-111111111111';
const stopId = '22222222-2222-4222-8222-222222222222';
const latest = {
  tripId,
  latitude: 10.76,
  longitude: 106.68,
  speedKmh: 42,
  recordedAt: '2026-07-20T06:30:00.000Z',
};

const createTrackingResult = (overrides: Record<string, unknown> = {}) => ({
  latest,
  trailPoints: [latest],
  nextEta: null,
  targetEta: null,
  delay: null,
  latestQuery: { error: null, isPending: false, isRefetching: false },
  trailQuery: { error: null, isPending: false, isRefetching: false },
  nextEtaQuery: { error: null, isPending: false, isRefetching: false },
  targetEtaQuery: { error: null, isPending: false, isRefetching: false },
  contextQuery: { error: null, isPending: false, isRefetching: false },
  fatalError: null,
  realtimeStatus: 'connected',
  isRealtimeConnected: true,
  hasAuthenticatedUser: true,
  hasValidTripId: true,
  hasValidStopId: true,
  isAppActive: true,
  isFocused: true,
  isOnline: true,
  isTerminal: false,
  isQueryEnabled: true,
  isPolling: true,
  refetchAll: jest.fn(async () => undefined),
  ...overrides,
});

describe('LiveTripTrackingPanel', () => {
  beforeEach(() => {
    mockTrackingMap.mockClear();
    mockUseTripDetail.mockClear();
    mockUseTripTracking.mockReset();
    mockUseTripTracking.mockReturnValue(createTrackingResult());
  });

  it('reuses public trip stops and one shared tracking hook for the map', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <LiveTripTrackingPanel
          tripId={tripId}
          trackingTarget={{ kind: 'STOP', stopId }}
        />,
      );
    });

    expect(mockUseTripTracking).toHaveBeenCalledWith({
      tripId,
      trackingTarget: { kind: 'STOP', stopId },
      tripStatus: 'IN_PROGRESS',
      sourceTerminal: false,
    });
    const tripQueryOptions = mockUseTripDetail.mock.calls[0][1] as {
      getRefetchInterval: (trip: { status: 'IN_PROGRESS' | 'COMPLETED' }) => number | false;
    };
    expect(tripQueryOptions.getRefetchInterval({ status: 'IN_PROGRESS' })).toBe(60_000);
    expect(tripQueryOptions.getRefetchInterval({ status: 'COMPLETED' })).toBe(false);
    expect(mockTrackingMap).toHaveBeenCalledWith(expect.objectContaining({
      latest,
      trail: [latest],
      vehicleKind: 'bus',
      bottomDock: expect.anything(),
    }));

    await act(async () => renderer!.unmount());
  });

  it('renders a Socket authorization rejection and does not mount the native map', async () => {
    mockUseTripTracking.mockReturnValue(createTrackingResult({
      fatalError: new ApiRequestError({
        message: 'denied',
        code: 'ACCESS_DENIED',
        statusCode: 403,
      }),
      realtimeStatus: 'forbidden',
    }));
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<LiveTripTrackingPanel tripId={tripId} />);
    });

    const renderedText = renderer!.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat(Infinity)
      .join(' ');
    expect(renderedText).toContain('Tracking access denied');
    expect(mockTrackingMap).not.toHaveBeenCalled();

    await act(async () => renderer!.unmount());
  });
});
