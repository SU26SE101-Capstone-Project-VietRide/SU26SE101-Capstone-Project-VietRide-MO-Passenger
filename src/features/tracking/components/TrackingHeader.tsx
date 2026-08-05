import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ArrowLeft, ArrowRight } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';

export interface TrackingHeaderRoute {
  destinationName?: string;
  originName?: string;
}

interface TrackingHeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  route?: TrackingHeaderRoute;
}

export const TrackingHeader = React.memo(function TrackingHeaderComponent({
  title,
  subtitle,
  onBack,
  route,
}: TrackingHeaderProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.header}>
      <View style={styles.headerTopRow}>
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

      {route?.originName || route?.destinationName ? (
        <View style={styles.routeSummary} accessibilityRole="summary">
          <View style={styles.routeEndpoint}>
            <Text style={styles.routeLabel} numberOfLines={1}>
              {t('tracking.boardingPoint')}
            </Text>
            <Text style={styles.routeName} numberOfLines={1}>
              {route.originName ?? t('common.notAvailable')}
            </Text>
          </View>
          <ArrowRight
            size={16}
            color={theme.colors.textTertiary}
            weight="bold"
          />
          <View style={styles.routeEndpoint}>
            <Text style={styles.routeLabel} numberOfLines={1}>
              {t('tracking.dropOff')}
            </Text>
            <Text style={styles.routeName} numberOfLines={1}>
              {route.destinationName ?? t('common.notAvailable')}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.isLiquid
      ? theme.effects.contentBorderStrong
      : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceElevated
      : theme.colors.surface,
  },
  headerTopRow: {
    minHeight: 48,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
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
  routeSummary: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  routeEndpoint: {
    flex: 1,
    minWidth: 0,
  },
  routeLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: theme.colors.textTertiary,
  },
  routeName: {
    marginTop: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
});
