import React from 'react';
import { Modal, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockUseParcelRoleHistory = jest.fn();
let mockInitialTab: 'ticket' | 'parcel' = 'parcel';
let mockTicketPages: unknown[] = [];
const mockHistoryQuery = {
  data: { pages: [] },
  error: null,
  fetchNextPage: jest.fn(async () => undefined),
  hasNextPage: false,
  isError: false,
  isFetchingNextPage: false,
  isPending: false,
  isRefetchError: false,
  isRefetching: false,
  isFetched: true,
  refetch: jest.fn(async () => undefined),
};

const mockTheme = {
  isDark: false,
  colors: {
    transparent: 'transparent',
    background: '#F7FAF9',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F6F5',
    primary: '#007D78',
    primaryFaded: '#DDF3F1',
    textPrimary: '#10201F',
    textSecondary: '#435A57',
    textTertiary: '#70817F',
    textInverse: '#FFFFFF',
    divider: '#DDE5E3',
    border: '#DDE5E3',
    error: '#B3261E',
    success: '#007D56',
    successLight: '#DDF5EA',
    warning: '#A46000',
    warningForeground: '#795900',
    warningLight: '#FFF2D6',
    info: '#1769AA',
    infoLight: '#E4F1FB',
  },
  effects: {
    isLiquid: false,
    contentSurfaceElevated: '#FFFFFF',
    contentSurfaceSoft: '#F1F6F5',
    contentBorder: '#DDE5E3',
    contentBorderStrong: '#C8D5D2',
    cardShadow: {},
    scrim: 'rgba(0, 0, 0, 0.45)',
  },
  components: {
    headerButton: {},
    card: {},
  },
};

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
  }),
  useRoute: () => ({
    params: { initialTab: mockInitialTab },
  }),
}));

jest.mock('@shopify/flash-list', () => {
  const ReactModule = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');

  return {
    FlashList: ({
      data = [],
      renderItem,
      keyExtractor,
      testID,
    }: {
      data?: unknown[];
      renderItem?: (info: { item: unknown; index: number }) => React.ReactNode;
      keyExtractor?: (item: unknown, index: number) => string;
      testID?: string;
    }) =>
      ReactModule.createElement(
        NativeView,
        { testID },
        data.map((item, index) =>
          ReactModule.createElement(
            ReactModule.Fragment,
            { key: keyExtractor?.(item, index) ?? String(index) },
            renderItem?.({ item, index }),
          ),
        ),
      ),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');

  return {
    SafeAreaView: (props: Record<string, unknown>) =>
      ReactModule.createElement(NativeView, props),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('phosphor-react-native', () => {
  const ReactModule = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');
  const icon = () => () => ReactModule.createElement(NativeView);

  return {
    ArrowLeft: icon(),
    CalendarBlank: icon(),
    Check: icon(),
    Clock: icon(),
    CreditCard: icon(),
    FunnelSimple: icon(),
    NavigationArrow: icon(),
    Package: icon(),
    Ticket: icon(),
    User: icon(),
    Van: icon(),
    WarningCircle: icon(),
    X: icon(),
  };
});

jest.mock('@features/auth/store/useAuthStore', () => ({
  useAuthStore: (selector: (state: { user: { id: string } }) => unknown) =>
    selector({ user: { id: 'user-1' } }),
}));

jest.mock('@features/booking/hooks/useBookingHistory', () => ({
  useBookingHistory: () => ({
    ...mockHistoryQuery,
    data: { pages: mockTicketPages },
  }),
}));

jest.mock('../hooks/useParcelRoleHistory', () => ({
  useParcelRoleHistory: (...args: unknown[]) => {
    mockUseParcelRoleHistory(...args);
    return mockHistoryQuery;
  },
}));

jest.mock('../api/passengerHistoryApi', () => ({
  PASSENGER_HISTORY_DEFAULT_PAGE_SIZE: 20,
}));

jest.mock('@shared/components', () => ({
  StatusChip: () => null,
  VnPayLogo: () => null,
}));

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@shared/hooks', () => ({
  useIsAppActive: () => true,
  useTabBarScrollBehavior: () => jest.fn(),
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) =>
    factory(mockTheme),
}));

jest.mock('@shared/payments', () => ({
  getPendingVnPaySession: jest.fn(async () => null),
  reopenPendingVnPayPayment: jest.fn(async () => undefined),
}));

