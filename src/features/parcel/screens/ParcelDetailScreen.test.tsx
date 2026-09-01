import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
const mockReconcileParcelPayment = jest.fn(async () => undefined);
const mockErrorView = jest.fn(({ onRetry }: { onRetry?: () => void }) => (
  <Pressable accessibilityLabel="parcel-detail-error-retry" onPress={onRetry} />
));
let mockIsFocused = true;
let mockIsAppActive = true;
let mockIsOnline = true;
let mockPaymentRedirectUrl: string | undefined;
const mockScannableCodeCard = jest.fn(
  ({ code, title }: { code: string; title: string }) => (
    <View accessibilityLabel={`${title}. ${code}`}>
      <Text>{code}</Text>
    </View>
  ),
);
const mockParcelCompensationDisclosure = jest.fn(
  ({ operatorName }: { operatorName: string | null | undefined }) => (
    <Text testID="parcel-compensation-disclosure">{operatorName}</Text>
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
    warningForeground: '#795900',
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
  useIsFocused: () => mockIsFocused,
  useNavigation: () => mockNavigation,
  usePreventRemove: () => undefined,
  useRoute: () => ({
    params: {
      parcelId: '11111111-1111-4111-8111-111111111111',
      fromHistory: true,
      ...(mockPaymentRedirectUrl
        ? { paymentRedirectUrl: mockPaymentRedirectUrl }
        : {}),
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
  useIsAppActive: () => mockIsAppActive,
  useNetworkStatus: () => mockIsOnline,
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
    VnPayLogo: () => null,
  };
});

jest.mock('@features/auth/store/useAuthStore', () => ({
  useAuthStore: (selector: (state: { user: { id: string } }) => unknown) =>
    selector({ user: { id: 'sender-user' } }),
}));

jest.mock('@features/profile/hooks/useWallet', () => ({
  useLiveWalletBalance: () => ({ data: { balance: 1_000_000 } }),
}));

jest.mock('@shared/payments', () => ({
  assertVnPaySdkAvailable: jest.fn(),
  getPendingVnPaySession: jest.fn(async () => null),
  openVnPayPayment: jest.fn(async () => undefined),
  VnPayPaymentOpenCoordinator: class {
    isRunning = false;
    reopen = jest.fn(async () => undefined);
  },
}));

jest.mock('../hooks/useParcelQueries', () => ({
  useParcelDetail: (...args: unknown[]) => mockUseParcelDetail(...args),
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
    checkNow: mockReconcileParcelPayment,
    phase: 'idle',
  }),
}));

jest.mock('../components', () => ({
  ErrorView: (props: { onRetry?: () => void }) => mockErrorView(props),
  ParcelCompensationDisclosure: (
    props: { operatorName: string | null | undefined },
  ) => mockParcelCompensationDisclosure(props),
  ParcelPaymentMethodSelector: () => null,
}));

import { ParcelDetailScreen } from './ParcelDetailScreen';

const PARCEL_ID = '11111111-1111-4111-8111-111111111111';
const PARCEL_CODE = 'PCL-HEADER-001';

