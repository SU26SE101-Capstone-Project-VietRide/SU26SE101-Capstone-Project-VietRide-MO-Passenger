/**
 * SectionCard — Bento-box card container per DESIGN.md
 *
 * White surface, 24px squircle radius, soft tonal shadow.
 * Used as the primary grouping primitive across booking screens.
 */

import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '@shared/theme';

interface SectionCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

export const SectionCard = memo(function SectionCard({
  children,
  style,
  testID,
}: SectionCardProps): React.JSX.Element {
  return (
    <View style={[styles.card, style]} testID={testID}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
});
