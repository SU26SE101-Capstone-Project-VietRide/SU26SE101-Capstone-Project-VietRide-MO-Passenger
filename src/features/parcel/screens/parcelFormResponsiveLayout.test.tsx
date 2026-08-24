import React from 'react';
import { StyleSheet, Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockGoBack = jest.fn();
const mockAppeal = jest.fn();
let mockClaims: Array<Record<string, unknown>> = [];
let mockClaimsIsError = false;
let mockTraceIsError = false;
let mockTracePage: Record<string, unknown> = { availableActions: [] };
const mockTheme = {
  isDark: false,
  colors: new Proxy<Record<string, string>>({}, {
    get: () => '#007d78',
  }),
  components: { card: {} },
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({
    params: { parcelId: '11111111-1111-4111-8111-111111111111' },
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
    SafeAreaView: ({ children, ...props }: { children?: never; [key: string]: unknown }) => (
      ReactModule.createElement(NativeView, props, children)
    ),
  };
});

jest.mock('phosphor-react-native', () => ({
  ArrowLeft: () => null,
  FileText: () => null,
  ShieldCheck: () => null,
  ShieldWarning: () => null,
}));

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@shared/hooks', () => ({
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) => factory(mockTheme),
}));

jest.mock('@shared/components', () => {
  const ReactModule = require('react');
  const {
    ScrollView: NativeScrollView,
    TextInput: NativeTextInput,
  } = require('react-native');
  return {
    AppKeyboardAwareScrollView: (
      { children, ...props }: { children?: never; [key: string]: unknown },
    ) => ReactModule.createElement(
      NativeScrollView,
      { ...props, testID: 'app-keyboard-aware-scroll-view' },
      children,
    ),
    Input: (props: Record<string, unknown>) => (
      ReactModule.createElement(NativeTextInput, props)
    ),
  };
});

jest.mock('../hooks/useParcelReliabilityQueries', () => ({
  useParcelTrace: () => ({
    data: { pages: [mockTracePage] },
    isLoading: false,
    isError: mockTraceIsError,
    isRefetching: false,
    refetch: jest.fn(),
  }),
  useParcelClaims: () => ({
    data: mockClaims,
    isLoading: false,
    isError: mockClaimsIsError,
    isRefetching: false,
    refetch: jest.fn(),
  }),
  useSubmitParcelClaim: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useAppealParcelClaim: () => ({
    isPending: false,
    mutateAsync: mockAppeal,
  }),
  useReportParcelIncident: () => ({ isPending: false, mutateAsync: jest.fn() }),
}));

import { ParcelClaimScreen } from './ParcelClaimScreen';
import { ReportParcelIncidentScreen } from './ReportParcelIncidentScreen';

const expectKeyboardAwareResponsiveLayout = (
  renderer: ReactTestRenderer.ReactTestRenderer,
  title: string,
): void => {
  const scrollView = renderer.root.findByProps({
    testID: 'app-keyboard-aware-scroll-view',
  });
  expect(scrollView.props.keyboardShouldPersistTaps).toBe('handled');

  const titleNode = renderer.root.findAllByType(Text).find(
    (node) => node.props.children === title,
  );
  expect(titleNode).toBeDefined();
  expect(StyleSheet.flatten(titleNode!.props.style)).toMatchObject({
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
  });

  const backButton = renderer.root.findByProps({ accessibilityLabel: 'common.back' });
  expect(StyleSheet.flatten(backButton.props.style)).toMatchObject({
    width: 44,
    height: 44,
    flexShrink: 0,
  });
};

describe('Parcel reliability form responsive layout', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  afterEach(() => {
    if (renderer) act(() => renderer?.unmount());
    renderer = undefined;
    mockClaims = [];
    mockClaimsIsError = false;
    mockTraceIsError = false;
    mockTracePage = { availableActions: [] };
    jest.clearAllMocks();
  });

  it('keeps the claim content keyboard-scrollable with a wrapping header', () => {
    act(() => {
      renderer = ReactTestRenderer.create(<ParcelClaimScreen />);
    });

    expectKeyboardAwareResponsiveLayout(renderer!, 'parcel.claim.title');
  });

  it('keeps stale claim data visible when a background refetch fails', () => {
    mockTracePage = { availableActions: ['SUBMIT_CLAIM'] };
    mockTraceIsError = true;
    mockClaimsIsError = true;

    act(() => {
      renderer = ReactTestRenderer.create(<ParcelClaimScreen />);
    });

    expectKeyboardAwareResponsiveLayout(renderer!, 'parcel.claim.title');
    expect(renderer!.root.findAllByType(Text).some(
      (node) => node.props.children === 'parcel.claim.submit',
    )).toBe(true);
  });

  it('blocks an appeal that exceeds the deliberate Passenger input cap', async () => {
    mockClaims = [{
      appealReason: null,
      appealedAt: null,
      appealedByUserId: null,
      availableActions: ['APPEAL'],
      beneficiaryUserId: '22222222-2222-4222-8222-222222222222',
      cargoAwardVnd: 0,
      claimId: '33333333-3333-4333-8333-333333333333',
      compensationRatePercent: 0,
      decidedAt: null,
      decidedBy: null,
      decisionDeadline: null,
      decisionReason: null,
      declaredValueVnd: null,
      evidence: [],
      freightRefundVnd: 0,
      incidentId: '44444444-4444-4444-8444-444444444444',
      incidentSummary: null,
      paidAt: null,
      parcelId: '11111111-1111-4111-8111-111111111111',
      parcelSummary: null,
      payoutDeadline: null,
      payoutReferenceId: null,
      policyCapVnd: 0,
      policySnapshot: null,
      policyVersion: 1,
      provenDirectLossVnd: null,
      status: 'REJECTED',
      totalAwardVnd: 0,
    }];

    await act(async () => {
      renderer = ReactTestRenderer.create(<ParcelClaimScreen />);
    });

    const appealInput = renderer!.root.findByProps({
      label: 'parcel.claim.appealReasonLabel',
    });
    await act(async () => {
      appealInput.props.onChangeText('x'.repeat(2_001));
    });

    const submit = renderer!.root.findByProps({
      testID: 'parcel-claim-appeal-submit',
    });
    expect(submit.props.disabled).toBe(true);

    await act(async () => {
      submit.props.onPress();
      await Promise.resolve();
    });
    expect(mockAppeal).not.toHaveBeenCalled();
  });

  it('keeps the incident submit action keyboard-scrollable with a wrapping header', () => {
    act(() => {
      renderer = ReactTestRenderer.create(<ReportParcelIncidentScreen />);
    });

    expectKeyboardAwareResponsiveLayout(renderer!, 'parcel.incident.title');
    const submitText = renderer!.root.findAllByType(Text).find(
      (node) => node.props.children === 'parcel.incident.submit',
    );
    expect(StyleSheet.flatten(submitText!.props.style)).toMatchObject({
      minWidth: 0,
      flexShrink: 1,
      textAlign: 'center',
    });

    const incidentChip = renderer!.root.findAll((node) => (
      typeof node.props.testID === 'string'
      && node.props.testID.startsWith('parcel-incident-type-')
    ))[0];
    expect(StyleSheet.flatten(incidentChip.props.style)).toMatchObject({
      maxWidth: '100%',
      minWidth: 0,
      minHeight: 44,
      alignItems: 'center',
    });
    expect(StyleSheet.flatten(incidentChip.findByType(Text).props.style)).toMatchObject({
      minWidth: 0,
      flexShrink: 1,
      textAlign: 'center',
    });
  });
});
