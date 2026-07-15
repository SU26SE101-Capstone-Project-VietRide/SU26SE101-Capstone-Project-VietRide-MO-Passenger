import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';

interface AuthFooterProps {
  readonly prompt: string;
  readonly actionLabel: string;
  readonly onAction: () => void;
}

/**
 * Shared auth footer that wraps safely on narrow screens and with large text.
 * Keeping the prompt and action as separate nodes preserves button semantics.
 */
export const AuthFooter = memo(function AuthFooterComponent({
  prompt,
  actionLabel,
  onAction,
}: AuthFooterProps): React.JSX.Element {
  const theme = useTheme();

  return (
    <View testID="auth-footer" style={styles.root}>
      <Text style={[styles.prompt, { color: theme.colors.textSecondary }]}>
        {prompt}
      </Text>
      <Pressable
        accessibilityLabel={actionLabel}
        accessibilityRole="button"
        hitSlop={spacing.sm}
        onPress={onAction}
        style={({ pressed }) => (pressed ? styles.pressed : null)}
      >
        <Text style={[styles.action, { color: theme.colors.primary }]}>
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    columnGap: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    rowGap: spacing.xs,
  },
  prompt: {
    flexShrink: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    minWidth: 0,
    textAlign: 'center',
  },
  action: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
  },
  pressed: {
    opacity: 0.75,
  },
});
