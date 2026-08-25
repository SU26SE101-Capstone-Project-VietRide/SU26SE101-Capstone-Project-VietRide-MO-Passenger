import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import { themes } from '@shared/theme/themes';
import { AppLaunchScreen } from './AppLaunchScreen';

const mockUseResponsiveLayout = jest.fn();
const mockUseSafeAreaInsets = jest.fn();
const mockUseTheme = jest.fn();
let mockLocale: 'en' | 'vi' = 'en';
const mockTranslations = {
  en: {
    'app.loadingLabel': 'VietRide is loading',
    'app.logoLabel': 'VietRide logo',
    'app.tagline': 'Your journey, connected',
    'app.preparing': 'Preparing VietRide',
  },
  vi: {
    'app.loadingLabel': 'Màn hình đang tải VietRide',
    'app.logoLabel': 'Biểu trưng VietRide',
    'app.tagline': 'Đi lại dễ dàng, an tâm mỗi chuyến',
    'app.preparing': 'Đang chuẩn bị VietRide...',
  },
} as const;

jest.mock('@shared/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => mockUseResponsiveLayout(),
}));

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockUseTheme(),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
      ReactModule.createElement(View, props, children),
    useSafeAreaInsets: () => mockUseSafeAreaInsets(),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (
      mockTranslations[mockLocale][key as keyof typeof mockTranslations.en] ?? key
    ),
  }),
}));

describe('AppLaunchScreen', () => {
  beforeEach(() => {
    mockLocale = 'en';
    mockUseTheme.mockReturnValue(themes.liquid_light);
    mockUseResponsiveLayout.mockReturnValue({
      width: 390,
      height: 844,
      fontScale: 1,
    });
    mockUseSafeAreaInsets.mockReturnValue({
      top: 47,
      right: 0,
      bottom: 34,
      left: 0,
    });
  });

  it('renders the shared VietRide logo and an accessible progress state', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AppLaunchScreen message="Đang khôi phục phiên đăng nhập..." />,
      );
    });

    const logo = renderer!.root.findByProps({ accessibilityLabel: 'VietRide logo' });
    expect(logo.props.source).toBeTruthy();
    expect(logo.props.contentFit).toBe('contain');
    expect(logo.props.transition).toBe(0);
    expect(renderer!.root.findByProps({ accessibilityRole: 'progressbar' })).toBeTruthy();
    expect(renderer!.root.findByProps({
      children: 'Đang khôi phục phiên đăng nhập...',
    })).toBeTruthy();

    const scroll = renderer!.root.findByProps({ testID: 'app-launch-scroll' });
    expect(scroll.props.bounces).toBe(false);
    expect(scroll.props.showsVerticalScrollIndicator).toBe(false);

    const tagline = renderer!.root.findByProps({ testID: 'app-launch-tagline' });
    const message = renderer!.root.findByProps({ testID: 'app-launch-message' });
    expect(tagline.props.numberOfLines).toBeUndefined();
    expect(tagline.props.maxFontSizeMultiplier).toBeUndefined();
    expect(message.props.numberOfLines).toBeUndefined();
    expect(message.props.maxFontSizeMultiplier).toBeUndefined();
    expect(message.props.accessibilityLiveRegion).toBe('polite');
    expect(renderer!.root.findByType(StatusBar).props).toMatchObject({
      barStyle: 'dark-content',
      backgroundColor: themes.liquid_light.colors.background,
    });

    ReactTestRenderer.act(() => renderer!.unmount());
  });

  it('shrinks the logo and stacks progress on a short compact large-text screen', () => {
    mockLocale = 'vi';
    mockUseResponsiveLayout.mockReturnValue({
      width: 320,
      height: 480,
      fontScale: 2,
    });
    mockUseSafeAreaInsets.mockReturnValue({
      top: 24,
      right: 0,
      bottom: 16,
      left: 0,
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    const completeMessage = 'Đang khôi phục toàn bộ phiên đăng nhập VietRide...';
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AppLaunchScreen message={completeMessage} />,
      );
    });

    const logoFrame = renderer!.root.findByProps({
      testID: 'app-launch-logo-frame',
    });
    const progress = renderer!.root.findByProps({
      testID: 'app-launch-progress',
    });
    const scroll = renderer!.root.findByProps({ testID: 'app-launch-scroll' });

    expect(StyleSheet.flatten(logoFrame.props.style)).toMatchObject({
      width: 120,
      height: 120,
    });
    expect(StyleSheet.flatten(progress.props.style).flexDirection).toBe('column');
    expect(StyleSheet.flatten(scroll.props.contentContainerStyle)).toMatchObject({
      flexGrow: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
    });
    expect(renderer!.root.findByProps({
      children: mockTranslations.vi['app.tagline'],
    }).props.numberOfLines).toBeUndefined();
    expect(renderer!.root.findByProps({
      children: completeMessage,
    }).props.numberOfLines).toBeUndefined();

    ReactTestRenderer.act(() => renderer!.unmount());
  });

  it('keeps full copy centered and themed on a large dark tablet viewport', () => {
    mockUseTheme.mockReturnValue(themes.liquid_dark);
    mockUseResponsiveLayout.mockReturnValue({
      width: 768,
      height: 1024,
      fontScale: 1,
    });
    mockUseSafeAreaInsets.mockReturnValue({
      top: 24,
      right: 0,
      bottom: 20,
      left: 0,
    });

    const completeMessage = 'Restoring the complete VietRide session';
    let renderer: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AppLaunchScreen message={completeMessage} />,
      );
    });

    const logoFrame = renderer!.root.findByProps({
      testID: 'app-launch-logo-frame',
    });
    const progress = renderer!.root.findByProps({
      testID: 'app-launch-progress',
    });
    const tagline = renderer!.root.findByProps({
      children: mockTranslations.en['app.tagline'],
    });
    const message = renderer!.root.findByProps({ children: completeMessage });

    expect(StyleSheet.flatten(logoFrame.props.style)).toMatchObject({
      width: 184,
      height: 184,
    });
    expect(StyleSheet.flatten(progress.props.style).flexDirection).toBe('row');
    expect(tagline.props.numberOfLines).toBeUndefined();
    expect(message.props.numberOfLines).toBeUndefined();
    expect(renderer!.root.findByType(StatusBar).props).toMatchObject({
      barStyle: 'light-content',
      backgroundColor: themes.liquid_dark.colors.background,
    });

    ReactTestRenderer.act(() => renderer!.unmount());
  });
});
