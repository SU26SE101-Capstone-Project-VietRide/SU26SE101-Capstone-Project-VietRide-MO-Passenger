import React from 'react';
import { StyleSheet } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthFooter } from './AuthFooter';

const mockTheme = {
  colors: {
    primary: '#087f5b',
    textSecondary: '#555',
  },
};

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

describe('AuthFooter', () => {
  it('keeps the footer wrappable and the prompt shrinkable for narrow screens', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <AuthFooter
          prompt="Don't have an account?"
          actionLabel="Sign up"
          onAction={jest.fn()}
        />,
      );
    });

    const footerStyle = StyleSheet.flatten(
      renderer!.root.findByProps({ testID: 'auth-footer' }).props.style,
    );
    const promptStyle = StyleSheet.flatten(
      renderer!.root.findByProps({ children: "Don't have an account?" }).props.style,
    );

    expect(footerStyle).toMatchObject({
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
    });
    expect(promptStyle).toMatchObject({
      flexShrink: 1,
      minWidth: 0,
      textAlign: 'center',
    });

    await act(async () => renderer!.unmount());
  });

  it('exposes a semantic button and forwards the action once', async () => {
    const onAction = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <AuthFooter
          prompt="Already have an account?"
          actionLabel="Log in"
          onAction={onAction}
        />,
      );
    });

    const action = renderer!.root.findByProps({
      accessibilityLabel: 'Log in',
      accessibilityRole: 'button',
    });

    act(() => action.props.onPress());
    expect(onAction).toHaveBeenCalledTimes(1);

    await act(async () => renderer!.unmount());
  });
});