jest.mock('@shared/utils/format', () => ({
  formatDate: () => 'date',
  formatTime: () => 'time',
  formatVnd: () => '0 VND',
}));

jest.mock('../components/ShuttleHistorySummary', () => {
  const ReactModule = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');

  return {
    ShuttleHistorySummary: () =>
      ReactModule.createElement(NativeView, {
        testID: 'shuttle-history-summary',
      }),
  };
});

import { PASSENGER_HISTORY_DEFAULT_PAGE_SIZE } from '../api/passengerHistoryApi';
import { BookingHistoryScreen } from './BookingHistoryScreen';

const renderScreen = async (): Promise<ReactTestRenderer.ReactTestRenderer> => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={queryClient}>
        <BookingHistoryScreen />
      </QueryClientProvider>,
    );
  });

  return renderer!;
};

const findFilterButton = (
  renderer: ReactTestRenderer.ReactTestRenderer,
  accessibilityLabel: string,
) => renderer.root.findByProps({ accessibilityLabel });

const getMinHeight = (
  instance: ReactTestRenderer.ReactTestInstance,
): number | undefined => {
  const style =
    typeof instance.props.style === 'function'
      ? instance.props.style({ pressed: false })
      : instance.props.style;
  return StyleSheet.flatten(style)?.minHeight;
};

