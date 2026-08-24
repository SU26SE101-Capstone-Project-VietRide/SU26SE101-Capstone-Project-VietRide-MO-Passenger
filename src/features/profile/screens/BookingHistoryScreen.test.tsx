import React from 'react';
import { Modal, StyleSheet } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockUseParcelRoleHistory = jest.fn();
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
    params: { initialTab: 'parcel' },
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
  useBookingHistory: () => mockHistoryQuery,
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

jest.mock('../components/ShuttleHistorySummary', () => ({
  ShuttleHistorySummary: () => null,
}));

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

    const openStatusFilter = findFilterButton(
      renderer,
      'bookingHistory.parcelStatusFilter.openAccessibility',
    );
    expect(getMinHeight(openStatusFilter)).toBeGreaterThanOrEqual(44);
    expect(
      renderer.root.findByProps({ children: 'bookingHistory.filters.all' }),
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
      ),
    ).toBeTruthy();
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

  it('keeps the status trigger icon-only outside roomy text conditions', async () => {
    mockResponsiveLayout = {
      width: 390,
      height: 844,
      fontScale: 1.4,
      widthClass: 'regular',
      isCompact: false,
      isLarge: false,
      contentPaddingHorizontal: 16,
    };

    const renderer = await renderScreen();

    expect(
      renderer.root.findAllByProps({ children: 'bookingHistory.filters.all' }),
    ).toHaveLength(0);
    const openStatusFilter = findFilterButton(
      renderer,
      'bookingHistory.parcelStatusFilter.openAccessibility',
    );
    expect(getMinHeight(openStatusFilter)).toBeGreaterThanOrEqual(44);

    await act(async () => renderer.unmount());
  });
});
