import React from 'react';
import { StyleSheet } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

jest.mock('expo-image', () => {
  const ReactModule = require('react');
  const { View: NativeView } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) => (
      ReactModule.createElement(NativeView, props)
    ),
  };
});

import { VnPayLogo } from './VnPayLogo';

describe('VnPayLogo', () => {
  it.each([
    ['default', 30],
    ['compact', 20],
  ] as const)('renders the bundled logo at %s size', (size, pixels) => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    act(() => {
      renderer = ReactTestRenderer.create(<VnPayLogo size={size} />);
    });

    const logo = renderer!.root.findByProps({ testID: 'vnpay-logo' });
    expect(StyleSheet.flatten(logo.props.style)).toMatchObject({
      width: pixels,
      height: pixels,
      flexShrink: 0,
    });
    expect(logo.props.contentFit).toBe('contain');
    expect(logo.props.accessible).toBe(false);

    act(() => renderer?.unmount());
  });
});
