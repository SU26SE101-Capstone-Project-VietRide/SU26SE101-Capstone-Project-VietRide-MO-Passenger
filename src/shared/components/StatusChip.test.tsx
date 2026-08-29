import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import { StatusChip } from './StatusChip';

describe('StatusChip', () => {
  it('keeps the full accessible label and allows two visual lines by default', () => {
    const label = 'Đang chờ nhà xe xác nhận thanh toán';
    let renderer: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<StatusChip label={label} tone="warning" />);
    });

    const chip = renderer!.root.findByType(View);
    const text = renderer!.root.findByType(Text);
    expect(text.props.numberOfLines).toBe(2);
    expect(text.props.accessibilityLabel).toBe(label);
    expect(StyleSheet.flatten(chip.props.style)).toMatchObject({
      minWidth: 0,
      flexShrink: 1,
    });
    expect(StyleSheet.flatten(text.props.style)).toMatchObject({
      flexShrink: 1,
      textAlign: 'center',
    });

    ReactTestRenderer.act(() => renderer!.unmount());
  });

  it('supports an explicit compact one-line override', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <StatusChip label="Đã hủy" numberOfLines={1} />,
      );
    });

    expect(renderer!.root.findByType(Text).props.numberOfLines).toBe(1);
    ReactTestRenderer.act(() => renderer!.unmount());
  });
});
