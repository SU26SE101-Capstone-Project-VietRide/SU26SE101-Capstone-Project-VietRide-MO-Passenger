import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { AppLaunchScreen } from './AppLaunchScreen';

describe('AppLaunchScreen', () => {
  it('renders the shared VietRide logo and an accessible progress state', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AppLaunchScreen message="Đang khôi phục phiên đăng nhập..." />,
      );
    });

    const logo = renderer!.root.findByProps({ accessibilityLabel: 'VietRide logo' });
    expect(logo.props.defaultSource).toBe(logo.props.source);
    expect(logo.props.fadeDuration).toBe(0);
    expect(renderer!.root.findByProps({ accessibilityRole: 'progressbar' })).toBeTruthy();
    expect(renderer!.root.findByProps({
      children: 'Đang khôi phục phiên đăng nhập...',
    })).toBeTruthy();

    ReactTestRenderer.act(() => renderer!.unmount());
  });
});
