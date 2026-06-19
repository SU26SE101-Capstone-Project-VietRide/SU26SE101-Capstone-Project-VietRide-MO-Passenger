/**
 * SectionCard — Bento-box card container per DESIGN.md
 *
 * White surface, 24px squircle radius, soft tonal shadow.
 * Used as the primary grouping primitive across booking screens.
 */

import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';

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
  const theme = useTheme();

  return (
    <View style={[theme.components.card, styles.card, style]} testID={testID}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: spacing.xxl,
    marginBottom: spacing.lg,
  },
});
