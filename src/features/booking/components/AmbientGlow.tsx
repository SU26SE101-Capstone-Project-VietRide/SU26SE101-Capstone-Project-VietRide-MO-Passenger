/**
 * AmbientGlow — Decorative mint-green radial background
 *
 * Used across all booking screens for visual depth.
 * Extracted to avoid duplicating the absolute-positioned
 * large blurred circle in every screen.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@shared/theme';

interface AmbientGlowProps {
  /** Vertical offset from top edge (default: -176) */
  top?: number;
  /** Horizontal offset from left edge (default: -97) */
  left?: number;
  /** Glow circle diameter (default: 585) */
  size?: number;
  /** Mint tint opacity (default: 0.12) */
  opacity?: number;
  /** Z-index layer (default: 0) */
  zIndex?: number;
}

export const AmbientGlow = ({
  top = -176,
  left = -97,
  size = 585,
  opacity = 0.12,
  zIndex = 0,
}: AmbientGlowProps): React.JSX.Element => {
  return (
    <View
      style={[
        styles.glow,
        { top, left, width: size, height: size, opacity, zIndex } as any,
      ]}
      pointerEvents="none"
    />
  );
};

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    backgroundColor: colors.primaryLight,
    borderRadius: 9999,
  },
});
