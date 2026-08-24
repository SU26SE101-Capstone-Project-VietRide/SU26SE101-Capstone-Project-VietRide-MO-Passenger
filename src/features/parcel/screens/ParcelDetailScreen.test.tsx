import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import type { ParcelDetail } from '../types';

const mockNavigation = {
  dispatch: jest.fn(),
  goBack: jest.fn(),
  navigate: jest.fn(),
  setParams: jest.fn(),
};
const mockInvalidateQueries = jest.fn(async () => undefined);
const mockRefetch = jest.fn(async () => undefined);
const mockUseParcelDetail = jest.fn();
const mockScannableCodeCard = jest.fn(
  ({ code, title }: { code: string; title: string }) => (
    <View accessibilityLabel={`${title}. ${code}`}>
      <Text>{code}</Text>
    </View>
  ),
);

const mockTheme = {
  colors: {
    background: '#F7FAF9',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F6F5',
    primary: '#007D78',
    primaryFaded: '#DDF3F1',
    textPrimary: '#10201F',
    textSecondary: '#435A57',
    textTertiary: '#70817F',
    textDisabled: '#A9B5B3',
    textInverse: '#FFFFFF',
    divider: '#DDE5E3',
    border: '#C8D4D2',
    error: '#B3261E',
    errorLight: '#FCE8E6',
    warning: '#A15C00',
    warningLight: '#FFF3D6',
    success: '#007D56',
    successLight: '#DDF5EA',
  },
  effects: {
    isLiquid: false,
    contentSurfaceElevated: '#FFFFFF',
    contentSurfaceSoft: '#F1F6F5',
    contentBorder: '#DDE5E3',
    contentBorderStrong: '#C8D4D2',
    cardShadow: {},
  },
  components: {
    card: {},
    elevatedCard: {},
    headerButton: { minWidth: 44, minHeight: 44 },
    primaryButton: {},
    secondaryButton: {},
  },
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  usePreventRemove: () => undefined,
  useRoute: () => ({
    params: {
      parcelId: '11111111-1111-4111-8111-111111111111',
      fromHistory: true,
    },
  }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

jest.mock('@features/profile/api/passengerHistoryApi', () => ({
  passengerHistoryKeys: {
    user: (userId: string) => ['passenger-history', userId],
  },
}));

jest.mock('@features/profile/api/walletApi', () => ({
  walletKeys: { user: (userId: string) => ['wallet', userId] },
}));

jest.mock('../api/parcelApi', () => ({
  parcelKeys: {
    detail: (userId: string, parcelId: string) => ['parcel', userId, parcelId],
  },
}));

jest.mock('react-i18next', () => ({
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactRuntime = require('react');
  const { View: NativeView } = require('react-native');
  return {
    SafeAreaView: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      ReactRuntime.createElement(NativeView, props, children),
  };
});

jest.mock('@shopify/flash-list', () => ({
  FlashList: () => null,
}));

jest.mock('expo-image', () => ({
  Image: () => null,
}));

jest.mock('phosphor-react-native', () => {
  const MockIcon = () => null;
  return {
    ArrowLeft: MockIcon,
    CheckCircle: MockIcon,
    Clock: MockIcon,
    CreditCard: MockIcon,
    MagnifyingGlass: MockIcon,
    WarningCircle: MockIcon,
  };
});

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@shared/hooks', () => ({
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) =>
    factory(mockTheme),
}));

jest.mock('@shared/motion', () => ({
  useMotion: () => ({ reduceMotion: true }),
}));

jest.mock('@shared/components', () => {
  const ReactRuntime = require('react');
  const { Text: NativeText } = require('react-native');
  return {
    ScannableCodeCard: (props: { code: string; title: string }) =>
      mockScannableCodeCard(props),
    StatusChip: ({ label }: { label: string }) =>
      ReactRuntime.createElement(NativeText, null, label),
  };
});

jest.mock('@features/auth/store/useAuthStore', () => ({
  useAuthStore: (selector: (state: { user: { id: string } }) => unknown) =>
    selector({ user: { id: 'sender-user' } }),
}));

jest.mock('@features/profile/hooks/useWallet', () => ({
  useWalletBalance: () => ({ data: { balance: 1_000_000 } }),
}));

jest.mock('@shared/payments', () => ({
  assertVnPaySdkAvailable: jest.fn(),
  getPendingVnPaySession: jest.fn(() => null),
  openVnPayPayment: jest.fn(async () => undefined),
  VnPayPaymentOpenCoordinator: class {
    isRunning = false;
    reopen = jest.fn(async () => undefined);
  },
}));

