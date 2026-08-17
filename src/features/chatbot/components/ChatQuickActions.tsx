import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CurrencyCircleDollar,
  ShieldCheck,
} from 'phosphor-react-native';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';

interface ChatQuickActionsProps {
  disabled: boolean;
  onSelectPrompt: (prompt: string) => void;
}

interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  Icon: React.ComponentType<{
    size: number;
    color: string;
    weight?: 'regular' | 'fill' | 'bold';
  }>;
}

const ChatQuickActionChip = memo(function ChatQuickActionChip({
  disabled,
  label,
  prompt,
  Icon,
  onSelectPrompt,
}: {
  disabled: boolean;
  label: string;
  prompt: string;
  Icon: QuickAction['Icon'];
  onSelectPrompt: (prompt: string) => void;
}): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handlePress = useCallback(() => {
    onSelectPrompt(prompt);
  }, [onSelectPrompt, prompt]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.chip,
        disabled ? styles.chipDisabled : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Icon size={16} color={theme.colors.primary} weight="bold" />
      <Text style={styles.chipLabel}>{label}</Text>
    </Pressable>
  );
});

export const ChatQuickActions = memo(function ChatQuickActions({
  disabled,
  onSelectPrompt,
}: ChatQuickActionsProps): React.JSX.Element {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const actions = useMemo<readonly QuickAction[]>(() => [
    {
      id: 'policy',
      label: t('chatbot.quickActions.refund'),
      prompt: t('chatbot.prompts.refund'),
      Icon: ShieldCheck,
    },
    {
      id: 'ticketRefund',
      label: t('chatbot.quickActions.ticketRefund'),
      prompt: t('chatbot.prompts.ticketRefund'),
      Icon: CurrencyCircleDollar,
    },
  ], [t]);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {actions.map((action) => (
          <ChatQuickActionChip
            key={action.id}
            disabled={disabled}
            label={action.label}
            prompt={action.prompt}
            Icon={action.Icon}
            onSelectPrompt={onSelectPrompt}
          />
        ))}
      </View>
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  container: {
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  chip: {
    minHeight: 44,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.effects.glassSurface,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
});