describe('BookingHistoryScreen parcel status filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitialTab = 'parcel';
    mockTicketPages = [];
  });

  it('keeps two primary tabs, groups Sent statuses, and retains the group across roles', async () => {
    const renderer = await renderScreen();

    const ticketTab = findFilterButton(renderer, 'bookingHistory.ticketsTab');
    const parcelTab = findFilterButton(renderer, 'bookingHistory.parcelsTab');
    expect([ticketTab, parcelTab]).toHaveLength(2);
    expect(ticketTab.props.accessibilityState).toEqual({ selected: false });
    expect(parcelTab.props.accessibilityState).toEqual({ selected: true });

    const sent = findFilterButton(renderer, 'bookingHistory.parcelRoles.sent');
    const received = findFilterButton(
      renderer,
      'bookingHistory.parcelRoles.received',
    );
    expect(sent.props.accessibilityState).toEqual({ selected: true });
    expect(received.props.accessibilityState).toEqual({ selected: false });

    const openStatusFilter = findFilterButton(
      renderer,
      'bookingHistory.parcelStatusFilter.openAccessibility',
    );
    expect(getMinHeight(openStatusFilter)).toBeGreaterThanOrEqual(44);
    const toolbar = renderer.root.findByProps({
      testID: 'parcel-history-toolbar',
    });
    expect(
      toolbar.findByProps({
        accessibilityLabel: 'bookingHistory.parcelRoles.sent',
      }),
    ).toBeTruthy();
    expect(
      toolbar.findByProps({
        accessibilityLabel:
          'bookingHistory.parcelStatusFilter.openAccessibility',
      }),
    ).toBeTruthy();
    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'history.status.parcel.inTransit',
      }),
    ).toHaveLength(0);

    await act(async () => {
      openStatusFilter.props.onPress();
    });

    const closeStatusFilter = findFilterButton(
      renderer,
      'bookingHistory.parcelStatusFilter.closeAccessibility',
    );
    expect(getMinHeight(closeStatusFilter)).toBeGreaterThanOrEqual(44);

    const statusOptions = renderer.root.findAll(
      instance => instance.props.accessibilityRole === 'radio',
    );
    const statusOptionLabels = Array.from(
      new Set(statusOptions.map(instance => instance.props.accessibilityLabel)),
    );
    expect(statusOptionLabels).toEqual([
      'bookingHistory.filters.all',
      'bookingHistory.filters.needsAction',
      'bookingHistory.filters.inProgress',
      'bookingHistory.filters.awaitingConfirm',
      'bookingHistory.filters.delivered',
      'bookingHistory.filters.closed',
    ]);

    const inProgress = findFilterButton(
      renderer,
      'bookingHistory.filters.inProgress',
    );
    expect(inProgress.props.accessibilityRole).toBe('radio');
    expect(inProgress.props.accessibilityState).toEqual({ checked: false });
    expect(getMinHeight(inProgress)).toBeGreaterThanOrEqual(44);

    await act(async () => {
      inProgress.props.onPress();
    });

    expect(
      mockUseParcelRoleHistory.mock.calls[
        mockUseParcelRoleHistory.mock.calls.length - 1
      ],
    ).toEqual([
      'SENT',
      'IN_PROGRESS',
      PASSENGER_HISTORY_DEFAULT_PAGE_SIZE,
      true,
    ]);
    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'bookingHistory.filters.inProgress',
      }),
    ).toHaveLength(0);

    await act(async () => {
      received.props.onPress();
    });

    expect(
      renderer.root.findAllByProps({
        accessibilityLabel:
          'bookingHistory.parcelStatusFilter.openAccessibility',
      }),
    ).toHaveLength(0);
    expect(
      mockUseParcelRoleHistory.mock.calls[
        mockUseParcelRoleHistory.mock.calls.length - 1
      ],
    ).toEqual([
      'RECEIVED',
      'IN_PROGRESS',
      PASSENGER_HISTORY_DEFAULT_PAGE_SIZE,
      true,
    ]);

    const sentAgain = findFilterButton(
      renderer,
      'bookingHistory.parcelRoles.sent',
    );
    await act(async () => {
      sentAgain.props.onPress();
    });

    expect(
      findFilterButton(
        renderer,
        'bookingHistory.parcelStatusFilter.openAccessibility',
      ).props.accessibilityState,
    ).toEqual({ expanded: false, selected: true });
    expect(
      mockUseParcelRoleHistory.mock.calls[
        mockUseParcelRoleHistory.mock.calls.length - 1
      ],
    ).toEqual([
      'SENT',
      'IN_PROGRESS',
      PASSENGER_HISTORY_DEFAULT_PAGE_SIZE,
      true,
    ]);

    await act(async () => renderer.unmount());
  });

  it('dismisses the status sheet from both the close button and Android back request', async () => {
    const renderer = await renderScreen();
    const openStatusFilter = () =>
      findFilterButton(
        renderer,
        'bookingHistory.parcelStatusFilter.openAccessibility',
      );

    await act(async () => {
      openStatusFilter().props.onPress();
    });
    await act(async () => {
      findFilterButton(
        renderer,
        'bookingHistory.parcelStatusFilter.closeAccessibility',
      ).props.onPress();
    });
    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'bookingHistory.filters.inProgress',
      }),
    ).toHaveLength(0);

    await act(async () => {
      openStatusFilter().props.onPress();
    });
    const visibleModal = renderer.root
      .findAllByType(Modal)
      .find(modal => modal.props.visible);
    expect(visibleModal).toBeTruthy();
    await act(async () => {
      visibleModal?.props.onRequestClose();
    });
    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'bookingHistory.filters.inProgress',
      }),
    ).toHaveLength(0);

    await act(async () => renderer.unmount());
  });

  it('keeps the two-level controls wrap-safe with 44dp touch targets', async () => {
    const renderer = await renderScreen();
    const primaryTabs = [
      'bookingHistory.ticketsTab',
      'bookingHistory.parcelsTab',
    ].map(label => findFilterButton(renderer, label));

    expect(primaryTabs).toHaveLength(2);
    for (const tab of primaryTabs) {
      const tabStyle = StyleSheet.flatten(tab.props.style);
      expect(tabStyle?.minWidth).toBe(0);
      expect(tabStyle?.minHeight).toBeGreaterThanOrEqual(44);
      expect(
        tab.findAll(instance => instance.props.numberOfLines === 1).length,
      ).toBeGreaterThanOrEqual(1);
    }

    const roleTabs = [
      'bookingHistory.parcelRoles.sent',
      'bookingHistory.parcelRoles.received',
    ].map(label => findFilterButton(renderer, label));
    expect(roleTabs).toHaveLength(2);
    for (const tab of roleTabs) {
      const tabStyle = StyleSheet.flatten(tab.props.style);
      expect(tabStyle?.minWidth).toBe(0);
      expect(tabStyle?.minHeight).toBeGreaterThanOrEqual(44);
      expect(
        tab.findAll(instance => instance.props.numberOfLines === 2).length,
      ).toBeGreaterThanOrEqual(1);
    }

    const openStatusFilter = findFilterButton(
      renderer,
      'bookingHistory.parcelStatusFilter.openAccessibility',
    );
    const filterStyle = StyleSheet.flatten(openStatusFilter.props.style);
    expect(filterStyle?.width).toBe(44);
    expect(getMinHeight(openStatusFilter)).toBeGreaterThanOrEqual(44);

    const backButtonStyle = StyleSheet.flatten(
      findFilterButton(renderer, 'common.back').props.style,
    );
    expect(backButtonStyle?.width).toBe(44);
    expect(backButtonStyle?.height).toBe(44);

    await act(async () => renderer.unmount());
  });

  it('renders shuttle information directly after the route and before trip details', async () => {
    mockInitialTab = 'ticket';
    mockTicketPages = [
      {
        items: [
          {
            id: 'booking-1',
            code: 'VR-BKG-001',
            tripId: 'trip-1',
            createdAt: '2026-08-24T08:00:00Z',
            totalAmount: 150000,
            originName: 'Origin station',
            destinationName: 'Destination station',
            departureDateTime: '2026-08-25T08:00:00Z',
            estimatedArrivalTime: null,
            paymentRedirectUrl: null,
            trackingTarget: null,
            type: 'TICKET',
            status: 'CONFIRMED',
            ticket: {
              bookingGroupId: null,
              tripDirection: 'OUTBOUND',
              routeName: null,
              tickets: [
                {
                  ticketId: 'ticket-1',
                  ticketCode: 'VR-TKT-001',
                  seatNumber: 'A1',
                  status: 'ISSUED',
                  paidAmount: 150000,
                },
              ],
              vehicle: null,
              shuttleRequests: [
                {
                  direction: 'INBOUND_TO_STATION',
                  address: '123 Test Street',
                  latitude: 10.7,
                  longitude: 106.7,
                  roadDistanceMeters: null,
                  isActive: true,
                  requestedAt: '2026-08-24T08:00:00Z',
                  cancelledAt: null,
                },
              ],
            },
            parcel: null,
          },
        ],
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    ];

    const renderer = await renderScreen();
    const bookingBody = renderer.root.findByProps({
      accessibilityLabel: 'bookingHistory.bookingAccessibility',
    });
    const routeOrigin = bookingBody.findByProps({
      testID: 'ticket-history-route-origin',
    });
    const routeDestination = bookingBody.findByProps({
      testID: 'ticket-history-route-destination',
    });
    const routeArrow = bookingBody.findByProps({
      testID: 'ticket-history-route-arrow',
    });
    expect(routeOrigin.props.children).toBe('Origin station');
    expect(routeOrigin.props.numberOfLines).toBe(1);
    expect(routeOrigin.props.ellipsizeMode).toBe('tail');
    expect(routeDestination.props.children).toBe('Destination station');
    expect(routeDestination.props.numberOfLines).toBe(1);
    expect(routeDestination.props.ellipsizeMode).toBe('tail');
    expect(routeOrigin.parent).toBe(routeDestination.parent);
    expect(routeArrow.props.children).toBe('→');
    expect(routeArrow.props.accessible).toBe(false);
    expect(StyleSheet.flatten(routeArrow.props.style).fontSize).toBeLessThan(
      StyleSheet.flatten(routeOrigin.props.style).fontSize,
    );
    expect(
      bookingBody.findByProps({ testID: 'ticket-history-pickup' }).props.children,
    ).toBe('Origin station');
    expect(
      bookingBody.findByProps({ testID: 'ticket-history-dropoff' }).props.children,
    ).toBe('Destination station');
    expect(StyleSheet.flatten(
      bookingBody.findByProps({ testID: 'ticket-history-pickup-dot' }).props.style,
    )?.backgroundColor).toBe(mockTheme.colors.primary);
    const dropoffDotStyle = StyleSheet.flatten(
      bookingBody.findByProps({ testID: 'ticket-history-dropoff-dot' }).props.style,
    );
    expect(dropoffDotStyle?.backgroundColor).toBe(mockTheme.colors.success);
    expect(dropoffDotStyle?.borderColor).toBe(mockTheme.colors.successLight);
    const orderedBlocks = bookingBody
      .findAll(instance =>
        [
          'ticket-history-route',
          'shuttle-history-summary',
          'ticket-history-details',
        ].includes(instance.props.testID),
      )
      .map(instance => instance.props.testID)
      .filter((testID, index, testIDs) => testIDs.indexOf(testID) === index);

    expect(orderedBlocks).toEqual([
      'ticket-history-route',
      'shuttle-history-summary',
      'ticket-history-details',
    ]);

    await act(async () => renderer.unmount());
  });
});
