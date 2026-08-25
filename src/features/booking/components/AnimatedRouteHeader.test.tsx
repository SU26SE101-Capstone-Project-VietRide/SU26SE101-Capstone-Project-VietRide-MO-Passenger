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
  it('lets localized secondary copy grow to two lines instead of clipping at 22dp', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <AnimatedRouteHeader
          primary="Thành phố Hồ Chí Minh → Thành phố Đà Lạt"
          secondary="Thứ Sáu, 28 tháng 8 năm 2026 • Khởi hành 23:59"
        />,
      );
    });

    const primary = renderer!.root.findByProps({ testID: 'booking-route-primary' });
    const secondary = renderer!.root.findByProps({ testID: 'booking-route-secondary' });
    const shell = renderer!.root.findByProps({
      testID: 'booking-route-secondary-shell',
    });
    const shellStyle = StyleSheet.flatten(shell.props.style);

    expect(primary.props.numberOfLines).toBe(2);
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