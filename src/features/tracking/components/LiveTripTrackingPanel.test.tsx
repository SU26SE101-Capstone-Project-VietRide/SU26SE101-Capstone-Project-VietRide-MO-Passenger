import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Alert, Text } from 'react-native';

import { ApiRequestError } from '@shared/api/errors';
import { formatTime } from '@shared/utils/format';

const mockTheme = {
  colors: {
    primary: '#007D78',
    textPrimary: '#10201F',
    textSecondary: '#435A57',
    textTertiary: '#70817F',
    textInverse: '#FFFFFF',
    warning: '#A46000',
    warningForeground: '#795900',
    warningLight: '#FFF2D6',
    success: '#007D56',
    successLight: '#DDF8EC',
    error: '#B3261E',
    errorLight: '#FCE8E6',
    divider: '#DDE5E3',
    surface: '#FFFFFF',
    surfaceAlt: '#F3F7F6',
  },
  isDark: false,
};

const mockUseTripTracking = jest.fn();
const mockShareTrip = jest.fn(async () => 'shared' as const);
const mockRevokeTripShare = jest.fn(async () => 'revoked' as const);
let mockActiveTripId: string | null = null;
let mockIsSharing = false;
let mockIsRevoking = false;
const mockFlashList = jest.fn((_props: unknown) => null);
const mockTrackingMap = jest.fn((_props: unknown) => null);
const mockTripTrackingMapExperience = jest.fn((props: {
  renderMap: (bottomContentInset: number) => React.ReactNode;
}) => props.renderMap(132));
const mockTrackingDetailsContent = jest.fn((_props: unknown) => null);
const mockUseTripDetail = jest.fn((_tripId: unknown, _options: unknown) => ({
  data: {
    status: 'IN_PROGRESS',
    destinationStationId: '33333333-3333-4333-8333-333333333333',
    estimatedArrivalDateTime: '2026-07-20T15:00:00+07:00',
    stops: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Destination stop',
        latitude: 10.77,
        longitude: 106.69,
        orderIndex: 1,
        status: 'PENDING',
        estimatedArrivalTime: '2026-07-20T14:45:00+07:00',
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

jest.mock('@shopify/flash-list', () => ({
  FlashList: (props: unknown) => mockFlashList(props),
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
  useThemedStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('./TrackingMap', () => ({
  TrackingMap: (props: unknown) => mockTrackingMap(props),
}));

jest.mock('./TripTrackingMapExperience', () => ({
  TripTrackingMapExperience: (props: {
    renderMap: (bottomContentInset: number) => React.ReactNode;
  }) => mockTripTrackingMapExperience(props),
}));

jest.mock('./TrackingDetailsContent', () => ({
  TrackingDetailsContent: (props: unknown) => mockTrackingDetailsContent(props),
}));

jest.mock('../hooks/useTripSharing', () => ({
  useTripSharing: () => ({
    activeTripId: mockActiveTripId,
    shareTrip: mockShareTrip,
    revokeTripShare: mockRevokeTripShare,
    isSharing: mockIsSharing,
    isRevoking: mockIsRevoking,
  }),
}));

jest.mock('../hooks/useTripTracking', () => ({
  isTerminalTrackingStatus: (status?: string) => (
    status === 'COMPLETED' || status === 'CANCELLED' || status === 'DISRUPTED'
  ),
  useTripTracking: (options: unknown) => mockUseTripTracking(options),
}));

import {
  LiveTripTrackingPanel,
  type TrackingShareQuickAction,
} from './LiveTripTrackingPanel';

const tripId = '11111111-1111-4111-8111-111111111111';
const stopId = '22222222-2222-4222-8222-222222222222';
const latest = {
  tripId,
  latitude: 10.76,
  longitude: 106.68,
  speedKmh: 42,
  recordedAt: '2026-07-20T06:30:00.000Z',
};
const routeContext = {
  tripId,
  geometry: {
    source: 'ROUTE_POLYLINE',
    points: [
      { latitude: 10.75, longitude: 106.67 },
      { latitude: 10.77, longitude: 106.69 },
    ],
  },
  originStation: null,
  intermediateStops: [{
    stopId,
    name: 'Destination stop',
    sequence: 1,
    latitude: 10.77,
    longitude: 106.69,
  }],
  destinationStation: {
    stationId: '33333333-3333-4333-8333-333333333333',
    name: 'Destination station',
    latitude: 10.78,
    longitude: 106.7,
  },
};
const liveEta = {
  tripId,
  targetKind: 'STOP' as const,
  stopId,
  sequence: 1,
  stopName: null,
  etaMinutes: 6,
  estimatedArrivalTime: '2026-07-20T13:36:00+07:00',
  distanceMeters: 1_200,
  updatedAt: '2026-07-20T13:30:00+07:00',
  delayed: null,
  delayStatus: 'UNKNOWN' as const,
  delayMinutes: null,
  estimateQuality: 'TRAFFIC_AWARE' as const,
};


const createTrackingResult = (overrides: Record<string, unknown> = {}) => ({
  latest,
  etas: [liveEta],
  routeContext,
  shuttleContext: null,
  selectedShuttlePickup: null,
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
  hasValidTrackingId: true,
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
    mockFlashList.mockClear();
    mockTrackingMap.mockClear();
    mockTripTrackingMapExperience.mockClear();
    mockTrackingDetailsContent.mockClear();
    mockUseTripDetail.mockClear();
    mockShareTrip.mockClear();
    mockRevokeTripShare.mockClear();
    mockActiveTripId = null;
    mockIsSharing = false;
    mockIsRevoking = false;
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
      source: 'trip',
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
    expect(mockTripTrackingMapExperience).toHaveBeenCalledWith(expect.objectContaining({
      items: expect.arrayContaining([
        expect.objectContaining({ id: `stop:${stopId}`, tone: 'targetNext' }),
      ]),
      featuredItems: [expect.objectContaining({ tone: 'targetNext' })],
    }));
    expect(mockTrackingMap).toHaveBeenCalledWith(expect.objectContaining({
      latest,
      trail: [latest],
      vehicleKind: 'bus',
      showDrivenTrail: false,
      bottomContentInset: 132,
      edgeToEdge: true,
    }));

    await act(async () => renderer!.unmount());
  });

  it('passes supplemental Reliability rows through to the existing sheet list', async () => {
    const detailsListSection = {
      footer: <Text>Load earlier</Text>,
      items: [
        {
          content: <Text>Custody event</Text>,
          key: 'event-1',
          type: 'parcel-timeline-event',
        },
      ],
    };
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <LiveTripTrackingPanel
          detailsFooter={<Text>Reliability summary</Text>}
          detailsListSection={detailsListSection}
          tripId={tripId}
        />,
      );
    });

    expect(mockTripTrackingMapExperience).toHaveBeenCalledWith(
      expect.objectContaining({
        supplementalListSection: detailsListSection,
      }),
    );
    const experienceProps = (
      mockTripTrackingMapExperience.mock.calls[0][0]
    ) as unknown as {
        footer: React.ReactElement<{ detailsFooter: React.ReactNode }>;
      };
    expect(experienceProps.footer.props.detailsFooter).toBeDefined();

    await act(async () => renderer!.unmount());
  });

  it('renders planned route and all stop POIs before the first GPS point', async () => {
    mockUseTripTracking.mockReturnValue(createTrackingResult({
      latest: null,
      trailPoints: [],
      etas: [{
        tripId,
        targetKind: 'STOP',
        stopId,
        sequence: 1,
        stopName: null,
        etaMinutes: 1,
        estimatedArrivalTime: '2026-07-20T13:31:00+07:00',
        distanceMeters: 300,
        updatedAt: '2026-07-20T13:30:00+07:00',
        delayed: null,
        delayStatus: 'UNKNOWN',
        delayMinutes: null,
        estimateQuality: 'TRAFFIC_AWARE',
      }],
    }));
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<LiveTripTrackingPanel tripId={tripId} />);
    });

    expect(mockTrackingMap).toHaveBeenCalledWith(expect.objectContaining({
      latest: null,
      plannedRoute: routeContext.geometry.points,
      markers: expect.arrayContaining([
        expect.objectContaining({ id: `stop:${stopId}` }),
        expect.objectContaining({ id: `destination:${routeContext.destinationStation.stationId}` }),
      ]),
      showDrivenTrail: false,
    }));
    expect(mockTripTrackingMapExperience).toHaveBeenCalledWith(expect.objectContaining({
      featuredItems: [expect.objectContaining({
        id: `stop:${stopId}`,
        detail: expect.stringContaining(formatTime('2026-07-20T14:45:00+07:00')),
      })],
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
    expect(renderedText).toMatch(/Tracking access denied|Không có quyền theo dõi/);
    expect(mockTrackingMap).not.toHaveBeenCalled();

    await act(async () => renderer!.unmount());
  });

  it('keeps supplemental Reliability rows visible in the tracking-error fallback', async () => {
    mockUseTripTracking.mockReturnValue(createTrackingResult({
      fatalError: new ApiRequestError({
        message: 'denied',
        code: 'ACCESS_DENIED',
        statusCode: 403,
      }),
      realtimeStatus: 'forbidden',
    }));
    const detailsListSection = {
      footer: <Text>Load earlier</Text>,
      items: [
        {
          content: <Text>Custody event</Text>,
          key: 'event-1',
          type: 'parcel-timeline-event',
        },
      ],
    };
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <LiveTripTrackingPanel
          detailsFooter={<Text>Reliability summary</Text>}
          detailsListSection={detailsListSection}
          tripId={tripId}
        />,
      );
    });

    expect(mockTripTrackingMapExperience).not.toHaveBeenCalled();
    expect(mockFlashList).toHaveBeenCalledWith(expect.objectContaining({
      data: detailsListSection.items,
      ListFooterComponent: expect.anything(),
      ListHeaderComponent: expect.anything(),
    }));

    await act(async () => renderer!.unmount());
  });

  it('shows an unavailable Your Stop card instead of guessing across route contexts', async () => {
    const foreignStopId = '77777777-7777-4777-8777-777777777777';
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <LiveTripTrackingPanel
          tripId={tripId}
          trackingTarget={{ kind: 'STOP', stopId: foreignStopId }}
        />,
      );
    });

    expect(mockTripTrackingMapExperience).toHaveBeenCalledWith(expect.objectContaining({
      featuredItems: expect.arrayContaining([
        expect.objectContaining({ id: `stop:${stopId}`, tone: 'next' }),
        expect.objectContaining({ id: 'target:unavailable', tone: 'target' }),
      ]),
    }));
    const mapProps = mockTrackingMap.mock.calls[0][0] as {
      markers: Array<{ kind: string }>;
    };
    expect(mapProps.markers).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'target' }),
      expect.objectContaining({ kind: 'targetNext' }),
    ]));

    await act(async () => renderer!.unmount());
  });

  it('keeps the existing Shuttle map flow and journey dock', async () => {
    const bookingId = '44444444-4444-4444-8444-444444444444';
    const shuttleLatest = {
      shuttleTripId: tripId,
      latitude: 10.76,
      longitude: 106.68,
      speedKmh: 28,
      recordedAt: '2026-07-20T13:30:00+07:00',
    };
    const selectedShuttlePickup = {
      bookingId,
      pickupOrder: 1,
      serviceAddress: '12 Nguyen Hue',
      latitude: 10.775,
      longitude: 106.7,
      status: 'PENDING',
      stopsBeforePickup: 0,
    };
    mockUseTripTracking.mockReturnValue(createTrackingResult({
      latest: shuttleLatest,
      trailPoints: [shuttleLatest],
      routeContext: null,
      shuttleContext: {
        shuttleTripId: tripId,
        mainTripId: '55555555-5555-4555-8555-555555555555',
        direction: 'INBOUND_TO_STATION',
        ownPickups: [selectedShuttlePickup],
        station: {
          stationId: '66666666-6666-4666-8666-666666666666',
          name: 'Ben Thanh Station',
          latitude: 10.772,
          longitude: 106.698,
          pickupOrder: 2,
        },
      },
      selectedShuttlePickup,
    }));
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <LiveTripTrackingPanel
          source="shuttle"
          shuttleTripId={tripId}
          bookingId={bookingId}
          pickupOrder={1}
        />,
      );
    });

    expect(mockUseTripTracking).toHaveBeenCalledWith({
      source: 'shuttle',
      shuttleTripId: tripId,
      bookingId,
      pickupOrder: 1,
    });
    expect(mockTripTrackingMapExperience).not.toHaveBeenCalled();
    expect(mockTrackingMap).toHaveBeenCalledWith(expect.objectContaining({
      latest: shuttleLatest,
      trail: [shuttleLatest],
      vehicleKind: 'shuttle',
      bottomDock: expect.anything(),
    }));
    const shuttleMapProps = mockTrackingMap.mock.calls[0][0] as Record<string, unknown>;
    expect(shuttleMapProps).not.toHaveProperty('edgeToEdge');
    expect(shuttleMapProps).not.toHaveProperty('showDrivenTrail');

    await act(async () => renderer!.unmount());
  });

  it('keeps POIs and exposes route-unavailable state when geometry is null', async () => {
    mockUseTripTracking.mockReturnValue(createTrackingResult({
      routeContext: {
        ...routeContext,
        geometry: null,
      },
    }));
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<LiveTripTrackingPanel tripId={tripId} />);
    });

    expect(mockTrackingMap).toHaveBeenCalledWith(expect.objectContaining({
      plannedRoute: [],
      markers: expect.arrayContaining([
        expect.objectContaining({ id: `stop:${stopId}` }),
        expect.objectContaining({
          id: `destination:${routeContext.destinationStation.stationId}`,
        }),
      ]),
      showDrivenTrail: false,
    }));
    const experienceProps = mockTripTrackingMapExperience.mock.calls[0][0] as unknown as {
      footer: React.ReactElement<{ routeUnavailable: boolean }>;
    };
    expect(experienceProps.footer.props.routeUnavailable).toBe(true);

    await act(async () => renderer!.unmount());
  });

  it('publishes an enabled quick Share action, invokes it, and clears it on unmount', async () => {
    const onShareQuickActionChange = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <LiveTripTrackingPanel
          tripId={tripId}
          onShareQuickActionChange={onShareQuickActionChange}
        />,
      );
    });

    const action = [...onShareQuickActionChange.mock.calls]
      .reverse()
      .map(([value]) => value as TrackingShareQuickAction | null)
      .find((value): value is TrackingShareQuickAction => value !== null);
    expect(action).toEqual(expect.objectContaining({
      scopeKey: tripId,
      mode: 'share',
      disabled: false,
      pending: false,
      onPress: expect.any(Function),
    }));
    const experienceProps = mockTripTrackingMapExperience.mock.calls[0][0] as unknown as {
      footer: React.ReactElement<{ showPrimaryShareAction: boolean }>;
    };
    expect(experienceProps.footer.props.showPrimaryShareAction).toBe(false);

    await act(async () => {
      action?.onPress();
      await Promise.resolve();
    });
    expect(mockShareTrip).toHaveBeenCalledWith(expect.objectContaining({ tripId }));

    await act(async () => renderer!.unmount());
    expect(onShareQuickActionChange).toHaveBeenLastCalledWith(null);
  });

  it('publishes Revoke for an active grant and opens the confirmation dialog', async () => {
    mockActiveTripId = tripId;
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const onShareQuickActionChange = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <LiveTripTrackingPanel
          tripId={tripId}
          onShareQuickActionChange={onShareQuickActionChange}
        />,
      );
    });

    const action = [...onShareQuickActionChange.mock.calls]
      .reverse()
      .map(([value]) => value as TrackingShareQuickAction | null)
      .find((value): value is TrackingShareQuickAction => value !== null);
    expect(action).toEqual(expect.objectContaining({
      mode: 'revoke',
      scopeKey: tripId,
    }));

    act(() => action?.onPress());
    const confirmationButtons = alertSpy.mock.calls[0]?.[2];
    const destructiveAction = confirmationButtons?.find(
      button => button.style === 'destructive',
    );
    await act(async () => {
      destructiveAction?.onPress?.();
      await Promise.resolve();
    });
    expect(mockRevokeTripShare).toHaveBeenCalledWith({ tripId });

    await act(async () => renderer!.unmount());
    alertSpy.mockRestore();
  });

  it('publishes a disabled quick Share action while offline', async () => {
    mockUseTripTracking.mockReturnValue(createTrackingResult({ isOnline: false }));
    const onShareQuickActionChange = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <LiveTripTrackingPanel
          tripId={tripId}
          onShareQuickActionChange={onShareQuickActionChange}
        />,
      );
    });

    expect(onShareQuickActionChange).toHaveBeenLastCalledWith(expect.objectContaining({
      scopeKey: tripId,
      mode: 'share',
      disabled: true,
      pending: false,
    }));

    await act(async () => renderer!.unmount());
  });

  it('publishes pending and disabled while a Share operation is in flight', async () => {
    mockIsSharing = true;
    const onShareQuickActionChange = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <LiveTripTrackingPanel
          tripId={tripId}
          onShareQuickActionChange={onShareQuickActionChange}
        />,
      );
    });

    expect(onShareQuickActionChange).toHaveBeenLastCalledWith(expect.objectContaining({
      scopeKey: tripId,
      mode: 'share',
      disabled: true,
      pending: true,
    }));

    await act(async () => renderer!.unmount());
  });

  it('publishes no quick Share action for terminal trips or Shuttle tracking', async () => {
    mockUseTripTracking.mockReturnValue(createTrackingResult({ isTerminal: true }));
    const onTerminalChange = jest.fn();
    let terminalRenderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      terminalRenderer = ReactTestRenderer.create(
        <LiveTripTrackingPanel
          tripId={tripId}
          onShareQuickActionChange={onTerminalChange}
        />,
      );
    });
    expect(onTerminalChange).toHaveBeenLastCalledWith(null);
    await act(async () => terminalRenderer!.unmount());

    mockUseTripTracking.mockReturnValue(createTrackingResult());
    const onShuttleChange = jest.fn();
    let shuttleRenderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      shuttleRenderer = ReactTestRenderer.create(
        <LiveTripTrackingPanel
          source="shuttle"
          shuttleTripId={tripId}
          onShareQuickActionChange={onShuttleChange}
        />,
      );
    });
    expect(onShuttleChange).toHaveBeenLastCalledWith(null);
    await act(async () => shuttleRenderer!.unmount());
  });
});
