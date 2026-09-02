import React from 'react';
import { StyleSheet } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

jest.mock('@shared/hooks', () => ({
  useThemedStyles: (factory: (theme: unknown) => unknown) =>
    factory(jest.requireActual('@shared/theme').themes.liquid_light),
}));
jest.mock('@shared/motion', () => ({
  motionTokens: {
    duration: { emphasis: 320 },
    distance: { standard: 8 },
  },
  useMotion: () => ({ reduceMotion: true }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      key: string,
      params?: {
        origin?: string;
        destination?: string;
        defaultValue?: string;
      },
    ) => {
      if (key === 'booking.header.from') return 'Từ';
      if (key === 'booking.header.to') return 'Đến';
      return params?.defaultValue ?? key;
    },
  }),
}));
jest.mock('react-native-reanimated', () => {
  const { View: MockAnimatedView } = require('react-native');

  return {
    __esModule: true,
    default: { View: MockAnimatedView },
    Easing: {
      out: (value: unknown) => value,
      quad: jest.fn(),
    },
    useAnimatedStyle: (factory: () => object) => factory(),
    useSharedValue: (value: number) => ({ value }),
    withTiming: (value: number) => value,
  };
});

import { AnimatedRouteHeader } from './AnimatedRouteHeader';

describe('AnimatedRouteHeader', () => {
  it('lets localized secondary copy grow to two lines instead of clipping at 22dp and renders Từ and Đến badges with distinct styling', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <AnimatedRouteHeader
          origin="Thành phố Hồ Chí Minh"
          destination="Thành phố Đà Lạt"
          secondary="Thứ Sáu, 28 tháng 8 năm 2026 • Khởi hành 23:59"
        />,
      );
    });

    const origin = renderer!.root.findByProps({ testID: 'booking-route-origin' });
    const destination = renderer!.root.findByProps({
      testID: 'booking-route-destination',
    });
    const originBadge = renderer!.root.findByProps({
      testID: 'booking-route-origin-badge',
    });
    const destinationBadge = renderer!.root.findByProps({
      testID: 'booking-route-destination-badge',
    });
    const secondary = renderer!.root.findByProps({ testID: 'booking-route-secondary' });
    const shell = renderer!.root.findByProps({
      testID: 'booking-route-secondary-shell',
    });
    const shellStyle = StyleSheet.flatten(shell.props.style);

    expect(origin.props.numberOfLines).toBe(1);
    expect(origin.props.ellipsizeMode).toBe('tail');
    expect(StyleSheet.flatten(origin.props.style)?.textAlign).toBe('center');
    expect(destination.props.numberOfLines).toBe(1);
    expect(destination.props.ellipsizeMode).toBe('tail');
    expect(StyleSheet.flatten(destination.props.style)?.textAlign).toBe('center');
    expect(origin.props.children).toBe('Thành phố Hồ Chí Minh');
    expect(destination.props.children).toBe('Thành phố Đà Lạt');
    expect(originBadge.props.children).toBe('Từ');
    expect(destinationBadge.props.children).toBe('Đến');
    expect(
      renderer!.root.findAllByProps({ testID: 'booking-route-arrow' }),
    ).toHaveLength(0);
    expect(secondary.props.numberOfLines).toBe(2);
    expect(shellStyle).toMatchObject({
      minHeight: 22,
      minWidth: 0,
      width: '100%',
    });
    expect(shellStyle.height).toBeUndefined();
    expect(shellStyle.overflow).toBeUndefined();

    act(() => renderer!.unmount());
  });
});
