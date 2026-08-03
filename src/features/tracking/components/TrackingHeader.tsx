import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ArrowLeft } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';

interface TrackingHeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
}

export const TrackingHeader = React.memo(function TrackingHeaderComponent({
  title,
  subtitle,
  onBack,
}: TrackingHeaderProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        hitSlop={6}
        onPress={onBack}
        style={({ pressed }) => [
          styles.backButton,
          pressed ? styles.pressed : null,
        ]}
      >
        <ArrowLeft size={23} color={theme.colors.textPrimary} />
      </Pressable>

      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <View style={styles.trailingSpacer} />
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  header: {
    minHeight: 64,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.isLiquid
      ? theme.effects.contentBorderStrong
      : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceElevated
      : theme.colors.surface,
  },
  backButton: {
    ...theme.components.headerButton,
    width: 48,
    height: 48,
  },
  titleContainer: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center' as const,
    gap: 2,
  },
  title: {
    maxWidth: '100%' as const,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    maxWidth: '100%' as const,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  trailingSpacer: {
    width: 48,
    height: 48,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
});
