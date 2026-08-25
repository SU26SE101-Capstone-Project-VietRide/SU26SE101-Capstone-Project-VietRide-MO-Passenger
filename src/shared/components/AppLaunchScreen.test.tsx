import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { AppLaunchScreen } from './AppLaunchScreen';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'app.loadingLabel': 'VietRide is loading',
      'app.logoLabel': 'VietRide logo',
      'app.tagline': 'Your journey, connected',
      'app.preparing': 'Preparing VietRide',
    }[key] ?? key),
  }),
}));

describe('AppLaunchScreen', () => {
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

    ReactTestRenderer.act(() => renderer!.unmount());
  });
});
