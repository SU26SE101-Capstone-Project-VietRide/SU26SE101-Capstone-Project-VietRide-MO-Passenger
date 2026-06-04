/**
 * TimerPill — Live countdown pill shown in booking headers
 *
 * Displays a ticking "MM:SS" timer inside a tinted rounded pill.
 * Used on Checkout and Payment screens to indicate booking hold
 * expiry. Drives itself via an internal interval so the parent
 * only needs to supply the starting seconds.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';

interface TimerPillProps {
  /** Starting seconds countdown (default: 599 = 9:59) */
  initialSeconds?: number;
}

export const TimerPill = ({ initialSeconds = 599 }: TimerPillProps): React.JSX.Element => {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');

  return (
    <View style={styles.pill}>
      <Text style={styles.icon}>⏱️</Text>
      <Text style={styles.text}>{m}:{s}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    gap: spacing.xs,
  },
  icon: {
    fontSize: 12,
  },
  text: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.error,
  },
});
