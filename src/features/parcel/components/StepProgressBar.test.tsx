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
  'parcel.actions.changeRouteShort': 'Đổi',
  'parcel.route.summaryAccessibilityHint': 'Mở bảng chỉnh tuyến gửi hàng',
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
    t: (
      key: string,
      params?: {
        label?: string;
        from?: string;
        to?: string;
        origin?: string;
        destination?: string;
        defaultValue?: string;
      },
    ) =>
      key === 'parcel.progress.stepAccessibility'
        ? params?.label ?? key
        : key === 'parcel.route.summaryAccessibility'
        ? `Đổi khu vực gửi và nhận. Từ ${params?.from} đến ${params?.to}`
        : key === 'parcel.route.routeFrom'
        ? `Từ ${params?.origin}`
        : key === 'parcel.route.routeTo'
        ? `Đến ${params?.destination}`
        : translations[key] ?? params?.defaultValue ?? key,
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
        <StepProgressBar step={3} onCancel={jest.fn()} title="Gửi kiện hàng" />,
      );
    });

    const alignedTracks = renderer!.root
      .findAllByType(View)
      .filter(
        view =>
          StyleSheet.flatten(view.props.style)?.marginHorizontal === '12.5%',
      );

    expect(alignedTracks).toHaveLength(1);
  });

  it('uses the teal primary token for the active progress fill', () => {
    act(() => {
      renderer = ReactTestRenderer.create(
        <StepProgressBar step={3} onCancel={jest.fn()} title="Gửi kiện hàng" />,
      );
    });

    const fill = renderer!.root.findByProps({
      testID: 'parcel-step-progress-fill',
    });

    expect(StyleSheet.flatten(fill.props.style)).toMatchObject({
      backgroundColor: mockTheme.colors.primary,
    });
  });

  it('renders the route summary as one accessible 44px press target', () => {
    const onPress = jest.fn();

    act(() => {
      renderer = ReactTestRenderer.create(
        <StepProgressBar
          step={1}
          onCancel={jest.fn()}
          title="Tạo đơn gửi hàng"
          routeSummary={{
            from: 'TP. Hồ Chí Minh',
            to: 'Vũng Tàu',
            onPress,
          }}
        />,
      );
    });

    const routeButton = renderer!.root.findByProps({
      testID: 'parcel-header-route-button',
    });
    expect(routeButton.props.accessibilityLabel).toBe(
      'Đổi khu vực gửi và nhận. Từ TP. Hồ Chí Minh đến Vũng Tàu',
    );
    const routeButtonStyle =
      typeof routeButton.props.style === 'function'
        ? routeButton.props.style({ pressed: false })
        : routeButton.props.style;
    expect(StyleSheet.flatten(routeButtonStyle)).toMatchObject({
      minHeight: 44,
      width: '100%',
    });
    const origin = renderer!.root.findByProps({
      testID: 'parcel-header-route-origin',
    });
    const destination = renderer!.root.findByProps({
      testID: 'parcel-header-route-destination',
    });
    const originBadge = renderer!.root.findByProps({
      testID: 'parcel-header-route-origin-badge',
    });
    const destinationBadge = renderer!.root.findByProps({
      testID: 'parcel-header-route-destination-badge',
    });
    expect(origin.props.numberOfLines).toBe(1);
    expect(origin.props.ellipsizeMode).toBe('tail');
    expect(destination.props.numberOfLines).toBe(1);
    expect(destination.props.ellipsizeMode).toBe('tail');
    expect(origin.props.children).toBe('TP. Hồ Chí Minh');
    expect(destination.props.children).toBe('Vũng Tàu');
    expect(originBadge.props.children).toBe('TỪ');
    expect(destinationBadge.props.children).toBe('ĐẾN');
    expect(
      renderer!.root.findAllByProps({ testID: 'parcel-header-route-arrow' }),
    ).toHaveLength(0);

    act(() => {
      routeButton.props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
