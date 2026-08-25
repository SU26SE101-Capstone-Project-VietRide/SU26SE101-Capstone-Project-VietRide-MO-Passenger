import React from 'react';
import { StyleSheet, Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

let mockIsCompact = true;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => jest.requireActual('@shared/theme').themes.liquid_light,
}));
jest.mock('@shared/hooks', () => ({
  useResponsiveLayout: () => ({ isCompact: mockIsCompact }),
  useThemedStyles: (factory: (theme: unknown) => unknown) =>
    factory(jest.requireActual('@shared/theme').themes.liquid_light),
}));
jest.mock('expo-image', () => {
  const ReactModule = require('react');
  const { View: MockImage } = require('react-native');

  return {
    Image: (props: object) => ReactModule.createElement(MockImage, props),
  };
});
jest.mock('phosphor-react-native', () => ({
  ArrowLeft: () => null,
}));

import { AuthStepHeader } from './AuthStepHeader';

describe('AuthStepHeader', () => {
  beforeEach(() => {
    mockIsCompact = true;
  });

  it('reclaims compact copy width and preserves a 44dp back target', () => {
    const onBack = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <AuthStepHeader
          title="Tạo tài khoản"
          subtitle="Đăng ký để tiếp tục hành trình của bạn"
          onBack={onBack}
        />,
      );
    });

    const root = renderer!.root.findByProps({ testID: 'auth-step-header' });
    const copy = renderer!.root.findByProps({ testID: 'auth-step-header-copy' });
    const mascot = renderer!.root.findByProps({ testID: 'auth-step-header-mascot' });
    const back = renderer!.root.findByProps({ testID: 'auth-step-header-back' });

    expect(StyleSheet.flatten(root.props.style)).toMatchObject({
      gap: 8,
      paddingHorizontal: 12,
      paddingTop: 16,
    });
    expect(StyleSheet.flatten(copy.props.style)).toMatchObject({
      flex: 1,
      minWidth: 0,
      marginLeft: 52,
    });
    expect(StyleSheet.flatten(mascot.props.style)).toMatchObject({
      width: 48,
      height: 48,
      flexShrink: 0,
    });
    expect(StyleSheet.flatten(back.props.style({ pressed: false }))).toMatchObject({
      width: 44,
      height: 44,
      left: 12,
      top: 16,
    });
    const title = renderer!.root.findAllByType(Text).find(
      (node) => node.props.children === 'Tạo tài khoản',
    );
    const subtitle = renderer!.root.findAllByType(Text).find(
      (node) => node.props.children === 'Đăng ký để tiếp tục hành trình của bạn',
    );
    expect(title?.props.textBreakStrategy).toBe('balanced');
    expect(subtitle?.props.textBreakStrategy).toBe('balanced');

    act(() => back.props.onPress());
    expect(onBack).toHaveBeenCalledTimes(1);
    act(() => renderer!.unmount());
  });

  it('keeps the established header geometry outside compact widths', () => {
    mockIsCompact = false;
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <AuthStepHeader title="Welcome back" subtitle="Sign in to continue" />,
      );
    });

    expect(StyleSheet.flatten(
      renderer!.root.findByProps({ testID: 'auth-step-header' }).props.style,
    )).toMatchObject({
      paddingHorizontal: 24,
      paddingTop: 32,
    });
    expect(StyleSheet.flatten(
      renderer!.root.findByProps({ testID: 'auth-step-header-mascot' }).props.style,
    )).toMatchObject({ width: 72, height: 72 });

    act(() => renderer!.unmount());
  });
});
