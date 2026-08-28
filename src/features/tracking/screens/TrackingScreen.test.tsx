import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import type { RootStackParamList } from '@app/navigation/types';
import type { TrackingShareQuickAction } from '../components/LiveTripTrackingPanel';
import type {
  TrackingHeaderAction,
  TrackingHeaderRoute,
} from '../components/TrackingHeader';

interface MockTrackingHeaderProps {
  actions?: readonly TrackingHeaderAction[];
  onBack: () => void;
  route?: TrackingHeaderRoute;
  subtitle: string;
  title: string;
}

interface MockLiveTripTrackingPanelProps {
  bookingId?: string;
  onRouteHeaderChange?: (route: TrackingHeaderRoute | undefined) => void;
  onShareQuickActionChange?: (action: TrackingShareQuickAction | null) => void;
  pickupOrder?: number;
  shuttleTripId?: string;
  source?: 'shuttle' | 'trip';
  terminalMessage?: string;
  trackingTarget?: { kind: 'STOP'; stopId: string };
  tripId?: string;
  tripStatus?: string;
}

const mockNavigation = { goBack: jest.fn() };
const mockTrackingHeader = jest.fn((_props: MockTrackingHeaderProps) => null);
const mockLiveTripTrackingPanel = jest.fn(
  (_props: MockLiveTripTrackingPanelProps) => null,
);
let mockRouteParams: RootStackParamList['Tracking'];

const mockTheme = {
  colors: {
    background: '#F7FAF9',
    error: '#B3261E',
    primary: '#007D78',
  },
  isDark: false,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: jest.fn() },
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactRuntime = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaView: ({ children, ...props }: React.PropsWithChildren<object>) =>
      ReactRuntime.createElement(View, props, children),
  };
});

jest.mock('phosphor-react-native', () => ({
  LinkBreak: () => null,
  ShareNetwork: () => null,
}));

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@shared/hooks', () => ({
  useThemedStyles: (
    factory: (theme: typeof mockTheme) => Record<string, object>,
  ) => factory(mockTheme),
}));

jest.mock('../components/TrackingHeader', () => ({
  TrackingHeader: (props: MockTrackingHeaderProps) => mockTrackingHeader(props),
}));

jest.mock('../components/LiveTripTrackingPanel', () => ({
  LiveTripTrackingPanel: (props: MockLiveTripTrackingPanelProps) =>
    mockLiveTripTrackingPanel(props),
}));

import { TrackingScreen } from './TrackingScreen';

const latestHeaderProps = (): MockTrackingHeaderProps =>
  mockTrackingHeader.mock.calls[mockTrackingHeader.mock.calls.length - 1][0];

const latestPanelProps = (): MockLiveTripTrackingPanelProps =>
  mockLiveTripTrackingPanel.mock.calls[
    mockLiveTripTrackingPanel.mock.calls.length - 1
  ][0];

describe('TrackingScreen quick actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {
      source: 'trip',
      tripId: '11111111-1111-4111-8111-111111111111',
      bookingId: '22222222-2222-4222-8222-222222222222',
      trackingTarget: {
        kind: 'STOP',
        stopId: '33333333-3333-4333-8333-333333333333',
      },
      tripStatus: 'IN_PROGRESS',
    };
  });

  it('promotes the main-trip share controller into one accessible header action', () => {
    const onShare = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(<TrackingScreen />);
    });

    expect(latestHeaderProps()).toMatchObject({
      actions: [],
      subtitle: 'tracking.bookingReference',
      title: 'tracking.liveTracking',
    });
    const panelProps = latestPanelProps();
    expect(panelProps).toMatchObject({
      onRouteHeaderChange: expect.any(Function),
      onShareQuickActionChange: expect.any(Function),
      source: 'trip',
      trackingTarget:
        mockRouteParams.source === 'trip'
          ? mockRouteParams.trackingTarget
          : undefined,
      tripId:
        mockRouteParams.source === 'trip' ? mockRouteParams.tripId : undefined,
      tripStatus: 'IN_PROGRESS',
    });

    act(() => {
      panelProps.onShareQuickActionChange?.({
        disabled: false,
        mode: 'share',
        pending: false,
        onPress: onShare,
        scopeKey: 'previous-trip',
      });
    });
    expect(latestHeaderProps().actions).toEqual([]);

    act(() => {
      panelProps.onShareQuickActionChange?.({
        disabled: false,
        mode: 'share',
        pending: false,
        onPress: onShare,
        scopeKey:
          mockRouteParams.source === 'trip'
            ? mockRouteParams.tripId
            : 'unexpected-shuttle-scope',
      });
    });

    let actions = latestHeaderProps().actions;
    expect(actions).toHaveLength(1);
    expect(actions?.[0]).toMatchObject({
      accessibilityHint: 'tracking.share.actionHint',
      accessibilityLabel: 'tracking.share.action',
      busy: false,
      disabled: false,
      key: 'share-location',
      tone: 'default',
    });
    act(() => actions?.[0]?.onPress());
    expect(onShare).toHaveBeenCalledTimes(1);

    const onRevoke = jest.fn();
    act(() => {
      panelProps.onShareQuickActionChange?.({
        disabled: false,
        mode: 'revoke',
        pending: false,
        onPress: onRevoke,
        scopeKey:
          mockRouteParams.source === 'trip'
            ? mockRouteParams.tripId
            : 'unexpected-shuttle-scope',
      });
    });
    actions = latestHeaderProps().actions;
    expect(actions?.[0]).toMatchObject({
      accessibilityHint: 'tracking.share.revokeActionHint',
      accessibilityLabel: 'tracking.share.revokeAction',
      tone: 'destructive',
    });
    act(() => actions?.[0]?.onPress());
    expect(onRevoke).toHaveBeenCalledTimes(1);

    act(() => {
      panelProps.onShareQuickActionChange?.({
        disabled: true,
        mode: 'revoke',
        pending: true,
        onPress: onRevoke,
        scopeKey:
          mockRouteParams.source === 'trip'
            ? mockRouteParams.tripId
            : 'unexpected-shuttle-scope',
      });
    });
    actions = latestHeaderProps().actions;
    expect(actions).toHaveLength(1);
    expect(actions?.[0]).toMatchObject({ busy: true, disabled: true });

    act(() => renderer!.unmount());
  });

  it('starts Shuttle tracking without Share while still wiring the controller callback', () => {
    mockRouteParams = {
      source: 'shuttle',
      shuttleTripId: '44444444-4444-4444-8444-444444444444',
      bookingId: '55555555-5555-4555-8555-555555555555',
      pickupOrder: 2,
    };
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(<TrackingScreen />);
    });

    expect(latestHeaderProps()).toMatchObject({
      actions: [],
      subtitle: 'tracking.bookingReference',
      title: 'tracking.shuttleLiveTracking',
    });
    const panelProps = latestPanelProps();
    expect(panelProps).toMatchObject({
      bookingId: '55555555-5555-4555-8555-555555555555',
      onShareQuickActionChange: expect.any(Function),
      pickupOrder: 2,
      shuttleTripId: '44444444-4444-4444-8444-444444444444',
      source: 'shuttle',
    });
    expect(panelProps.onRouteHeaderChange).toBeUndefined();

    act(() => panelProps.onShareQuickActionChange?.(null));
    expect(latestHeaderProps().actions).toEqual([]);

    act(() => renderer!.unmount());
  });
});
