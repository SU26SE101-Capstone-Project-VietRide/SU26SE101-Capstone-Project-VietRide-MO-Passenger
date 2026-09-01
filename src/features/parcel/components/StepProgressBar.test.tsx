import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

const translations: Record<string, string> = {
  'common.back': 'Quay lại',
  'parcel.progress.stationDate': 'Bến & ngày',
  'parcel.progress.item': 'Kiện hàng',
  'parcel.progress.delivery': 'Phương án',
  'parcel.progress.confirm': 'Xác nhận',
  'parcel.route.from': 'TỪ',
  'parcel.route.to': 'ĐẾN',
  'parcel.actions.changeRoute': 'Đổi khu vực',
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
  MapPin: () => null,
  PencilSimple: () => null,
}));

import { StepProgressBar } from './StepProgressBar';

const VIETNAMESE_LABELS = ['Bến & ngày', 'Kiện hàng', 'Phương án', 'Xác nhận'];

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

  it('renders minimalist route summary on header when provided and handles segmented press callbacks', () => {
    const onEditFrom = jest.fn();
    const onEditTo = jest.fn();
    const onOpenEditSheet = jest.fn();

    act(() => {
      renderer = ReactTestRenderer.create(
        <StepProgressBar
          step={1}
          onCancel={jest.fn()}
          title="Tạo đơn gửi hàng"
          routeSummary={{
            from: 'TP. Hồ Chí Minh',
            to: 'Vũng Tàu',
            onEditFrom,
            onEditTo,
            onOpenEditSheet,
          }}
        />,
      );
    });

    const fromText = renderer!.root.findByProps({
      children: 'TP. Hồ Chí Minh',
    });
    expect(fromText).toBeDefined();

    const fromSegment = renderer!.root.findByProps({
      accessibilityLabel: 'TỪ: TP. Hồ Chí Minh',
    });
    act(() => {
      fromSegment.props.onPress();
    });
    expect(onEditFrom).toHaveBeenCalledTimes(1);

    const toSegment = renderer!.root.findByProps({
      accessibilityLabel: 'ĐẾN: Vũng Tàu',
    });
    act(() => {
      toSegment.props.onPress();
    });
    expect(onEditTo).toHaveBeenCalledTimes(1);

    const editButton = renderer!.root.findByProps({
      accessibilityLabel: 'Đổi khu vực',
    });
    act(() => {
      editButton.props.onPress();
    });
    expect(onOpenEditSheet).toHaveBeenCalledTimes(1);
  });
});
