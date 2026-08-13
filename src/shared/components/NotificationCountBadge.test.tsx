import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import {
  getNotificationBadgePresentation,
  NotificationCountBadge,
} from './NotificationCountBadge';

describe('NotificationCountBadge', () => {
  it.each([
    [9, '9', 18],
    [10, '10', 24],
    [99, '99', 24],
    [100, '99+', 30],
  ])('keeps count %i on one line with enough width', (count, label, minWidth) => {
    expect(getNotificationBadgePresentation(count)).toEqual({
      count,
      label,
      minWidth,
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <NotificationCountBadge
          backgroundColor="#D32F2F"
          borderColor="#FFFFFF"
          count={count}
        />,
      );
    });

    const badge = renderer!.root.findByType(View);
    const text = renderer!.root.findByType(Text);
    expect(StyleSheet.flatten(badge.props.style)).toMatchObject({
      height: 18,
      minWidth,
    });
    expect(text.props.allowFontScaling).toBe(false);
    expect(text.props.numberOfLines).toBe(1);
    expect(text.props.children).toBe(label);

    ReactTestRenderer.act(() => renderer!.unmount());
  });

  it('does not render a badge without unread notifications', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <NotificationCountBadge
          backgroundColor="#D32F2F"
          borderColor="#FFFFFF"
          count={0}
        />,
      );
    });

    expect(renderer!.toJSON()).toBeNull();
    ReactTestRenderer.act(() => renderer!.unmount());
  });
});
