import React from 'react';
import { Modal, StyleSheet } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockUseParcelRoleHistory = jest.fn();
let mockInitialTab: 'ticket' | 'parcel' = 'parcel';
let mockTicketPages: unknown[] = [];
let mockResponsiveLayout = {
  width: 430,
  height: 932,
  fontScale: 1,
  widthClass: 'large',
  isCompact: false,
  isLarge: true,
  contentPaddingHorizontal: 24,
};
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
}));

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@shared/hooks', () => ({
  useIsAppActive: () => true,
  useResponsiveLayout: () => mockResponsiveLayout,
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

  await act(async () => {
    renderer = ReactTestRenderer.create(<BookingHistoryScreen />);
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
    mockResponsiveLayout = {
      width: 430,
      height: 932,
      fontScale: 1,
      widthClass: 'large',
      isCompact: false,
      isLarge: true,
      contentPaddingHorizontal: 24,
    };
  });

  it('opens one status sheet for Sent, applies an exact status, and hides it for Received', async () => {
    const renderer = await renderScreen();

    const dataTabs = [
      'bookingHistory.ticketsTab',
      'bookingHistory.parcelRoles.sent',
      'bookingHistory.parcelRoles.received',
    ].map(label => findFilterButton(renderer, label));
    expect(dataTabs).toHaveLength(3);
    expect(
      findFilterButton(renderer, 'bookingHistory.ticketsTab').props
        .accessibilityState,
    ).toEqual({ selected: false });
    expect(
      findFilterButton(renderer, 'bookingHistory.parcelRoles.sent').props
        .accessibilityState,
    ).toEqual({ selected: true });
    expect(
      findFilterButton(renderer, 'bookingHistory.parcelRoles.received').props
        .accessibilityState,
    ).toEqual({ selected: false });

    const openStatusFilter = findFilterButton(
      renderer,
      'bookingHistory.parcelStatusFilter.openAccessibility',
    );
    expect(getMinHeight(openStatusFilter)).toBeGreaterThanOrEqual(44);
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
    const statusOptionLabels = new Set(
      statusOptions.map(instance => instance.props.accessibilityLabel),
    );
    expect(statusOptionLabels.size).toBe(23);

    const inTransit = findFilterButton(
      renderer,
      'history.status.parcel.inTransit',
    );
    expect(inTransit.props.accessibilityRole).toBe('radio');
    expect(inTransit.props.accessibilityState).toEqual({ checked: false });
    expect(getMinHeight(inTransit)).toBeGreaterThanOrEqual(44);

    await act(async () => {
      inTransit.props.onPress();
    });

    expect(
      mockUseParcelRoleHistory.mock.calls[
        mockUseParcelRoleHistory.mock.calls.length - 1
      ],
    ).toEqual([
      'SENT',
      'IN_TRANSIT',
      PASSENGER_HISTORY_DEFAULT_PAGE_SIZE,
      true,
    ]);
    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'history.status.parcel.inTransit',
      }),
    ).toHaveLength(0);

    const received = findFilterButton(
      renderer,
      'bookingHistory.parcelRoles.received',
    );
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
      undefined,
      PASSENGER_HISTORY_DEFAULT_PAGE_SIZE,
      true,
    ]);

    const sent = findFilterButton(renderer, 'bookingHistory.parcelRoles.sent');
    await act(async () => {
      sent.props.onPress();
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
      'IN_TRANSIT',
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
        accessibilityLabel: 'history.status.parcel.inTransit',
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
        accessibilityLabel: 'history.status.parcel.inTransit',
      }),
    ).toHaveLength(0);

    await act(async () => renderer.unmount());
  });

  it('keeps all three data tabs wrap-safe at compact width and large font scale', async () => {
    mockResponsiveLayout = {
      width: 320,
      height: 720,
      fontScale: 1.4,
      widthClass: 'compact',
      isCompact: true,
      isLarge: false,
      contentPaddingHorizontal: 12,
    };

    const renderer = await renderScreen();
    const dataTabs = [
      'bookingHistory.ticketsTab',
      'bookingHistory.parcelRoles.sent',
      'bookingHistory.parcelRoles.received',
    ].map(label => findFilterButton(renderer, label));

    expect(dataTabs).toHaveLength(3);
    for (const tab of dataTabs) {
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
