import React from 'react';
import { Platform, ScrollView } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import { spacing } from '@shared/theme';
import { AppKeyboardAwareScrollView } from './AppKeyboardAwareScrollView';

describe('AppKeyboardAwareScrollView', () => {
  it('keeps focused fields visible without applying keyboard insets twice', () => {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <AppKeyboardAwareScrollView>
          <></>
        </AppKeyboardAwareScrollView>,
      );
    });

    const scrollView = renderer!.root.findByType(ScrollView);

    expect(scrollView.props.automaticallyAdjustKeyboardInsets).toBe(false);
    expect(scrollView.props.bottomOffset).toBe(spacing.xxl);
    expect(scrollView.props.keyboardShouldPersistTaps).toBe('handled');
    expect(scrollView.props.keyboardDismissMode).toBe(
      Platform.OS === 'ios' ? 'interactive' : 'on-drag',
    );
  });

  it('preserves screen-specific keyboard overrides', () => {
    let renderer: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <AppKeyboardAwareScrollView
          bottomOffset={48}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
        />,
      );
    });

    const scrollView = renderer!.root.findByType(ScrollView);

    expect(scrollView.props.bottomOffset).toBe(48);
    expect(scrollView.props.keyboardDismissMode).toBe('none');
    expect(scrollView.props.keyboardShouldPersistTaps).toBe('always');
  });
});
