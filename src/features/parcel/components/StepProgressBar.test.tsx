import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

const translations: Record<string, string> = {
  'common.back': 'Quay lại',
  'parcel.progress.origin': 'Bến gửi',
  'parcel.progress.destination': 'Bến nhận',
  'parcel.progress.item': 'Kiện hàng',
  'parcel.progress.payment': 'Thanh toán',
};

const mockTheme = {
  colors: {
    primary: '#007d78',
    primaryDark: '#005f5b',
    primaryFaded: '#e3f5f3',
    surface: '#ffffff',
    surfaceAlt: '#f4f7f7',
    textInverse: '#ffffff',
  },
  effects: {
    isLiquid: false,
    cardShadow: {},
    glassSheen: '#ffffff',
    glassSurfaceSoft: '#f4f7f7',
    glassSurfaceStrong: '#ffffff',
  },
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { label?: string }) =>
      key === 'parcel.progress.stepAccessibility'
        ? params?.label ?? key
        : translations[key] ?? key,
  }),
}));
jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));
jest.mock('@shared/hooks', () => ({
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) =>
    factory(mockTheme),
  useResponsiveLayout: () => ({ isCompact: false }),
}));
jest.mock('phosphor-react-native', () => ({
  ArrowLeft: () => null,
  Check: () => null,
  FunnelSimple: () => null,
}));

import { StepProgressBar } from './StepProgressBar';

const VIETNAMESE_LABELS = ['Bến gửi', 'Bến nhận', 'Kiện hàng', 'Thanh toán'];

describe('StepProgressBar', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  afterEach(() => {
    if (renderer) act(() => renderer?.unmount());
    renderer = undefined;
  });

  it('gives every Vietnamese label an equal responsive segment', () => {
    act(() => {
      renderer = ReactTestRenderer.create(
        <StepProgressBar
          step={1}
          highestStepReached={4}
          onStepPress={jest.fn()}
          onCancel={jest.fn()}
          title="Gửi kiện hàng"
        />,
      );
    });

    for (const label of VIETNAMESE_LABELS) {
      const text = renderer!.root.findByProps({ children: label });
      const textStyle = StyleSheet.flatten(text.props.style);
      const segment = text.parent;

      expect(text.type).toBe(Text);
      expect(text.props.numberOfLines).toBe(2);
      expect(text.props.ellipsizeMode).toBe('tail');
      expect(textStyle.width).toBe('100%');
      expect(textStyle.textAlign).toBe('center');
      expect(StyleSheet.flatten(segment?.props.style)).toMatchObject({
        flex: 1,
        minWidth: 0,
      });
    }
  });

  it('aligns the progress track with the centers of four equal segments', () => {
    act(() => {
      renderer = ReactTestRenderer.create(
        <StepProgressBar
          step={3}
          onCancel={jest.fn()}
          title="Gửi kiện hàng"
        />,
      );
    });

    const alignedTracks = renderer!.root.findAllByType(View).filter(
      (view) => StyleSheet.flatten(view.props.style)?.marginHorizontal === '12.5%',
    );

    expect(alignedTracks).toHaveLength(1);
  });

  it('uses the teal primary token for the active progress fill', () => {
    act(() => {
      renderer = ReactTestRenderer.create(
        <StepProgressBar
          step={3}
          onCancel={jest.fn()}
          title="Gửi kiện hàng"
        />,
      );
    });

    const fill = renderer!.root.findByProps({
      testID: 'parcel-step-progress-fill',
    });

    expect(StyleSheet.flatten(fill.props.style)).toMatchObject({
      backgroundColor: mockTheme.colors.primary,
    });
  });
});
