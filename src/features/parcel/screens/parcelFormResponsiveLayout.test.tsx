import React from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockGoBack = jest.fn();
const mockAppeal = jest.fn();
const mockReportIncident = jest.fn(async () => undefined);
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
    Text: NativeText,
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
    StatusChip: ({ label, ...props }: { label: string; [key: string]: unknown }) => (
      ReactModule.createElement(NativeText, { ...props, testID: 'status-chip' }, label)
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
  useReportParcelIncident: () => ({
    isPending: false,
    mutateAsync: mockReportIncident,
  }),
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

  it('does not present zero awards before the operator records a decision', () => {
    mockTracePage = {
      availableActions: [],
      claimSummary: { status: 'SUBMITTED' },
    };
    mockClaims = [{
      availableActions: [],
      decidedAt: null,
      decisionDeadline: null,
      evidence: [],
      paidAt: null,
      payoutDeadline: null,
      policySnapshot: null,
      status: 'SUBMITTED',
    }];

    act(() => {
      renderer = ReactTestRenderer.create(<ParcelClaimScreen />);
    });

    const renderedKeys = new Set(
      renderer!.root.findAllByType(Text).map(node => node.props.children),
    );
    expect(renderedKeys).toContain('parcel.claim.reviewTitle');
    expect(renderedKeys).toContain('parcel.claim.reviewDescription');
    expect(renderedKeys).not.toContain('parcel.claim.cargoAward');
    expect(renderedKeys).not.toContain('parcel.claim.freightRefund');
    expect(renderedKeys).not.toContain('parcel.claim.totalAward');
  });

  it('does not expose upload or manual-reference UI for ADD_EVIDENCE', () => {
    mockTracePage = {
      availableActions: ['ADD_EVIDENCE'],
      claimSummary: { status: 'SUBMITTED' },
    };
    mockClaims = [{
      availableActions: ['ADD_EVIDENCE'],
      decidedAt: null,
      decisionDeadline: null,
      evidence: [],
      paidAt: null,
      payoutDeadline: null,
      policySnapshot: null,
      status: 'SUBMITTED',
    }];

    act(() => {
      renderer = ReactTestRenderer.create(<ParcelClaimScreen />);
    });

    const buttons = renderer!.root.findAll(
      node => node.props.accessibilityRole === 'button',
    );
    expect(new Set(buttons.map(node => node.props.accessibilityLabel))).toEqual(
      new Set(['common.back']),
    );
    expect(renderer!.root.findAllByType(TextInput)).toHaveLength(0);
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

  it('renders the BE-owned appeal lifecycle separately from the original claim', () => {
    mockTracePage = {
      availableActions: [],
      claimSummary: { status: 'PAID' },
    };
    mockClaims = [{
      appeal: {
        appealId: '55555555-5555-4555-8555-555555555555',
        claimId: '33333333-3333-4333-8333-333333333333',
        originalClaimStatus: 'PAID',
        originalTotalAwardVnd: 1_600_000,
        status: 'FUNDING_PENDING',
        reason: 'The invoice was corrected.',
        submittedByUserId: '22222222-2222-4222-8222-222222222222',
        submittedAt: '2026-08-30T08:00:00Z',
        revisedProvenDirectLossVnd: 2_500_000,
        revisedCargoAwardVnd: 2_000_000,
        revisedFreightRefundVnd: 100_000,
        revisedTotalAwardVnd: 2_100_000,
        supplementaryAwardVnd: 500_000,
        decisionReason: 'The additional evidence was accepted.',
        decidedByUserId: null,
        decidedAt: '2026-08-30T09:00:00Z',
        payoutReferenceId: null,
        paidAt: null,
        availableActions: [],
      },
      availableActions: [],
      cargoAwardVnd: 1_500_000,
      decidedAt: '2026-08-29T08:00:00Z',
      decisionDeadline: null,
      evidence: [],
      freightRefundVnd: 100_000,
      paidAt: '2026-08-29T09:00:00Z',
      payoutDeadline: null,
      policySnapshot: null,
      status: 'PAID',
      totalAwardVnd: 1_600_000,
    }];

    act(() => {
      renderer = ReactTestRenderer.create(<ParcelClaimScreen />);
    });

    expect(renderer!.root.findByProps({
      testID: 'parcel-claim-appeal-card',
    })).toBeDefined();
    expect(renderer!.root.findByProps({ testID: 'status-chip' }).props.children).toBe(
      'parcel.claim.appealStatuses.FUNDING_PENDING',
    );
    const renderedKeys = new Set(
      renderer!.root.findAllByType(Text).map(node => node.props.children),
    );
    expect(renderedKeys).toContain('parcel.claim.appealCaseTitle');
    expect(renderedKeys).toContain('parcel.claim.appealRevisedTotal');
    expect(renderedKeys).toContain('parcel.claim.appealSupplementaryAward');
    expect(renderedKeys).toContain('parcel.claim.appealAdditionalPayoutPending');
    expect(renderer!.root.findAllByType(TextInput)).toHaveLength(0);
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
  it('shows only passenger-observable issues and keeps the BE payload intact', async () => {
    await act(async () => {
      renderer = ReactTestRenderer.create(<ReportParcelIncidentScreen />);
    });

    const chipIds = Array.from(new Set(
      renderer!.root.findAll((node) => (
        typeof node.props.testID === 'string'
        && node.props.testID.startsWith('parcel-incident-type-')
      )).map(node => node.props.testID as string),
    )).sort();
    expect(chipIds).toEqual([
      'parcel-incident-type-DAMAGED',
      'parcel-incident-type-DELIVERY_NOT_RECEIVED',
      'parcel-incident-type-PARTIAL_LOSS',
    ]);

    const damagedChip = renderer!.root.findAllByProps({
      testID: 'parcel-incident-type-DAMAGED',
    }).find(node => typeof node.props.onPress === 'function');
    const descriptionInput = renderer!.root.findByProps({
      label: 'parcel.incident.descriptionLabel',
    });

    await act(async () => {
      damagedChip?.props.onPress();
      descriptionInput.props.onChangeText('The parcel box is torn.');
    });

    const submit = renderer!.root.findByProps({
      testID: 'parcel-incident-submit',
    });
    expect(submit.props.disabled).toBe(false);

    await act(async () => {
      submit.props.onPress();
      await Promise.resolve();
    });

    expect(mockReportIncident).toHaveBeenCalledWith({
      parcelId: '11111111-1111-4111-8111-111111111111',
      incidentType: 'DAMAGED',
      description: 'The parcel box is torn.',
      evidenceUrls: [],
    });
  });
});
