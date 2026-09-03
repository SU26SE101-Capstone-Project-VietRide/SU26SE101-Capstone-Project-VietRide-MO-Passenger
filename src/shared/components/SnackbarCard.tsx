import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Info, WarningCircle, X } from 'phosphor-react-native';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { SnackbarAction, SnackbarTone } from '@shared/store/useSnackbarStore';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';

interface SnackbarCardProps {
  message: string;
  tone?: SnackbarTone;
  action?: SnackbarAction;
  onAction?: () => void;
  onDismiss: () => void;
}

const getTonePresentation = (theme: AppTheme, tone: SnackbarTone) => {
  switch (tone) {
    case 'success':
      return { icon: CheckCircle, color: theme.colors.success };
    case 'warning':
      return { icon: WarningCircle, color: theme.colors.warningForeground };
    case 'error':
      return { icon: WarningCircle, color: theme.colors.error };
    default:
      return { icon: Info, color: theme.colors.primary };
  }
};

export function SnackbarCard({
  message,
  tone = 'neutral',
  action,
  onAction,
  onDismiss,
}: SnackbarCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const presentation = useMemo(
    () => getTonePresentation(theme, tone),
    [theme, tone],
  );
  const Icon = presentation.icon;

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.container,
        { borderLeftColor: presentation.color },
      ]}
    >
      <Icon size={21} color={presentation.color} weight="fill" />
      <Text style={styles.message}>{message}</Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction ?? action.onPress}
          style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}
        >
          <Text style={[styles.actionText, { color: presentation.color }]}>
            {action.label}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.dismiss')}
        onPress={onDismiss}
        style={({ pressed }) => [styles.dismiss, pressed ? styles.pressed : null]}
      >
        <X size={18} color={theme.colors.textSecondary} weight="bold" />
      </Pressable>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    minHeight: 56,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: theme.effects.contentBorderStrong,
    backgroundColor: theme.effects.contentSurfaceElevated,
    ...theme.effects.floatingShadow,
  },
  message: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: theme.colors.textPrimary,
  },
  action: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.xs,
  },
  actionText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
  },
  dismiss: {
    width: 44,
    height: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: borderRadius.full,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
});
