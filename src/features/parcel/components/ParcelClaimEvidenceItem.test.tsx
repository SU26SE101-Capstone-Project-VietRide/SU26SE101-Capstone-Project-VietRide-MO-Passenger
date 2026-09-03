import React from 'react';
import { Linking, Modal, Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockTheme = {
  colors: new Proxy<Record<string, string>>(
    {},
    {
      get: () => '#007A76',
    },
  ),
  effects: {
    isLiquid: true,
    contentBorder: 'rgba(0, 106, 103, 0.18)',
    contentSurfaceSoft: '#EEF7F7',
  },
};

jest.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: jest.fn() },
  useTranslation: () => ({
    t: (key: string, values?: { type?: string }) =>
      values?.type ? `${key}:${values.type}` : key,
  }),
}));

jest.mock('phosphor-react-native', () => {
  const MockIcon = () => null;
  return {
    ArrowSquareOut: MockIcon,
    FileText: MockIcon,
    ImageSquare: MockIcon,
    X: MockIcon,
  };
});

jest.mock('expo-image', () => {
  const ReactModule = require('react');
  const { View: NativeView } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) =>
      ReactModule.createElement(NativeView, props),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const { View: NativeView } = require('react-native');
  return {
    SafeAreaView: ({
      children,
      ...props
    }: {
      children?: never;
      [key: string]: unknown;
    }) => ReactModule.createElement(NativeView, props, children),
  };
});

jest.mock('@shared/components', () => {
  const ReactModule = require('react');
  const { Text: NativeText } = require('react-native');
  return {
    StatusChip: ({
      label,
      ...props
    }: {
      label: string;
      [key: string]: unknown;
    }) =>
      ReactModule.createElement(
        NativeText,
        { ...props, testID: 'status-chip' },
        label,
      ),
  };
});

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@shared/hooks', () => ({
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) =>
    factory(mockTheme),
}));

import { ParcelClaimEvidenceItem } from './ParcelClaimEvidenceItem';

const inheritedEvidence = {
  evidenceId: '11111111-1111-4111-8111-111111111111',
  evidenceType: 'INCIDENT_PHOTO',
  reference: 'https://storage.example/incident.jpg',
  note: 'Inherited from the incident report.',
  uploadedByUserId: '22222222-2222-4222-8222-222222222222',
  createdAt: '2026-09-04T10:00:00+07:00',
};

const textValues = (renderer: ReactTestRenderer.ReactTestRenderer): string[] =>
  renderer.root
    .findAllByType(Text)
    .flatMap(node =>
      typeof node.props.children === 'string' ? [node.props.children] : [],
    );

describe('ParcelClaimEvidenceItem', () => {
  afterEach(() => jest.restoreAllMocks());

  it('renders inherited incident evidence with localized copy and accepted states', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <ParcelClaimEvidenceItem
          evidence={inheritedEvidence}
          acceptedForClaim
          acceptedForAppeal
        />,
      );
    });

    expect(textValues(renderer!)).toEqual(
      expect.arrayContaining([
        'parcel.claim.evidenceTypes.INCIDENT_PHOTO',
        'parcel.claim.inheritedIncidentEvidenceNote',
        'parcel.claim.acceptedForClaim',
        'parcel.claim.acceptedForAppeal',
        'parcel.claim.viewEvidencePhoto',
      ]),
    );
    expect(
      renderer!.root.findByProps({
        testID: `parcel-claim-evidence-image-${inheritedEvidence.evidenceId}`,
      }),
    ).toBeDefined();

    act(() => renderer!.unmount());
  });

  it('opens image evidence in-app and falls back to the HTTPS document opener on load failure', async () => {
    const canOpenSpy = jest
      .spyOn(Linking, 'canOpenURL')
      .mockResolvedValue(true);
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <ParcelClaimEvidenceItem
          evidence={inheritedEvidence}
          acceptedForClaim={false}
          acceptedForAppeal={false}
        />,
      );
    });

    const action = renderer!.root.findByProps({
      testID: `parcel-claim-evidence-open-${inheritedEvidence.evidenceId}`,
    });
    act(() => action.props.onPress());
    expect(
      renderer!.root.findAllByType(Modal).some(modal => modal.props.visible),
    ).toBe(true);
    expect(openSpy).not.toHaveBeenCalled();

    const thumbnail = renderer!.root.findByProps({
      testID: `parcel-claim-evidence-image-${inheritedEvidence.evidenceId}`,
    });
    act(() => thumbnail.props.onError());

    await act(async () => {
      renderer!.root
        .findByProps({
          testID: `parcel-claim-evidence-open-${inheritedEvidence.evidenceId}`,
        })
        .props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(canOpenSpy).toHaveBeenCalledWith(inheritedEvidence.reference);
    expect(openSpy).toHaveBeenCalledWith(inheritedEvidence.reference);

    act(() => renderer!.unmount());
  });

  it('does not expose an opener for unsafe references', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <ParcelClaimEvidenceItem
          evidence={{
            ...inheritedEvidence,
            reference: 'intent://open-document',
          }}
          acceptedForClaim={false}
          acceptedForAppeal={false}
        />,
      );
    });

    expect(textValues(renderer!)).toContain(
      'parcel.claim.evidenceReferenceUnavailable',
    );
    expect(
      renderer!.root.findByProps({
        testID: `parcel-claim-evidence-preview-${inheritedEvidence.evidenceId}`,
      }).props.disabled,
    ).toBe(true);
    expect(
      renderer!.root.findAllByProps({
        testID: `parcel-claim-evidence-open-${inheritedEvidence.evidenceId}`,
      }),
    ).toHaveLength(0);

    act(() => renderer!.unmount());
  });
});
