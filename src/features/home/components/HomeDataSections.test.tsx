import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { PromotionsSection } from './PromotionsSection';
import { RecentParcelsSection } from './RecentParcelsSection';

const mockUseHomePromotions = jest.fn();
const mockUseSentParcels = jest.fn();
const mockFlashListProps = jest.fn();

const mockTheme = {
  colors: {
    divider: '#ddd',
    errorLight: '#fee',
    primary: '#087f5b',
    primaryFaded: '#e6fcf5',
    successLight: '#e6fcf5',
    surfaceAlt: '#f5f5f5',
    textInverse: '#fff',
    textPrimary: '#111',
    textSecondary: '#555',
    textTertiary: '#777',
    warningLight: '#fff3bf',
  },
  components: {
    card: {},
  },
  effects: {
    glassBorder: '#ddd',
    glassSurfaceSoft: '#fff',
    isLiquid: false,
  },
};

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@shared/hooks', () => ({
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) =>
    factory(mockTheme),
}));

jest.mock('@shared/components', () => ({
  StatusChip: () => null,
}));

jest.mock('../hooks/useHomePromotions', () => ({
  useHomePromotions: (service: string) => mockUseHomePromotions(service),
}));

jest.mock('@features/parcel/hooks/useParcelReliabilityQueries', () => ({
  useSentParcels: (query: { pageSize: number }) => mockUseSentParcels(query),
}));

jest.mock('phosphor-react-native', () => ({
  ArrowRight: () => null,
  Package: () => null,
  Tag: () => null,
  Truck: () => null,
}));

jest.mock('@shopify/flash-list', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const ReactNative =
    jest.requireActual<typeof import('react-native')>('react-native');

  interface MockFlashListProps {
    contentContainerStyle?: unknown;
    data?: readonly unknown[];
    ItemSeparatorComponent?: React.ComponentType;
    renderItem: (info: {
      item: unknown;
      index: number;
    }) => React.ReactElement | null;
  }

  return {
    FlashList: (props: MockFlashListProps) => {
      mockFlashListProps(props);
      const { data = [], renderItem } = props;
      return ReactModule.createElement(
        ReactNative.View,
        null,
        ...data.map((item, index) =>
          ReactModule.createElement(
            ReactNative.View,
            { key: String(index) },
            renderItem({ item, index }),
          ),
        ),
      );
    },
  };
});

describe('Home data sections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders promotions as scroll-only content without a press action', async () => {
    mockUseHomePromotions.mockReturnValue({
      data: [
        {
          voucherId: 'voucher-1',
          code: 'RIDE20',
          name: 'Ride offer',
          type: 'PERCENT_OFF',
          value: 20,
          applicableServices: ['BOOKING'],
          validUntil: '2026-08-01T00:00:00Z',
        },
      ],
      isError: false,
      isPending: false,
      refetch: jest.fn(),
    });
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      renderer = ReactTestRenderer.create(<PromotionsSection />);
    });
    const promotion = renderer!.root.findByProps({ accessible: true });

    expect(mockUseHomePromotions).toHaveBeenCalledWith('BOOKING');
    expect(promotion.props.accessibilityRole).toBeUndefined();
    expect(promotion.props.onPress).toBeUndefined();

    await act(async () => renderer!.unmount());
  });

  it('renders sent parcels from passenger history and forwards BE IDs', async () => {
    mockUseSentParcels.mockReturnValue({
      data: {
        pages: [
          {
            items: [
              {
                parcelId: 'parcel-1',
                parcelCode: 'VR-001',
                status: 'IN_TRANSIT',
                originName: 'Hà Nội',
                destinationName: 'Đà Nẵng',
                estimatedArrivalTime: '2026-07-20T00:00:00Z',
                createdAt: '2026-07-14T00:00:00Z',
                tripId: 'trip-1',
              },
            ],
          },
        ],
      },
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
    });
    const onParcelPress = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <RecentParcelsSection onParcelPress={onParcelPress} />,
      );
    });
    await act(async () => {
      const parcelCard = renderer!.root.findAll(
        node =>
          node.props.accessibilityRole === 'button' &&
          typeof node.props.onPress === 'function',
      )[0];
      parcelCard.props.onPress();
    });

    expect(mockUseSentParcels).toHaveBeenCalledWith({
      pageSize: 5,
    });
    expect(onParcelPress).toHaveBeenCalledWith('parcel-1', 'trip-1');

    const latestFlashListCall =
      mockFlashListProps.mock.calls[mockFlashListProps.mock.calls.length - 1];
    const flashListProps = latestFlashListCall[0] as {
      contentContainerStyle?: { paddingRight?: number };
      ItemSeparatorComponent?: React.ComponentType;
    };
    expect(flashListProps.contentContainerStyle?.paddingRight).toBe(16);
    expect(flashListProps.ItemSeparatorComponent).toBeDefined();

    let separator: ReactTestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      separator = ReactTestRenderer.create(
        React.createElement(flashListProps.ItemSeparatorComponent!),
      );
    });
    expect(separator!.toJSON()).toMatchObject({
      props: { style: { width: 16 } },
    });
    await act(async () => separator!.unmount());

    await act(async () => renderer!.unmount());
  });
});