const createParcel = (
  status: string,
  availableActions: ParcelDetail['availableActions'] = [],
): ParcelDetail =>
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
    availableActions,
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
    mockIsFocused = true;
    mockIsAppActive = true;
    mockIsOnline = true;
    mockPaymentRedirectUrl = undefined;
  });

  it.each([
    ['screen is not focused', () => { mockIsFocused = false; }],
    ['app is inactive', () => { mockIsAppActive = false; }],
    ['network is offline', () => { mockIsOnline = false; }],
  ])('disables pending-payment polling when %s', async (_label, disableGate) => {
    mockPaymentRedirectUrl = 'https://sandbox.vnpayment.vn/pay';
    disableGate();
    mockUseParcelDetail.mockReturnValue(queryFor(createParcel('PENDING_PAYMENT')));
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<ParcelDetailScreen />);
    });

    expect(mockUseParcelDetail).toHaveBeenCalledWith(PARCEL_ID, false);
    await act(async () => renderer!.unmount());
  });

  it('does not start fast polling merely because the Parcel status is payable', async () => {
    mockUseParcelDetail.mockReturnValue(queryFor(createParcel('PENDING_PAYMENT')));
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<ParcelDetailScreen />);
    });

    expect(mockUseParcelDetail).toHaveBeenLastCalledWith(PARCEL_ID, false);
    await act(async () => renderer!.unmount());
  });

  it('ends the fast polling window after twenty seconds', async () => {
    jest.useFakeTimers();
    mockPaymentRedirectUrl = 'https://sandbox.vnpayment.vn/pay';
    mockUseParcelDetail.mockReturnValue(queryFor(createParcel('PENDING_PAYMENT')));
    let renderer: ReactTestRenderer.ReactTestRenderer;

    try {
      await act(async () => {
        renderer = ReactTestRenderer.create(<ParcelDetailScreen />);
        await Promise.resolve();
      });
      expect(mockUseParcelDetail).toHaveBeenLastCalledWith(PARCEL_ID, true);

      await act(async () => {
        jest.advanceTimersByTime(20_001);
        await Promise.resolve();
      });

      expect(mockUseParcelDetail).toHaveBeenLastCalledWith(PARCEL_ID, false);
      await act(async () => renderer!.unmount());
    } finally {
      jest.useRealTimers();
    }
  });

  it('retries an initial detail error directly without starting reconciliation', async () => {
    mockUseParcelDetail.mockReturnValue({
      data: undefined,
      error: new Error('detail unavailable'),
      isError: true,
      isLoading: false,
      refetch: mockRefetch,
    });
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<ParcelDetailScreen />);
    });
    const retry = renderer!.root.find(
      node => node.props.accessibilityLabel === 'parcel-detail-error-retry',
    );

    await act(async () => {
      retry.props.onPress();
      await Promise.resolve();
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(mockReconcileParcelPayment).not.toHaveBeenCalled();
    await act(async () => renderer!.unmount());
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

  it('shows the parcel QR while waiting to transfer to the replacement vehicle', async () => {
    mockUseParcelDetail.mockReturnValue(
      queryFor(createParcel('PENDING_TRANSFER_CONFIRM')),
    );
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<ParcelDetailScreen />);
    });

    expect(mockScannableCodeCard).toHaveBeenCalledWith(
      expect.objectContaining({
        code: PARCEL_CODE,
        title: 'parcel.detail.transferCode',
        description: 'parcel.detail.transferCodeHint',
      }),
    );
    expect(getTextContent(renderer!)).toContain(
      'parcel.detail.code.showForTransfer',
    );
    expect(countDashedDividers(renderer!)).toBe(1);

    await act(async () => renderer!.unmount());
  });

  it('moves the BE-gated incident action to one 44dp header quick action', async () => {
    mockUseParcelDetail.mockReturnValue(queryFor(
      createParcel('IN_TRANSIT', ['REPORT_INCIDENT']),
    ));
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<ParcelDetailScreen />);
    });

    const visualActions = renderer!.root
      .findAll(
        node =>
          node.props.accessibilityLabel ===
          'parcel.reliability.reportIncident',
      )
      .filter(
        node =>
          typeof node.type === 'string' &&
          StyleSheet.flatten(node.props.style)?.width === 44,
      );
    expect(visualActions).toHaveLength(1);
    expect(StyleSheet.flatten(visualActions[0].props.style)).toMatchObject({
      width: 44,
      height: 44,
      borderRadius: 22,
    });
    expect(visualActions[0].props.hitSlop).toBe(4);
    const interactiveAction = renderer!.root.find(
      node =>
        node.props.accessibilityLabel ===
          'parcel.reliability.reportIncident' &&
        typeof node.props.onPress === 'function',
    );
    await act(async () => interactiveAction.props.onPress());
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      'ReportParcelIncident',
      { parcelId: PARCEL_ID },
    );
    expect(
      getTextContent(renderer!).filter(
        value => value === 'parcel.reliability.reportIncident',
      ),
    ).toHaveLength(0);

    await act(async () => renderer!.unmount());
  });

  it('shows the parcel QR while in transit', async () => {
    mockUseParcelDetail.mockReturnValue(queryFor(createParcel('IN_TRANSIT')));
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<ParcelDetailScreen />);
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

  it('uses a compact status header without QR, divider, UUID, or duplicate code for recipient confirm', async () => {
    mockUseParcelDetail.mockReturnValue(
      queryFor(createParcel('DELIVERED_PENDING_CONFIRM')),
    );
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<ParcelDetailScreen />);
    });

    const text = getTextContent(renderer!);
    expect(mockScannableCodeCard).not.toHaveBeenCalled();
    expect(text.filter(value => value === PARCEL_CODE)).toHaveLength(1);
    expect(text).toContain('parcel.detail.code.awaitingRecipient');
    expect(text).not.toContain(PARCEL_ID);
    expect(countDashedDividers(renderer!)).toBe(0);

    await act(async () => renderer!.unmount());
  });

  it('keeps operator terms on demand and hides raw Reliability summary copy', async () => {
    const parcel = createParcel('IN_TRANSIT');
    parcel.operator = {
      operatorId: '22222222-2222-4222-8222-222222222222',
      name: 'VietRide Express',
      logoUrl: null,
      contactPhone: null,
    };
    parcel.compensationPolicySnapshot = {
      version: 3,
      compensationRatePercent: 80,
      maxCompensationVnd: 5_000_000,
      noProofFallbackMultiplier: 0.5,
      claimWindowDays: 7,
      searchSlaHours: 24,
      decisionSlaBusinessDays: 3,
      payoutSlaBusinessDays: 5,
    };
    parcel.reliabilitySummary = {
      currentCustody: null,
      activeIncident: {
        incidentId: '44444444-4444-4444-8444-444444444444',
        type: 'DAMAGED',
        status: 'INTERNAL_INCIDENT_STATUS',
        searchDeadline: '2026-08-25T08:00:00.000Z',
        nextUpdateAt: null,
        slaState: 'INTERNAL_SLA',
        operatorProcessBreach: false,
      },
      claim: {
        claimId: '55555555-5555-4555-8555-555555555555',
        status: 'PAID',
        totalAwardVnd: 100_000,
        decisionDeadline: null,
        payoutDeadline: null,
        slaState: null,
      },
      nextUpdateAt: '2026-08-25T08:00:00.000Z',
      availableActions: [],
    };
    mockUseParcelDetail.mockReturnValue(queryFor(parcel));
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<ParcelDetailScreen />);
    });

    expect(mockParcelCompensationDisclosure).toHaveBeenCalledWith(
      expect.objectContaining({
        operatorName: 'VietRide Express',
        policy: parcel.compensationPolicySnapshot,
      }),
    );
    const compensationSection = renderer!.root.findByProps({
      testID: 'parcel-detail-compensation-section',
    });
    expect(StyleSheet.flatten(compensationSection.props.style)).toMatchObject({
      marginBottom: 24,
    });
    const text = getTextContent(renderer!);
    expect(text).not.toContain('INTERNAL_INCIDENT_STATUS');
    expect(text).not.toContain('parcel.detail.reliabilityTitle');
    expect(text).toContain('parcel.reliability.openClaim');

    await act(async () => renderer!.unmount());
  });
});
