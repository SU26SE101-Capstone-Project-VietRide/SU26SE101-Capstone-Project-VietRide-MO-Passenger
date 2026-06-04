/**
 * ScreenHeader — Reusable screen chrome for booking flow screens
 *
 * Composes AmbientGlow + AppHeader + optional TimerPill into a single
 * drop-in component so every booking screen has consistent top chrome.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AmbientGlow } from './AmbientGlow';
import { AppHeader } from './AppHeader';
import { TimerPill } from './TimerPill';
import { spacing } from '@shared/theme';

interface ScreenHeaderProps {
  /** Simple centered title (ignored if centerElement is provided) */
  title?: string;
  /** Custom centered content — overrides title */
  centerElement?: React.ReactNode;
  /** Back button callback (no button rendered if omitted) */
  onBackPress?: () => void;
  /** Optional right-side slot (filter button, share action, etc.) */
  rightElement?: React.ReactNode;
  /** Show countdown timer pill (default: false) */
  showTimer?: boolean;
  /** Starting seconds for countdown (default: 599 = 9:59) */
  timerInitialSeconds?: number;
  /** Ambient glow vertical offset (default: -176) */
  glowTop?: number;
  /** Ambient glow horizontal offset (default: -97) */
  glowLeft?: number;
}

export const ScreenHeader = ({
  title,
  centerElement,
  onBackPress,
  rightElement,
  showTimer = false,
  timerInitialSeconds = 599,
  glowTop = -176,
  glowLeft = -97,
}: ScreenHeaderProps): React.JSX.Element => {
  const timerSlot = showTimer ? <TimerPill initialSeconds={timerInitialSeconds} /> : undefined;

  return (
    <View style={styles.root}>
      <AmbientGlow top={glowTop} left={glowLeft} />
      <AppHeader
        title={title}
        centerElement={centerElement}
        onBackPress={onBackPress}
        rightElement={timerSlot ?? rightElement}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    zIndex: 10,
  },
});