jest.mock('../hooks/useParcelQueries', () => ({
  useParcelDetail: () => mockUseParcelDetail(),
  useStartParcelDepositPayment: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
    retryRetainedAsync: jest.fn(),
  }),
  useStartParcelFinalPayment: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
    retryRetainedAsync: jest.fn(),
  }),
}));

jest.mock('../hooks/useParcelPaymentReturn', () => ({
  useParcelPaymentReturn: () => ({
    checkNow: jest.fn(async () => undefined),
    phase: 'idle',
  }),
}));

jest.mock('../components', () => ({
  ErrorView: () => null,
  ParcelPaymentMethodSelector: () => null,
}));

import { ParcelDetailScreen } from './ParcelDetailScreen';

const PARCEL_ID = '11111111-1111-4111-8111-111111111111';
const PARCEL_CODE = 'PCL-HEADER-001';

const createParcel = (status: string): ParcelDetail =>
  ({
    parcelId: PARCEL_ID,
    parcelCode: PARCEL_CODE,
    status,
    senderUserId: 'sender-user',
    recipientUserId: null,
    recipientName: 'Passenger',
    recipientPhone: '0900000000',
    operatorId: '22222222-2222-4222-8222-222222222222',
    tripId: '33333333-3333-4333-8333-333333333333',
    dropoffStopId: null,
    description: null,
    quantity: 1,
    declaredValueVnd: null,
    photoUrl: null,
    checkInPhotoUrls: null,
    deliveryPhotoUrls: null,
    sizeCategory: 'SMALL',
    estimatedWeightKg: 1,
    actualWeightKg: null,
    deliveryMethod: 'TERMINAL_PICKUP',
    actualLengthCm: null,
    actualWidthCm: null,
    actualHeightCm: null,
    estimatedLengthCm: 10,
    estimatedWidthCm: 10,
    estimatedHeightCm: 10,
    actualSizeCategory: null,
    estimatedTotalPriceVnd: 100_000,
    finalTotalPriceVnd: 100_000,
    discountAmountVnd: 0,
    depositRequiredVnd: 20_000,
    depositPaidVnd: 20_000,
    balanceRequiredVnd: 0,
    balancePaidVnd: 0,
    refundDueVnd: 0,
    finalPaymentDeadline: null,
    originStationName: 'Ha Noi',
    destinationStationName: 'Da Nang',
    compensationPolicySnapshot: null,
    reliabilitySummary: null,
    availableActions: [],
  } as unknown as ParcelDetail);

const queryFor = (data: ParcelDetail) => ({
  data,
  error: null,
  isError: false,
  isLoading: false,
  refetch: mockRefetch,
});

const getTextContent = (
  renderer: ReactTestRenderer.ReactTestRenderer,
): string[] =>
  renderer.root
    .findAllByType(Text)
    .flatMap(node =>
      typeof node.props.children === 'string' ? [node.props.children] : [],
    );

const countDashedDividers = (
  renderer: ReactTestRenderer.ReactTestRenderer,
): number =>
  renderer.root.findAll(
    node =>
      node.type === View &&
      StyleSheet.flatten(node.props.style)?.borderStyle === 'dashed',
  ).length;

describe('ParcelDetailScreen identity hierarchy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the operational parcel QR and shows parcelCode as page metadata', async () => {
    mockUseParcelDetail.mockReturnValue(queryFor(createParcel('PENDING')));
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<ParcelDetailScreen />);
    });

    const metadata = renderer!.root
      .findAllByType(Text)
      .find(node => node.props.ellipsizeMode === 'middle');
    expect(metadata?.props.children).toBe(PARCEL_CODE);
    const backButton = renderer!.root.find(
      node => node.props.accessibilityLabel === 'common.back',
    );
    expect(StyleSheet.flatten(backButton.props.style)).toMatchObject({
      width: 44,
      height: 44,
      borderRadius: 22,
    });
    expect(mockScannableCodeCard).toHaveBeenCalledWith(
      expect.objectContaining({
        code: PARCEL_CODE,
        title: 'parcel.detail.dropoffCode',
      }),
    );
    expect(countDashedDividers(renderer!)).toBe(1);

    await act(async () => renderer!.unmount());
  });

  it('uses a compact status header without QR, divider, UUID, or duplicate code', async () => {
    mockUseParcelDetail.mockReturnValue(queryFor(createParcel('IN_TRANSIT')));
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<ParcelDetailScreen />);
    });

    const text = getTextContent(renderer!);
    expect(mockScannableCodeCard).not.toHaveBeenCalled();
    expect(text.filter(value => value === PARCEL_CODE)).toHaveLength(1);
    expect(text).toContain('parcel.detail.code.unavailableStatus');
    expect(text).not.toContain(PARCEL_ID);
    expect(countDashedDividers(renderer!)).toBe(0);

    await act(async () => renderer!.unmount());
  });
});
