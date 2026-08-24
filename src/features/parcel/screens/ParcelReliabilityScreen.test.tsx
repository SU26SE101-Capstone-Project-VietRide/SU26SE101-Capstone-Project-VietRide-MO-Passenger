import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

interface MockFlashListProps {
  data?: Array<{ eventId: string; sequence: number }>;
  ListFooterComponent?: React.ReactNode;
  renderItem: (info: {
    index: number;
    item: {
      actualLocationType: string | null;
      eventId: string;
      eventType: string;
      locationSnapshot: string | null;
      occurredAt: string;
      sequence: number;
    };
  }) => React.ReactNode;
}

const mockFetchNextPage = jest.fn(async () => undefined);
const mockFlashListCalls: MockFlashListProps[] = [];
const mockLiveTripTrackingPanel = jest.fn((_props: unknown) => null);
const mockRefetch = jest.fn(async () => undefined);
const mockUseParcelTrace = jest.fn();
let mockParcelStatus = 'RETURNED';

const mockTheme = {
  colors: new Proxy<Record<string, string>>({}, {
    get: () => '#007D78',
  }),
  components: { card: {} },
  isDark: false,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
  }),
  useRoute: () => ({
    params: {
      parcelId: '11111111-1111-4111-8111-111111111111',
    },
  }),
}));

jest.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: jest.fn() },
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const { View: NativeView } = require('react-native');
  return {
    SafeAreaView: (
      { children, ...props }: { children?: never; [key: string]: unknown },
    ) => ReactModule.createElement(NativeView, props, children),
  };
});

jest.mock('phosphor-react-native', () => {
  const MockIcon = () => null;
  return {
    ArrowClockwise: MockIcon,
    CaretDown: MockIcon,
    FileText: MockIcon,
    Package: MockIcon,
    WarningCircle: MockIcon,
  };
});

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@shared/hooks', () => ({
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) => (
    factory(mockTheme)
  ),
}));

jest.mock('@features/tracking', () => ({
  LiveTripTrackingPanel: (props: unknown) => mockLiveTripTrackingPanel(props),
  TrackingHeader: () => null,
}));

jest.mock('@shopify/flash-list', () => {
  const ReactModule = require('react');
  const { View: NativeView } = require('react-native');
  const MockFlashList = (props: MockFlashListProps) => {
    const { data = [], ListFooterComponent, renderItem } = props;
    mockFlashListCalls.push(props);
    return ReactModule.createElement(
      NativeView,
      { testID: 'parcel-reliability-flash-list' },
      ...data.map((item, index) => ReactModule.createElement(
        ReactModule.Fragment,
        { key: item.eventId },
        renderItem({ item: {
          actualLocationType: null,
          eventType: item.eventId,
          locationSnapshot: null,
          occurredAt: '2026-08-23T08:00:00.000Z',
          ...item,
        }, index }),
      )),
      ListFooterComponent,
    );
  };
  return { FlashList: MockFlashList };
});

jest.mock('../components', () => ({
  ErrorView: () => null,
}));

jest.mock('../hooks/useParcelReliabilityQueries', () => ({
  useParcelTrace: (parcelId: string) => mockUseParcelTrace(parcelId),
}));

import { ParcelReliabilityScreen } from './ParcelReliabilityScreen';

const event = (
  eventId: string,
  sequence: number,
) => ({
  actorRole: 'SYSTEM',
  actualLocationId: null,
  actualLocationType: 'STATION',
  eventId,
  eventType: eventId,
  expectedLocationId: null,
  expectedLocationType: null,
  locationSnapshot: `Location ${eventId}`,
  occurredAt: `2026-08-23T0${sequence}:00:00.000Z`,
  reason: null,
  sequence,
  source: 'SYSTEM',
  tripId: null,
});

const createTracePage = (
  parcelStatus: string,
  items: ReturnType<typeof event>[],
) => ({
  activeIncident: null,
  availableActions: [],
  claimSummary: null,
  currentCustody: null,
  dropoffLocation: {
    id: null,
    name: null,
    type: null,
  },
  forwardingTrip: null,
  nextUpdateAt: null,
  operator: {},
  parcelCode: 'PRC-001',
  parcelId: '11111111-1111-4111-8111-111111111111',
  parcelStatus,
  parcelSummary: {},
  timeline: {
    items,
    nextCursor: 'opaque-cursor',
  },
  trip: {
    route: null,
    tripId: '22222222-2222-4222-8222-222222222222',
  },
});

const createTraceQuery = (parcelStatus: string) => ({
  data: {
    pages: [
      createTracePage(parcelStatus, [
        event('event-1', 1),
        event('event-3', 3),
      ]),
      createTracePage(parcelStatus, [
        event('event-1', 1),
        event('event-2', 2),
      ]),
    ],
  },
  error: null,
  fetchNextPage: mockFetchNextPage,
  hasNextPage: true,
  isFetchingNextPage: false,
  isLoading: false,
  isRefetching: false,
  refetch: mockRefetch,
});

describe('ParcelReliabilityScreen timeline virtualization', () => {
  beforeEach(() => {
    mockFetchNextPage.mockClear();
    mockFlashListCalls.length = 0;
    mockLiveTripTrackingPanel.mockClear();
    mockParcelStatus = 'RETURNED';
    mockUseParcelTrace.mockReset();
    mockUseParcelTrace.mockImplementation(() => (
      createTraceQuery(mockParcelStatus)
    ));
  });

  it('uses one primary FlashList with deduped, sequence-sorted events off-map', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(<ParcelReliabilityScreen />);
    });

    expect(mockUseParcelTrace).toHaveBeenCalledTimes(1);
    expect(mockFlashListCalls).toHaveLength(1);
    const listProps = mockFlashListCalls[0];
    expect(listProps.data?.map(({ eventId }) => eventId)).toEqual([
      'event-3',
      'event-2',
      'event-1',
    ]);

    const footer = listProps.ListFooterComponent as React.ReactElement<{
      onPress: () => void;
    }>;
    act(() => footer.props.onPress());
    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
    expect(mockLiveTripTrackingPanel).not.toHaveBeenCalled();

    act(() => renderer!.unmount());
  });

  it('feeds deduped events to the existing tracking sheet without a nested list', () => {
    mockParcelStatus = 'IN_TRANSIT';
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(<ParcelReliabilityScreen />);
    });

    expect(mockUseParcelTrace).toHaveBeenCalledTimes(1);
    expect(mockFlashListCalls).toHaveLength(0);
    expect(mockLiveTripTrackingPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        detailsFooter: expect.anything(),
        detailsListSection: expect.objectContaining({
          footer: expect.anything(),
          items: [
            expect.objectContaining({ key: 'event-3' }),
            expect.objectContaining({ key: 'event-2' }),
            expect.objectContaining({ key: 'event-1' }),
          ],
        }),
        tripId: '22222222-2222-4222-8222-222222222222',
      }),
    );

    act(() => renderer!.unmount());
  });
});
