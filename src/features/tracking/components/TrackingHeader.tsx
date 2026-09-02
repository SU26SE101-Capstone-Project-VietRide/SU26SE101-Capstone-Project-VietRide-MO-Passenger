import React, { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { ArrowLeft } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import { fontFamilies, fontSizes, spacing, type AppTheme } from '@shared/theme';

export interface TrackingHeaderRoute {
  destinationName?: string;
  originName?: string;
}

export interface TrackingHeaderAction {
  key: string;
  accessibilityLabel: string;
  accessibilityHint?: string;
  busy?: boolean;
  disabled?: boolean;
  tone?: 'default' | 'destructive';
  icon: ReactNode;
  onPress: () => void;
}

interface TrackingHeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  actions?: readonly TrackingHeaderAction[];
  route?: TrackingHeaderRoute;
}

export const TrackingHeader = React.memo(function TrackingHeaderComponent({
  actions,
  title,
  subtitle,
  onBack,
  route,
}: TrackingHeaderProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const visibleActions = actions?.slice(0, 2) ?? [];

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

        {visibleActions.length > 0 ? (
          <View style={styles.actions} testID="tracking-header-actions">
            {visibleActions.map(action => {
              const disabled = Boolean(action.disabled || action.busy);
              return (
                <Pressable
                  key={action.key}
                  accessibilityHint={action.accessibilityHint}
                  accessibilityLabel={action.accessibilityLabel}
                  accessibilityRole="button"
                  accessibilityState={{
                    busy: Boolean(action.busy),
                    disabled,
                  }}
                  disabled={disabled}
                  hitSlop={4}
                  onPress={action.onPress}
                  style={({ pressed }) => [
                    styles.actionButton,
                    action.tone === 'destructive'
                      ? styles.actionDestructive
                      : null,
                    disabled ? styles.actionDisabled : null,
                    pressed && !disabled ? styles.pressed : null,
                  ]}
                  testID={`tracking-header-action-${action.key}`}
                >
                  {action.busy ? (
                    <ActivityIndicator
                      color={
                        action.tone === 'destructive'
                          ? theme.colors.error
                          : theme.colors.primary
                      }
                      size="small"
                    />
                  ) : (
                    action.icon
                  )}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View
            style={styles.trailingSpacer}
            testID="tracking-header-trailing-spacer"
          />
        )}
      </View>

      {route?.originName || route?.destinationName ? (
        <View style={styles.routeSummary} accessibilityRole="summary">
          <Text
            testID="tracking-header-route-origin"
            style={styles.routeName}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {route.originName ?? t('common.notAvailable')}
          </Text>
          <Text
            testID="tracking-header-route-arrow"
            style={styles.routeArrow}
            accessible={false}
          >
            →
          </Text>
          <Text
            testID="tracking-header-route-destination"
            style={styles.routeName}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {route.destinationName ?? t('common.notAvailable')}
          </Text>
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
  actions: {
    flexShrink: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  actionButton: {
    ...theme.components.headerButton,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderCurve: 'continuous' as const,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  actionDestructive: {
    borderWidth: 1,
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorLight,
  },
  routeSummary: {
    gap: 0,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  routeArrow: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs - 2,
    lineHeight: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  routeName: {
    width: '100%' as const,
    minWidth: 0,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
});
