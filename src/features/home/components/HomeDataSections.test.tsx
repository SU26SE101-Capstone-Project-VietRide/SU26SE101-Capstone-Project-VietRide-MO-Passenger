import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { PromotionsSection } from './PromotionsSection';
import { RecentParcelsSection } from './RecentParcelsSection';

const mockUseHomePromotions = jest.fn();
const mockUseReceivedParcels = jest.fn();
let mockIsGuest = false;

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
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) => factory(mockTheme),
}));

jest.mock('@features/auth/store/useAuthStore', () => ({
  useAuthStore: (selector: (state: { isGuest: boolean }) => unknown) => selector({
    isGuest: mockIsGuest,
  }),
}));

jest.mock('../hooks/useHomePromotions', () => ({
  useHomePromotions: (service: string) => mockUseHomePromotions(service),
}));

jest.mock('@features/parcel/hooks/useParcelQueries', () => ({
  useReceivedParcels: (page: number, pageSize: number) => (
    mockUseReceivedParcels(page, pageSize)
  ),
}));

jest.mock('phosphor-react-native', () => ({
  ArrowRight: () => null,
  Package: () => null,
  Tag: () => null,
  Truck: () => null,
}));

jest.mock('@shopify/flash-list', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const ReactNative = jest.requireActual<typeof import('react-native')>('react-native');

  interface MockFlashListProps {
    data?: readonly unknown[];
    renderItem: (info: { item: unknown; index: number }) => React.ReactElement | null;
  }

  return {
    FlashList: ({ data = [], renderItem }: MockFlashListProps) => ReactModule.createElement(
      ReactNative.View,
      null,
      ...data.map((item, index) => ReactModule.createElement(
        ReactNative.View,
        { key: String(index) },
        renderItem({ item, index }),
      )),
    ),
  };
});

describe('Home data sections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsGuest = false;
  });

  it('renders promotions from the booking API hook and emits primitive identifiers', async () => {
    mockUseHomePromotions.mockReturnValue({
      data: [{
        voucherId: 'voucher-1',
        code: 'RIDE20',
        name: 'Ride offer',
        type: 'PERCENT_OFF',
        value: 20,
        applicableServices: ['BOOKING'],
        validUntil: '2026-08-01T00:00:00Z',
      }],
      isError: false,
      isPending: false,
      refetch: jest.fn(),
    });
    const onPromotionPress = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <PromotionsSection onPromotionPress={onPromotionPress} />,
      );
    });
    await act(async () => {
      renderer!.root.findByProps({
        accessibilityLabel: 'Ride offer, code RIDE20',
      }).props.onPress();
    });

    expect(mockUseHomePromotions).toHaveBeenCalledWith('BOOKING');
    expect(onPromotionPress).toHaveBeenCalledWith('voucher-1', 'RIDE20');

    await act(async () => renderer!.unmount());
  });

  it('renders received parcels from the existing parcel hook and forwards BE IDs', async () => {
    mockUseReceivedParcels.mockReturnValue({
      data: {
        items: [{
          parcelId: 'parcel-1',
          parcelCode: 'VR-001',
          status: 'IN_TRANSIT',
          originStation: { id: 'origin-1', name: 'Hà Nội' },
          destinationStation: { id: 'destination-1', name: 'Đà Nẵng' },
          eta: '2026-07-20T00:00:00Z',
          senderUserId: 'sender-1',
          recipientName: 'Passenger',
          sizeCategory: 'SMALL',
          createdAt: '2026-07-14T00:00:00Z',
          operatorId: 'operator-1',
          tripId: 'trip-1',
        }],
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
      renderer!.root.findByProps({
        accessibilityLabel: 'Parcel VR-001, In Transit',
      }).props.onPress();
    });

    expect(mockUseReceivedParcels).toHaveBeenCalledWith(1, 5);
    expect(onParcelPress).toHaveBeenCalledWith('parcel-1', 'trip-1');

    await act(async () => renderer!.unmount());
  });

  it('shows a sign-in-required state for guests instead of an empty parcel state', async () => {
    mockIsGuest = true;
    mockUseReceivedParcels.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
    });
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    const onViewAll = jest.fn();

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <RecentParcelsSection onViewAll={onViewAll} />,
      );
    });

    expect(renderer!.root.findByProps({
      accessibilityLabel: 'Sign in required for recent parcels',
    })).toBeDefined();
    expect(renderer!.root.findAllByType(Text).some(
      (node) => node.props.children === 'No received parcels yet',
    )).toBe(false);
    expect(renderer!.root.findAllByProps({
      accessibilityLabel: 'View all received parcels',
    })).toHaveLength(0);

    await act(async () => renderer!.unmount());
  });
});
