import React, { type ReactNode } from 'react';
import { View, Text, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

interface GlassCarouselSectionProps {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function GlassCarouselSection({
  title,
  actionLabel,
  onActionPress,
  children,
  style,
  contentStyle,
}: GlassCarouselSectionProps): React.JSX.Element {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.section, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {actionLabel && onActionPress ? (
          <Pressable
            onPress={onActionPress}
            hitSlop={8}
            style={({ pressed }) => [styles.actionButton, pressed ? styles.pressed : null]}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  section: {
    position: 'relative',
    borderRadius: 28,
    borderWidth: theme.effects.isLiquid ? 1 : 0,
    borderColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : 'transparent',
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : 'transparent',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    overflow: 'visible',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.effects.isLiquid ? spacing.md : 0,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.textPrimary,
  },
  actionButton: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  actionText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  content: {
    overflow: 'visible',
  },
  pressed: {
    opacity: 0.72,
  },
});
