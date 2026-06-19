/**
 * LoadingOverlay — Full-screen loading indicator
 *
 * Used for global loading states (e.g., initial auth check, heavy operations).
 * Blocks user interaction while visible.
 */

import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export function LoadingOverlay({
  visible,
  message,
}: LoadingOverlayProps): React.JSX.Element | null {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

const createStyles = (theme: AppTheme) => ({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.effects.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  content: {
    ...theme.components.elevatedCard,
    borderRadius: 16,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xxxl,
    alignItems: 'center',
    minWidth: 140,
  },
  message: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
