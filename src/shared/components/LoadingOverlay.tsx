/**
 * LoadingOverlay — Full-screen loading indicator
 *
 * Used for global loading states (e.g., initial auth check, heavy operations).
 * Blocks user interaction while visible.
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

import { colors, fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export function LoadingOverlay({
  visible,
  message,
}: LoadingOverlayProps): React.JSX.Element | null {
  const theme = useTheme();

  if (!visible) {
    return null;
  }

  const isLiquid = theme.variant.startsWith('liquid');

  return (
    <View style={[styles.overlay, { backgroundColor: isLiquid ? theme.glassOverlay : colors.overlay }]}>
      <View style={[
        styles.content, 
        isLiquid && { 
          backgroundColor: theme.surfaceStyle.backgroundColor,
          borderColor: theme.surfaceStyle.borderColor,
          borderWidth: 1,
        }
      ]}>
        <ActivityIndicator size="large" color={colors.primary} />
        {message && <Text style={[styles.message, isLiquid && { color: theme.isDark ? '#FFF' : '#181C20' }]}>{message}</Text>}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  content: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xxxl,
    alignItems: 'center',
    minWidth: 140,
  },
  message: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
