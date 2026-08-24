import React from 'react';
import { StyleSheet } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockUseParcelRoleHistory = jest.fn();
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
    FlashList: () => ReactModule.createElement(NativeView),
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
  };
});

jest.mock('phosphor-react-native', () => {
  const ReactModule = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');
  const icon = () => () => ReactModule.createElement(NativeView);

  return {
    ArrowLeft: icon(),
    CalendarBlank: icon(),
    Clock: icon(),
    CreditCard: icon(),
    NavigationArrow: icon(),
    Package: icon(),
    Ticket: icon(),
    User: icon(),
    Van: icon(),
    WarningCircle: icon(),
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

describe('BookingHistoryScreen parcel status filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows exact status filters for Sent and hides them for Received', async () => {
    const renderer = await renderScreen();

    expect(
      findFilterButton(renderer, 'bookingHistory.filters.all'),
    ).toBeTruthy();
    const inTransit = findFilterButton(
      renderer,
      'history.status.parcel.inTransit',
    );
    expect(
      StyleSheet.flatten(inTransit.props.style).minHeight,
    ).toBeGreaterThanOrEqual(44);

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

    const received = findFilterButton(
      renderer,
      'bookingHistory.parcelRoles.received',
    );
    await act(async () => {
      received.props.onPress();
    });

    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'history.status.parcel.inTransit',
      }),
    ).toHaveLength(0);
    expect(
      mockUseParcelRoleHistory.mock.calls[
        mockUseParcelRoleHistory.mock.calls.length - 1
      ],
    ).toEqual([
      'RECEIVED',
      'IN_TRANSIT',
      PASSENGER_HISTORY_DEFAULT_PAGE_SIZE,
      true,
    ]);

    const sent = findFilterButton(renderer, 'bookingHistory.parcelRoles.sent');
    await act(async () => {
      sent.props.onPress();
    });

    expect(
      findFilterButton(renderer, 'history.status.parcel.inTransit'),
    ).toBeTruthy();

    await act(async () => renderer.unmount());
  });
});
