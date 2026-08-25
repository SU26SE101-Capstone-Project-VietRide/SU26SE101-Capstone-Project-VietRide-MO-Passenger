import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockTheme = {
  colors: new Proxy<Record<string, string>>({}, {
    get: () => '#007D78',
  }),
  components: { card: {} },
};

jest.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: jest.fn() },
  useTranslation: () => ({
    t: (key: string, values?: { operator?: string }) => (
      values?.operator ? `${key}:${values.operator}` : key
    ),
  }),
}));

jest.mock('phosphor-react-native', () => {
  const MockIcon = () => null;
  return {
    CaretDown: MockIcon,
    ShieldCheck: MockIcon,
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

import { ParcelCompensationDisclosure } from './ParcelCompensationDisclosure';

const policy = {
  version: 3,
  compensationRatePercent: 80,
  maxCompensationVnd: 5_000_000,
  noProofFallbackMultiplier: 0.5,
  claimWindowDays: 7,
  searchSlaHours: 24,
  decisionSlaBusinessDays: 3,
  payoutSlaBusinessDays: 5,
};

const textValues = (renderer: ReactTestRenderer.ReactTestRenderer): string[] => (
  renderer.root.findAllByType(Text).flatMap(node => (
    typeof node.props.children === 'string' ? [node.props.children] : []
  ))
);

describe('ParcelCompensationDisclosure', () => {
  it('attributes terms to the operator and keeps values collapsed by default', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <ParcelCompensationDisclosure
          operatorName="VietRide Express"
          policy={policy}
        />,
      );
    });

    expect(textValues(renderer!)).toContain(
      'parcel.compensation.subtitle:VietRide Express',
    );
    expect(textValues(renderer!)).not.toContain('parcel.compensation.rate');
    expect(textValues(renderer!)).not.toContain('parcel.compensation.cap');

    const toggle = renderer!.root.findByProps({
      testID: 'parcel-compensation-disclosure-toggle',
    });
    expect(toggle.props.accessibilityState).toEqual({ expanded: false });

    act(() => toggle.props.onPress());

    expect(textValues(renderer!)).toContain('parcel.compensation.rate');
    expect(textValues(renderer!)).toContain('parcel.compensation.cap');
    expect(textValues(renderer!)).toContain('parcel.compensation.claimWindow');

    act(() => renderer!.unmount());
  });
});
